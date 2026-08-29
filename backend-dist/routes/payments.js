import { Router, } from 'express';
import crypto from 'crypto';
import nodeFetch from 'node-fetch';
import { adminAuth, adminDb, } from '../firebaseAdmin.js';
const router = Router();
const PESEPAY_MAKE_PAYMENT_URL = 'https://api.pesepay.com/api/payments-engine/v2/payments/make-payment';
const PESEPAY_INITIATE_URL = 'https://api.pesepay.com/api/payments-engine/v1/payments/initiate';
const PESEPAY_METHODS_URL = 'https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency';
const PESEPAY_STATUS_URL = 'https://api.pesepay.com/api/payments-engine/v1/payments/check-payment';
/*
 * ----------------------------------------------------------
 * AUTHENTICATION
 * ----------------------------------------------------------
 */
const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }
        const token = header.slice(7);
        const decoded = await adminAuth.verifyIdToken(token);
        const profile = await adminDb
            .collection('users')
            .doc(decoded.uid)
            .get();
        const profileData = profile.exists
            ? profile.data()
            : undefined;
        req.runtimeUser = {
            uid: decoded.uid,
            email: decoded.email || '',
            name: String(profileData?.name ||
                decoded.name ||
                decoded.email ||
                'Runtime customer'),
            role: String(profileData?.role ||
                'customer'),
        };
        next();
    }
    catch (error) {
        console.error('Payment authentication failed:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};
/*
 * ----------------------------------------------------------
 * PESEPAY CREDENTIALS
 * ----------------------------------------------------------
 */
const getPesePayCredentials = () => {
    const integrationKey = process.env.PESEPAY_INTEGRATION_KEY
        ?.trim();
    const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY
        ?.trim();
    if (!integrationKey ||
        !encryptionKey) {
        throw new Error('PesePay credentials are not configured.');
    }
    if (Buffer.byteLength(encryptionKey, 'utf8') !== 32) {
        throw new Error('PesePay encryption key must be exactly 32 UTF-8 bytes.');
    }
    return {
        integrationKey,
        encryptionKey,
    };
};
/*
 * ----------------------------------------------------------
 * PESEPAY ENCRYPTION
 * ----------------------------------------------------------
 */
const encryptPayload = (payload, encryptionKey) => {
    const key = Buffer.from(encryptionKey, 'utf8');
    const iv = Buffer.from(encryptionKey.substring(0, 16), 'utf8');
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
    encrypted +=
        cipher.final('base64');
    return encrypted;
};
const decryptPayload = (encryptedPayload, encryptionKey) => {
    const key = Buffer.from(encryptionKey, 'utf8');
    const iv = Buffer.from(encryptionKey.substring(0, 16), 'utf8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedPayload, 'base64', 'utf8');
    decrypted +=
        decipher.final('utf8');
    if (!decrypted) {
        throw new Error('PesePay returned an empty encrypted response.');
    }
    return JSON.parse(decrypted);
};
const fetchPesePayStatus = async (referenceNumber) => {
    const { integrationKey, encryptionKey, } = getPesePayCredentials();
    const url = `${PESEPAY_STATUS_URL}?referenceNumber=${encodeURIComponent(referenceNumber)}`;
    const response = await nodeFetch(url, {
        method: 'GET',
        headers: {
            authorization: integrationKey,
            Accept: 'application/json',
        },
        insecureHTTPParser: true,
    });
    let responseBody;
    try {
        responseBody =
            await response.json();
    }
    catch {
        responseBody = null;
    }
    if (!response.ok) {
        console.error('PesePay status check failed:', response.status, responseBody);
        throw new Error(`PesePay status check failed with HTTP ${response.status}.`);
    }
    if (!responseBody ||
        typeof responseBody.payload !==
            'string' ||
        !responseBody.payload) {
        throw new Error('PesePay returned an invalid status response.');
    }
    return decryptPayload(responseBody.payload, encryptionKey);
};
/*
 * ----------------------------------------------------------
 * HELPERS
 * ----------------------------------------------------------
 */
const markInitiationFailed = async (paymentId, orderId, previousOrderStatus, reason) => {
    const now = new Date().toISOString();
    await adminDb.runTransaction(async (transaction) => {
        const paymentRef = adminDb
            .collection('payments')
            .doc(paymentId);
        const orderRef = adminDb
            .collection('orders')
            .doc(orderId);
        const orderSnapshot = await transaction.get(orderRef);
        transaction.set(paymentRef, {
            status: 'failed',
            rejection_reason: reason,
            updated_at: now,
        }, { merge: true });
        if (orderSnapshot.exists &&
            orderSnapshot.data()?.status ===
                'payment_pending') {
            transaction.update(orderRef, {
                status: previousOrderStatus,
                updated_at: now,
            });
        }
    });
};
const normalisePesePayMethod = (value) => {
    const code = String(value?.paymentMethodCode ??
        value?.code ??
        '').trim();
    const name = String(value?.paymentMethodName ??
        value?.name ??
        value?.description ??
        code).trim();
    if (!code) {
        return null;
    }
    const searchable = `${code} ${name}`.toLowerCase();
    const isEcoCash = code === 'PZW211' ||
        searchable.includes('ecocash');
    const isInnBucks = code === 'PZW212' ||
        searchable.includes('innbucks');
    return {
        code,
        name: name || code,
        description: String(value?.description ??
            value?.paymentMethodDescription ??
            '').trim(),
        seamless: isEcoCash || isInnBucks,
        requiresPhone: isEcoCash,
    };
};
const fetchPesePayMethods = async (currencyCode) => {
    const { integrationKey } = getPesePayCredentials();
    const url = `${PESEPAY_METHODS_URL}?currencyCode=${encodeURIComponent(currencyCode)}`;
    const response = await nodeFetch(url, {
        method: 'GET',
        headers: {
            authorization: integrationKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        insecureHTTPParser: true,
    });
    let body = null;
    try {
        body = await response.json();
    }
    catch {
        body = null;
    }
    if (!response.ok) {
        throw new Error(`PesePay payment methods request failed (${response.status}).`);
    }
    const values = Array.isArray(body)
        ? body
        : Array.isArray(body?.data)
            ? body.data
            : Array.isArray(body?.paymentMethods)
                ? body.paymentMethods
                : [];
    return values
        .map(normalisePesePayMethod)
        .filter((method) => method !== null);
};
/*
 * ----------------------------------------------------------
 * HEALTH / CONFIG CHECK
 * ----------------------------------------------------------
 */
router.get('/pesepay/status', (_req, res) => {
    try {
        getPesePayCredentials();
        return res.json({
            success: true,
            provider: 'pesepay',
            configured: true,
        });
    }
    catch {
        return res.status(503).json({
            success: false,
            provider: 'pesepay',
            configured: false,
        });
    }
});
router.get('/pesepay/methods', authenticate, async (req, res) => {
    try {
        const currencyCode = typeof req.query.currencyCode ===
            'string'
            ? req.query.currencyCode
                .trim()
                .toUpperCase()
            : 'USD';
        const methods = await fetchPesePayMethods(currencyCode);
        return res.json({
            success: true,
            currencyCode,
            methods,
        });
    }
    catch (error) {
        console.error('PesePay methods error:', error);
        return res.status(502).json({
            success: false,
            message: 'Unable to load PesePay payment methods.',
        });
    }
});
const verifyPesePayCallbackPayment = async (paymentId) => {
    /*
     * The callback can arrive very quickly. Give initiation a
     * few seconds to save PesePay's provider reference first.
     */
    let paymentDoc = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
        paymentDoc =
            await adminDb
                .collection('payments')
                .doc(paymentId)
                .get();
        if (paymentDoc.exists &&
            paymentDoc.data()
                ?.provider_reference) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    if (!paymentDoc ||
        !paymentDoc.exists) {
        return false;
    }
    const payment = paymentDoc.data();
    const providerReference = String(payment.provider_reference ||
        '').trim();
    const orderId = String(payment.order_id ||
        '').trim();
    if (!providerReference ||
        !orderId) {
        return false;
    }
    const providerTransaction = await fetchPesePayStatus(providerReference);
    const providerStatus = String(providerTransaction
        .transactionStatus ||
        '')
        .trim()
        .toUpperCase();
    const providerDescription = String(providerTransaction
        .transactionStatusDescription ||
        '');
    const now = new Date().toISOString();
    const paymentRef = adminDb
        .collection('payments')
        .doc(paymentId);
    if (providerStatus !==
        'SUCCESS') {
        await paymentRef.set({
            provider_status: providerStatus ||
                'UNKNOWN',
            provider_status_description: providerDescription,
            updated_at: now,
        }, { merge: true });
        return false;
    }
    await adminDb.runTransaction(async (transaction) => {
        const freshPayment = await transaction.get(paymentRef);
        if (!freshPayment.exists) {
            return;
        }
        const freshPaymentData = freshPayment.data();
        const orderRef = adminDb
            .collection('orders')
            .doc(String(freshPaymentData
            .order_id));
        const freshOrder = await transaction.get(orderRef);
        if (!freshOrder.exists) {
            return;
        }
        const order = freshOrder.data();
        if (order.status ===
            'cancelled' ||
            order.status ===
                'refunded') {
            return;
        }
        const domainQuery = adminDb
            .collection('domains')
            .where('order_id', '==', orderRef.id)
            .limit(1);
        const domainSnapshot = await transaction.get(domainQuery);
        transaction.set(paymentRef, {
            status: 'verified',
            provider_status: 'SUCCESS',
            provider_status_description: providerDescription,
            transaction_id: providerTransaction
                .internalReference ||
                providerReference,
            verified_at: freshPaymentData
                .verified_at ||
                now,
            updated_at: now,
        }, { merge: true });
        if (order.status !==
            'paid' &&
            order.status !==
                'completed') {
            transaction.update(orderRef, {
                status: 'paid',
                paid_at: order.paid_at ||
                    now,
                updated_at: now,
            });
        }
        if (!domainSnapshot.empty) {
            const domainDoc = domainSnapshot.docs[0];
            const domain = domainDoc.data();
            const existingHistory = Array.isArray(domain.history)
                ? domain.history
                : [];
            const alreadyRecorded = existingHistory.some((item) => item?.description ===
                'PesePay payment verified. Domain registration is now being processed.');
            transaction.set(domainDoc.ref, {
                status: domain.status ===
                    'pending_payment'
                    ? 'pending_registration'
                    : domain.status,
                payment_id: paymentId,
                updated_at: now,
                history: alreadyRecorded
                    ? existingHistory
                    : [
                        ...existingHistory,
                        {
                            id: `hist-pesepay-${paymentId.slice(0, 8)}`,
                            domain_id: domainDoc.id,
                            action: 'STATUS_CHANGE',
                            description: 'PesePay payment verified. Domain registration is now being processed.',
                            status: 'pending_registration',
                            actor: 'PesePay',
                            created_at: now,
                        },
                    ],
            }, { merge: true });
        }
    });
    return true;
};
/*
 * ----------------------------------------------------------
 * PESEPAY RESULT CALLBACK
 * ----------------------------------------------------------
 *
 * PesePay can call this URL when the transaction changes.
 * We intentionally do NOT trust the callback as proof of
 * payment. The payment will be verified against PesePay's
 * Check Payment Status API before an order is marked paid.
 */
router.all('/pesepay/result', async (req, res) => {
    try {
        const paymentId = typeof req.query.paymentId ===
            'string'
            ? req.query.paymentId
            : '';
        if (paymentId) {
            await adminDb
                .collection('payments')
                .doc(paymentId)
                .set({
                provider_callback_received_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { merge: true });
            await verifyPesePayCallbackPayment(paymentId);
        }
        return res.status(200).json({
            success: true,
        });
    }
    catch (error) {
        console.error('PesePay result callback error:', error);
        return res.status(200).json({
            success: true,
        });
    }
});
/*
 * ----------------------------------------------------------
 * VERIFY PESEPAY PAYMENT
 * ----------------------------------------------------------
 *
 * Runtime never trusts the browser or callback as proof of
 * payment. This route asks PesePay for the authoritative
 * transaction status before changing local payment state.
 *
 * Only SUCCESS is treated as paid. Unknown/non-success
 * statuses remain pending until we explicitly map PesePay's
 * terminal failure statuses.
 */
router.post('/pesepay/verify', authenticate, async (req, res) => {
    try {
        const body = req.body ?? {};
        const paymentId = typeof body.paymentId ===
            'string'
            ? body.paymentId.trim()
            : '';
        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required.',
            });
        }
        const runtimeUser = req.runtimeUser;
        const paymentRef = adminDb
            .collection('payments')
            .doc(paymentId);
        const paymentDoc = await paymentRef.get();
        if (!paymentDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found.',
            });
        }
        const payment = paymentDoc.data();
        const ownsPayment = payment.user_id ===
            runtimeUser.uid;
        const isAdmin = runtimeUser.role ===
            'super_admin';
        if (!ownsPayment &&
            !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'You may only verify your own payment.',
            });
        }
        if (payment.gateway !==
            'pesepay') {
            return res.status(400).json({
                success: false,
                message: 'This is not a PesePay payment.',
            });
        }
        const orderId = String(payment.order_id || '').trim();
        const providerReference = String(payment.provider_reference ||
            '').trim();
        if (!orderId ||
            !providerReference) {
            return res.status(409).json({
                success: false,
                message: 'The PesePay transaction is not ready for verification yet.',
            });
        }
        const providerTransaction = await fetchPesePayStatus(providerReference);
        const providerStatus = String(providerTransaction
            .transactionStatus || '')
            .trim()
            .toUpperCase();
        const providerDescription = String(providerTransaction
            .transactionStatusDescription ||
            '');
        const providerInternalReference = String(providerTransaction
            .internalReference ||
            providerReference);
        const now = new Date().toISOString();
        /*
         * SUCCESS is the only status that can
         * move money/order state to paid.
         */
        if (providerStatus ===
            'SUCCESS') {
            const result = await adminDb.runTransaction(async (transaction) => {
                const freshPayment = await transaction.get(paymentRef);
                if (!freshPayment.exists) {
                    throw new Error('Payment disappeared during verification.');
                }
                const freshPaymentData = freshPayment.data();
                const orderRef = adminDb
                    .collection('orders')
                    .doc(String(freshPaymentData
                    .order_id));
                const freshOrder = await transaction.get(orderRef);
                if (!freshOrder.exists) {
                    throw new Error('Order linked to payment was not found.');
                }
                const order = freshOrder.data();
                const domainQuery = adminDb
                    .collection('domains')
                    .where('order_id', '==', orderRef.id)
                    .limit(1);
                const domainSnapshot = await transaction.get(domainQuery);
                if (order.status ===
                    'cancelled' ||
                    order.status ===
                        'refunded') {
                    throw new Error('This order can no longer be marked paid.');
                }
                /*
                 * Idempotency:
                 * repeated verification of the same
                 * successful payment is harmless.
                 */
                transaction.set(paymentRef, {
                    status: 'verified',
                    provider_status: providerStatus,
                    provider_status_description: providerDescription,
                    transaction_id: providerInternalReference,
                    verified_at: freshPaymentData
                        .verified_at ||
                        now,
                    updated_at: now,
                }, { merge: true });
                if (order.status !==
                    'paid' &&
                    order.status !==
                        'completed') {
                    transaction.update(orderRef, {
                        status: 'paid',
                        paid_at: order.paid_at ||
                            now,
                        updated_at: now,
                    });
                }
                if (!domainSnapshot.empty) {
                    const domainDoc = domainSnapshot.docs[0];
                    const domain = domainDoc.data();
                    const existingHistory = Array.isArray(domain.history)
                        ? domain.history
                        : [];
                    const alreadyRecorded = existingHistory.some((item) => item?.description ===
                        'PesePay payment verified. Domain registration is now being processed.');
                    transaction.set(domainDoc.ref, {
                        status: domain.status ===
                            'pending_payment'
                            ? 'pending_registration'
                            : domain.status,
                        payment_id: paymentId,
                        updated_at: now,
                        history: alreadyRecorded
                            ? existingHistory
                            : [
                                ...existingHistory,
                                {
                                    id: `hist-pesepay-${paymentId.slice(0, 8)}`,
                                    domain_id: domainDoc.id,
                                    action: 'STATUS_CHANGE',
                                    description: 'PesePay payment verified. Domain registration is now being processed.',
                                    status: 'pending_registration',
                                    actor: 'PesePay',
                                    created_at: now,
                                },
                            ],
                    }, { merge: true });
                }
                return {
                    orderId: orderRef.id,
                };
            });
            return res.json({
                success: true,
                verified: true,
                paymentId,
                orderId: result.orderId,
                transactionStatus: providerStatus,
                transactionStatusDescription: providerDescription,
            });
        }
        /*
         * Do not guess which non-success statuses
         * are terminal. Keep the payment pending
         * while recording PesePay's latest status.
         */
        await paymentRef.set({
            provider_status: providerStatus ||
                'UNKNOWN',
            provider_status_description: providerDescription,
            transaction_id: providerInternalReference,
            updated_at: now,
        }, { merge: true });
        return res.json({
            success: true,
            verified: false,
            paymentId,
            orderId,
            transactionStatus: providerStatus ||
                'UNKNOWN',
            transactionStatusDescription: providerDescription,
        });
    }
    catch (error) {
        console.error('PesePay verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to verify PesePay payment.',
        });
    }
});
/*
 * ----------------------------------------------------------
 * INITIATE PESEPAY ECOCASH USD PAYMENT
 * ----------------------------------------------------------
 */
router.post('/pesepay/initiate', authenticate, async (req, res) => {
    let paymentId = '';
    let orderId = '';
    let previousOrderStatus = 'pending';
    try {
        const body = req.body ?? {};
        orderId =
            typeof body.orderId ===
                'string'
                ? body.orderId.trim()
                : '';
        const paymentMethodCode = typeof body.paymentMethodCode ===
            'string'
            ? body.paymentMethodCode.trim()
            : '';
        const customerPhoneNumber = typeof body.customerPhoneNumber ===
            'string'
            ? body.customerPhoneNumber.trim()
            : '';
        if (!orderId || !paymentMethodCode) {
            return res.status(400).json({
                success: false,
                message: 'Order ID and PesePay payment method are required.',
            });
        }
        const runtimeUser = req.runtimeUser;
        const orderRef = adminDb
            .collection('orders')
            .doc(orderId);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Order not found.',
            });
        }
        const order = orderDoc.data();
        if (order.user_id !==
            runtimeUser.uid) {
            return res.status(403).json({
                success: false,
                message: 'You may only pay for your own order.',
            });
        }
        if (order.status === 'paid' ||
            order.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'This order has already been paid.',
            });
        }
        if (order.status ===
            'payment_pending') {
            return res.status(409).json({
                success: false,
                message: 'A payment is already pending for this order.',
            });
        }
        const amount = Number(order.total);
        const currency = String(order.currency || 'USD').toUpperCase();
        if (!Number.isFinite(amount) ||
            amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'This order has an invalid payment amount.',
            });
        }
        if (currency !== 'USD') {
            return res.status(400).json({
                success: false,
                message: 'This PesePay payment requires a USD order.',
            });
        }
        const availableMethods = await fetchPesePayMethods(currency);
        const selectedMethod = availableMethods.find((method) => method.code ===
            paymentMethodCode);
        if (!selectedMethod) {
            return res.status(400).json({
                success: false,
                message: 'That PesePay payment method is not currently available.',
            });
        }
        if (selectedMethod.requiresPhone &&
            !customerPhoneNumber) {
            return res.status(400).json({
                success: false,
                message: `${selectedMethod.name} phone number is required.`,
            });
        }
        const orderReference = String(order.reference || '').trim();
        if (!orderReference) {
            return res.status(400).json({
                success: false,
                message: 'This order has no payment reference.',
            });
        }
        const customerEmail = String(order.user_email ||
            runtimeUser.email).trim();
        if (!customerEmail) {
            return res.status(400).json({
                success: false,
                message: 'Customer email is missing.',
            });
        }
        previousOrderStatus =
            String(order.status || 'pending');
        const paymentRef = adminDb
            .collection('payments')
            .doc();
        paymentId =
            paymentRef.id;
        const merchantReference = `${orderReference}-${paymentId.slice(0, 8)}`;
        const reasonForPayment = order.items?.[0]?.description
            ? String(order.items[0]
                .description)
            : `Runtime order ${orderReference}`;
        const now = new Date().toISOString();
        const batch = adminDb.batch();
        batch.set(paymentRef, {
            id: paymentId,
            order_id: orderId,
            user_id: runtimeUser.uid,
            reference: merchantReference,
            amount,
            currency,
            gateway: 'pesepay',
            provider_payment_method: selectedMethod.code,
            provider_payment_method_name: selectedMethod.name,
            provider_payment_flow: selectedMethod.seamless
                ? 'seamless'
                : 'redirect',
            status: 'pending',
            customer_confirmed_payment: false,
            created_at: now,
            updated_at: now,
        });
        batch.update(orderRef, {
            status: 'payment_pending',
            updated_at: now,
        });
        const domainSnapshot = await adminDb
            .collection('domains')
            .where('order_id', '==', orderId)
            .limit(1)
            .get();
        if (!domainSnapshot.empty) {
            batch.set(domainSnapshot.docs[0].ref, {
                payment_id: paymentId,
                updated_at: now,
            }, { merge: true });
        }
        await batch.commit();
        const { integrationKey, encryptionKey, } = getPesePayCredentials();
        const apiBaseUrl = process.env.RUNTIME_API_URL ||
            'https://runtime-api-my3q.onrender.com';
        const frontendUrl = process.env.RUNTIME_FRONTEND_URL ||
            'https://runtime.co.zw';
        const resultUrl = `${apiBaseUrl}/api/payments/pesepay/result?paymentId=${encodeURIComponent(paymentId)}`;
        const returnUrl = `${frontendUrl}/dashboard`;
        const customer = {
            email: customerEmail,
            phoneNumber: customerPhoneNumber ||
                String(order.customer_phone ||
                    ''),
            name: runtimeUser.name,
        };
        const paymentBody = selectedMethod.seamless
            ? {
                amountDetails: {
                    amount,
                    currencyCode: currency,
                },
                merchantReference,
                reasonForPayment,
                resultUrl,
                returnUrl,
                paymentMethodCode: selectedMethod.code,
                customer,
                paymentMethodRequiredFields: selectedMethod.requiresPhone
                    ? {
                        customerPhoneNumber,
                    }
                    : {},
            }
            : {
                amountDetails: {
                    amount,
                    currencyCode: currency,
                },
                merchantReference,
                reasonForPayment,
                resultUrl,
                returnUrl,
                customer,
            };
        const encryptedPayload = encryptPayload(paymentBody, encryptionKey);
        const providerUrl = selectedMethod.seamless
            ? PESEPAY_MAKE_PAYMENT_URL
            : PESEPAY_INITIATE_URL;
        const response = await nodeFetch(providerUrl, {
            method: 'POST',
            headers: {
                authorization: integrationKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                payload: encryptedPayload,
            }),
            insecureHTTPParser: true,
        });
        let responseBody;
        try {
            responseBody =
                await response.json();
        }
        catch {
            responseBody = null;
        }
        if (!response.ok) {
            console.error('PesePay initiation failed:', response.status, responseBody);
            await markInitiationFailed(paymentId, orderId, previousOrderStatus, `PesePay initiation failed with HTTP ${response.status}.`);
            return res.status(502).json({
                success: false,
                message: 'PesePay could not initiate the payment.',
            });
        }
        if (!responseBody ||
            typeof responseBody.payload !==
                'string' ||
            !responseBody.payload) {
            await markInitiationFailed(paymentId, orderId, previousOrderStatus, 'PesePay returned an invalid response.');
            return res.status(502).json({
                success: false,
                message: 'PesePay returned an invalid response.',
            });
        }
        const transaction = decryptPayload(responseBody.payload, encryptionKey);
        if (!transaction.referenceNumber) {
            await markInitiationFailed(paymentId, orderId, previousOrderStatus, 'PesePay response did not include a reference number.');
            return res.status(502).json({
                success: false,
                message: 'PesePay returned an incomplete transaction.',
            });
        }
        await paymentRef.set({
            provider_reference: transaction.referenceNumber,
            transaction_id: transaction.internalReference ||
                transaction.referenceNumber,
            provider_status: transaction.transactionStatus ||
                'INITIATED',
            provider_status_description: transaction.transactionStatusDescription ||
                '',
            pesepay_poll_url: transaction.pollUrl || '',
            redirect_url: transaction.redirectUrl || '',
            updated_at: new Date().toISOString(),
        }, { merge: true });
        return res.json({
            success: true,
            paymentId,
            orderId,
            transaction: {
                referenceNumber: transaction.referenceNumber,
                transactionStatus: transaction.transactionStatus,
                redirectRequired: Boolean(transaction.redirectRequired),
                redirectUrl: transaction.redirectUrl ||
                    null,
                pollUrl: transaction.pollUrl || null,
                flow: selectedMethod.seamless
                    ? 'seamless'
                    : 'redirect',
                paymentMethodCode: selectedMethod.code,
                paymentMethodName: selectedMethod.name,
            },
        });
    }
    catch (error) {
        console.error('PesePay initiation error:', error);
        if (paymentId &&
            orderId) {
            try {
                await markInitiationFailed(paymentId, orderId, previousOrderStatus, 'Unable to initiate PesePay payment.');
            }
            catch (cleanupError) {
                console.error('Unable to clean up failed PesePay initiation:', cleanupError);
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Unable to initiate PesePay payment.',
        });
    }
});
export default router;

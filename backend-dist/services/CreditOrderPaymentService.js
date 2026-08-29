import crypto from 'crypto';
import { adminDb, } from '../firebaseAdmin.js';
import { fulfillPaidOrder, } from './OrderFulfillmentService.js';
import { emailService, } from '../email/emailService.js';
const money = (value) => Math.round((Number(value) + Number.EPSILON) *
    100) / 100;
const makeId = (prefix, value) => `${prefix}-${crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .slice(0, 32)}`;
export const applyRuntimeCreditToOrder = async ({ orderId, userId, actor, requestedAmount, }) => {
    const cleanOrderId = String(orderId || '').trim();
    const cleanUserId = String(userId || '').trim();
    if (!cleanOrderId) {
        throw new Error('Order ID is required.');
    }
    if (!cleanUserId) {
        throw new Error('User is required.');
    }
    const orderRef = adminDb
        .collection('orders')
        .doc(cleanOrderId);
    const walletRef = adminDb
        .collection('wallets')
        .doc(cleanUserId);
    /*
     * One Runtime Credit application per order.
     * This makes retries idempotent and prevents accidental
     * double-debits if the browser resubmits.
     */
    const idempotencyKey = `order-runtime-credit:${cleanOrderId}`;
    const paymentRef = adminDb
        .collection('payments')
        .doc(makeId('pay-credit', idempotencyKey));
    const ledgerRef = adminDb
        .collection('wallet_transactions')
        .doc(makeId('wtx', idempotencyKey));
    const paymentQuery = adminDb
        .collection('payments')
        .where('order_id', '==', cleanOrderId);
    const now = new Date().toISOString();
    const result = await adminDb.runTransaction(async (transaction) => {
        const [orderDoc, walletDoc, existingPaymentDoc, existingLedgerDoc, paymentSnapshot,] = await Promise.all([
            transaction.get(orderRef),
            transaction.get(walletRef),
            transaction.get(paymentRef),
            transaction.get(ledgerRef),
            transaction.get(paymentQuery),
        ]);
        if (!orderDoc.exists) {
            throw new Error('Order not found.');
        }
        const order = orderDoc.data();
        if (order.user_id !==
            cleanUserId) {
            throw new Error('You may only use Runtime Credit on your own order.');
        }
        if (order.status ===
            'cancelled' ||
            order.status ===
                'refunded') {
            throw new Error('This order can no longer be paid.');
        }
        const orderTotal = money(Number(order.total || 0));
        if (!Number.isFinite(orderTotal) ||
            orderTotal <= 0) {
            throw new Error('This order has an invalid total.');
        }
        const verifiedBefore = paymentSnapshot.docs
            .filter((doc) => doc.id !==
            paymentRef.id &&
            doc.data().status ===
                'verified')
            .reduce((total, doc) => total +
            Number(doc.data().amount ||
                0), 0);
        const paidBefore = money(verifiedBefore);
        const dueBefore = money(Math.max(0, orderTotal -
            paidBefore));
        /*
         * If this exact application already exists,
         * return its authoritative result without
         * touching the wallet again.
         */
        if (existingPaymentDoc.exists &&
            existingLedgerDoc.exists) {
            const existingPayment = existingPaymentDoc.data();
            const existingLedger = existingLedgerDoc.data();
            const existingAmount = money(Number(existingPayment.amount ||
                0));
            const amountPaid = money(Math.min(orderTotal, paidBefore +
                existingAmount));
            return {
                paymentId: paymentRef.id,
                walletTransactionId: ledgerRef.id,
                appliedAmount: existingAmount,
                balanceBefore: Number(existingLedger
                    .balance_before ||
                    0),
                balanceAfter: Number(existingLedger
                    .balance_after ||
                    0),
                orderTotal,
                amountPaid,
                amountDue: money(Math.max(0, orderTotal -
                    amountPaid)),
                fullyPaid: amountPaid >=
                    orderTotal,
                alreadyApplied: true,
                fulfillment: {
                    handled: false,
                    itemType: String(order.purpose ||
                        order.metadata
                            ?.purpose ||
                        order.items?.[0]
                            ?.item_type ||
                        ''),
                },
            };
        }
        if (dueBefore <= 0) {
            throw new Error('This order is already fully paid.');
        }
        const wallet = walletDoc.exists
            ? walletDoc.data()
            : {
                balance: 0,
                currency: 'USD',
            };
        const walletCurrency = String(wallet.currency ||
            'USD').toUpperCase();
        if (walletCurrency !==
            'USD') {
            throw new Error('Runtime Credit currently supports USD only.');
        }
        const balanceBefore = money(Number(wallet.balance || 0));
        if (balanceBefore <= 0) {
            throw new Error('You do not have Runtime Credit available.');
        }
        const requested = requestedAmount ===
            undefined
            ? dueBefore
            : money(Number(requestedAmount));
        if (!Number.isFinite(requested) ||
            requested <= 0) {
            throw new Error('Runtime Credit amount must be greater than zero.');
        }
        const appliedAmount = money(Math.min(balanceBefore, dueBefore, requested));
        if (appliedAmount <= 0) {
            throw new Error('No Runtime Credit can be applied to this order.');
        }
        const balanceAfter = money(balanceBefore -
            appliedAmount);
        const amountPaid = money(Math.min(orderTotal, paidBefore +
            appliedAmount));
        const amountDue = money(Math.max(0, orderTotal -
            amountPaid));
        const fullyPaid = amountDue <= 0;
        /*
         * Firestore requires every transaction read to happen
         * before the first write. Fulfillment may need a domain
         * document, so preload it now and pass it into
         * fulfillPaidOrder later.
         */
        const itemType = String(order.purpose ||
            order.metadata?.purpose ||
            order.items?.[0]?.item_type ||
            '')
            .trim()
            .toLowerCase();
        let fulfillmentDomainDoc = null;
        if (fullyPaid &&
            itemType ===
                'domain_renewal') {
            const domainId = String(order.domain_id ||
                order.metadata?.domain_id ||
                '').trim();
            if (domainId) {
                fulfillmentDomainDoc =
                    await transaction.get(adminDb
                        .collection('domains')
                        .doc(domainId));
            }
        }
        else if (fullyPaid) {
            const domainSnapshot = await transaction.get(adminDb
                .collection('domains')
                .where('order_id', '==', orderRef.id)
                .limit(1));
            fulfillmentDomainDoc =
                domainSnapshot.empty
                    ? null
                    : domainSnapshot.docs[0];
        }
        transaction.set(walletRef, {
            id: cleanUserId,
            user_id: cleanUserId,
            balance: balanceAfter,
            currency: 'USD',
            created_at: wallet.created_at ||
                now,
            updated_at: now,
        }, { merge: true });
        transaction.create(ledgerRef, {
            id: ledgerRef.id,
            wallet_id: cleanUserId,
            user_id: cleanUserId,
            type: 'debit',
            amount: appliedAmount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference_type: 'order',
            reference_id: cleanOrderId,
            description: `Runtime Credit applied to order ${String(order.reference ||
                cleanOrderId)}`,
            idempotency_key: idempotencyKey,
            created_at: now,
        });
        transaction.create(paymentRef, {
            id: paymentRef.id,
            purpose: 'order_payment',
            order_id: cleanOrderId,
            user_id: cleanUserId,
            reference: `RT-CREDIT-${String(order.reference ||
                cleanOrderId)}`,
            amount: appliedAmount,
            currency: 'USD',
            gateway: 'runtime_credit',
            status: 'verified',
            wallet_transaction_id: ledgerRef.id,
            revenue_recognized: false,
            verified_at: now,
            created_at: now,
            updated_at: now,
        });
        transaction.set(orderRef, {
            status: fullyPaid
                ? 'paid'
                : 'payment_pending',
            amount_paid: amountPaid,
            amount_due: amountDue,
            ...(fullyPaid
                ? {
                    paid_at: order.paid_at ||
                        now,
                }
                : {}),
            updated_at: now,
        }, { merge: true });
        let fulfillment = {
            handled: false,
            itemType: String(order.purpose ||
                order.metadata
                    ?.purpose ||
                order.items?.[0]
                    ?.item_type ||
                ''),
        };
        if (fullyPaid) {
            fulfillment =
                await fulfillPaidOrder({
                    transaction,
                    orderRef,
                    order,
                    paymentId: paymentRef.id,
                    now,
                    actor,
                    preloadedDomainDoc: fulfillmentDomainDoc,
                });
        }
        return {
            paymentId: paymentRef.id,
            walletTransactionId: ledgerRef.id,
            appliedAmount,
            balanceBefore,
            balanceAfter,
            orderTotal,
            amountPaid,
            amountDue,
            fullyPaid,
            alreadyApplied: false,
            fulfillment,
        };
    });
    /*
     * Email is deliberately sent AFTER the Firestore transaction.
     * A mail-provider problem must never roll back or duplicate money.
     */
    if (!result.alreadyApplied) {
        try {
            const [orderDoc, userDoc,] = await Promise.all([
                orderRef.get(),
                adminDb
                    .collection('users')
                    .doc(cleanUserId)
                    .get(),
            ]);
            const order = orderDoc.exists
                ? orderDoc.data()
                : {};
            const user = userDoc.exists
                ? userDoc.data()
                : {};
            const email = String(order.user_email ||
                user.email ||
                '').trim();
            if (email) {
                const item = Array.isArray(order.items)
                    ? order.items[0]
                    : undefined;
                const domainName = String(order.domain_name ||
                    order.metadata
                        ?.domain_name ||
                    item?.domain_name ||
                    '').trim();
                await emailService
                    .sendEvent('runtime_credit_applied', {
                    email,
                    name: String(user.name ||
                        order.customer_name ||
                        '').trim() ||
                        undefined,
                    orderReference: String(order.reference ||
                        cleanOrderId),
                    paymentReference: `RT-CREDIT-${String(order.reference ||
                        cleanOrderId)}`,
                    domainName: domainName ||
                        undefined,
                    amount: result.appliedAmount,
                    creditApplied: result.appliedAmount,
                    orderTotal: result.orderTotal,
                    amountPaid: result.amountPaid,
                    amountRemaining: result.amountDue,
                    balanceBefore: result.balanceBefore,
                    balanceAfter: result.balanceAfter,
                });
            }
        }
        catch (error) {
            console.error('Runtime Credit application email failed:', error);
        }
    }
    return result;
};

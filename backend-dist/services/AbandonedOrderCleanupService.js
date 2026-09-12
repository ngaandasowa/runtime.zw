import { adminDb, } from '../firebaseAdmin.js';
const DAY_MS = 24 * 60 * 60 * 1000;
const money = (value) => Math.round((Number(value) +
    Number.EPSILON) *
    100) / 100;
const AUTO_DELETE_AFTER_DAYS = 7;
const ABANDONED_ORDER_STATUSES = new Set([
    'pending',
    'unpaid',
    'payment_pending',
    'cancelled',
]);
const ABANDONED_PAYMENT_STATUSES = new Set([
    'pending',
    'pending_verification',
    'failed',
    'rejected',
    'cancelled',
]);
const dateMs = (value) => {
    const parsed = new Date(String(value || '')).getTime();
    return Number.isFinite(parsed)
        ? parsed
        : 0;
};
const getOrderItemType = (order) => String(order.purpose ||
    order.metadata
        ?.purpose ||
    order.items?.[0]
        ?.item_type ||
    '')
    .trim()
    .toLowerCase();
const refundRuntimeCredit = async (orderId, order, creditPayments) => {
    if (creditPayments.length ===
        0) {
        return 0;
    }
    const userId = String(order.user_id || '').trim();
    if (!userId) {
        throw new Error(`Cannot refund Runtime Credit for ${orderId}: user is missing.`);
    }
    const refundable = money(creditPayments.reduce((total, doc) => total +
        Number(doc.data()
            .amount || 0), 0));
    if (refundable <= 0) {
        return 0;
    }
    const walletRef = adminDb
        .collection('wallets')
        .doc(userId);
    const refundLedgerRef = adminDb
        .collection('wallet_transactions')
        .doc(`wtx-abandoned-refund-${orderId}`);
    const now = new Date()
        .toISOString();
    await adminDb.runTransaction(async (transaction) => {
        const [walletDoc, existingRefund,] = await Promise.all([
            transaction.get(walletRef),
            transaction.get(refundLedgerRef),
        ]);
        /*
         * Idempotency for concurrent/scheduled retries.
         */
        if (existingRefund.exists) {
            return;
        }
        const wallet = walletDoc.exists
            ? walletDoc.data()
            : {};
        const before = money(Number(wallet.balance || 0));
        const after = money(before +
            refundable);
        transaction.set(walletRef, {
            id: userId,
            user_id: userId,
            balance: after,
            currency: String(wallet.currency ||
                'USD'),
            created_at: wallet.created_at ||
                now,
            updated_at: now,
        }, {
            merge: true,
        });
        transaction.create(refundLedgerRef, {
            id: refundLedgerRef.id,
            wallet_id: userId,
            user_id: userId,
            type: 'credit',
            amount: refundable,
            balance_before: before,
            balance_after: after,
            reference_type: 'order',
            reference_id: orderId,
            description: `Runtime Credit returned after abandoned order ${String(order.reference ||
                orderId)} was cancelled/removed.`,
            idempotency_key: `abandoned-order-refund:${orderId}`,
            created_at: now,
        });
    });
    return refundable;
};
export const cleanupOrder = async (orderId, options = {}) => {
    const orderRef = adminDb
        .collection('orders')
        .doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
        return {
            cleaned: false,
            orderId,
            deletedPayments: 0,
            deletedPendingDomains: 0,
            refundedRuntimeCredit: 0,
            skippedReason: 'Order not found.',
        };
    }
    const order = orderDoc.data();
    const status = String(order.status || '')
        .trim()
        .toLowerCase();
    if (status === 'paid' ||
        status ===
            'completed' ||
        status ===
            'refunded') {
        return {
            cleaned: false,
            orderId,
            deletedPayments: 0,
            deletedPendingDomains: 0,
            refundedRuntimeCredit: 0,
            skippedReason: 'Paid/completed orders are never abandoned-order cleanup targets.',
        };
    }
    if (!options
        .allowUncancelled &&
        status !==
            'cancelled') {
        return {
            cleaned: false,
            orderId,
            deletedPayments: 0,
            deletedPendingDomains: 0,
            refundedRuntimeCredit: 0,
            skippedReason: 'Only cancelled orders can be manually deleted.',
        };
    }
    if (options
        .allowUncancelled &&
        !ABANDONED_ORDER_STATUSES
            .has(status)) {
        return {
            cleaned: false,
            orderId,
            deletedPayments: 0,
            deletedPendingDomains: 0,
            refundedRuntimeCredit: 0,
            skippedReason: `Order status ${status} is not an abandoned unpaid state.`,
        };
    }
    const [paymentSnapshot, domainSnapshot,] = await Promise.all([
        adminDb
            .collection('payments')
            .where('order_id', '==', orderId)
            .get(),
        adminDb
            .collection('domains')
            .where('order_id', '==', orderId)
            .get(),
    ]);
    const payments = paymentSnapshot.docs;
    /*
     * External verified money must never be auto-deleted.
     * It needs explicit financial review/refund handling.
     */
    const verifiedExternal = payments.filter((doc) => {
        const payment = doc.data();
        return (payment.status ===
            'verified' &&
            payment.gateway !==
                'runtime_credit');
    });
    if (verifiedExternal.length >
        0) {
        return {
            cleaned: false,
            orderId,
            deletedPayments: 0,
            deletedPendingDomains: 0,
            refundedRuntimeCredit: 0,
            skippedReason: 'Order has verified external money and requires manual financial review.',
        };
    }
    const verifiedCredit = payments.filter((doc) => {
        const payment = doc.data();
        return (payment.status ===
            'verified' &&
            payment.gateway ===
                'runtime_credit');
    });
    const refundedRuntimeCredit = await refundRuntimeCredit(orderId, order, verifiedCredit);
    /*
     * Renewal orders point to the real active domain through
     * domain_id. They normally have no domain record whose
     * order_id equals this renewal order.
     *
     * Only delete abandoned domain stubs that are explicitly
     * pending_payment. Active/expired domains are untouchable.
     */
    let deletedPendingDomains = 0;
    for (const domainDoc of domainSnapshot.docs) {
        const domain = domainDoc.data();
        if (String(domain.status || '') ===
            'pending_payment') {
            await domainDoc.ref
                .delete();
            deletedPendingDomains +=
                1;
        }
    }
    /*
     * Secure transfer authorization is keyed by order id.
     * Remove it with an abandoned transfer.
     */
    await adminDb
        .collection('transfer_requests')
        .doc(orderId)
        .delete()
        .catch(() => undefined);
    let deletedPayments = 0;
    for (const paymentDoc of payments) {
        /*
         * We already refused verified external money.
         * Verified Runtime Credit was refunded above.
         * Every remaining payment is safe abandoned state.
         */
        await paymentDoc.ref
            .delete();
        deletedPayments +=
            1;
    }
    await orderRef.delete();
    console.log('Abandoned order cleaned:', {
        orderId,
        reference: order.reference,
        itemType: getOrderItemType(order),
        refundedRuntimeCredit,
        deletedPayments,
        deletedPendingDomains,
    });
    return {
        cleaned: true,
        orderId,
        deletedPayments,
        deletedPendingDomains,
        refundedRuntimeCredit,
    };
};
export const cleanupWalletTopup = async (paymentId) => {
    const ref = adminDb
        .collection('payments')
        .doc(paymentId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
        return {
            cleaned: false,
            reason: 'Payment not found.',
        };
    }
    const payment = snapshot.data();
    if (payment.purpose !==
        'wallet_topup') {
        return {
            cleaned: false,
            reason: 'This payment is not a Runtime Credit top-up.',
        };
    }
    if (payment.status ===
        'verified') {
        return {
            cleaned: false,
            reason: 'Verified wallet top-ups cannot be deleted because credit was already added.',
        };
    }
    await ref.delete();
    return {
        cleaned: true,
    };
};
export const runAbandonedCleanup = async () => {
    const now = Date.now();
    const cutoff = now -
        AUTO_DELETE_AFTER_DAYS *
            DAY_MS;
    const orderSnapshot = await adminDb
        .collection('orders')
        .get();
    let cleanedOrders = 0;
    let skippedOrders = 0;
    for (const orderDoc of orderSnapshot.docs) {
        const order = orderDoc.data();
        const status = String(order.status || '')
            .trim()
            .toLowerCase();
        if (!ABANDONED_ORDER_STATUSES
            .has(status)) {
            continue;
        }
        const created = dateMs(order.created_at);
        if (!created ||
            created > cutoff) {
            continue;
        }
        const result = await cleanupOrder(orderDoc.id, {
            allowUncancelled: true,
        });
        if (result.cleaned) {
            cleanedOrders += 1;
        }
        else {
            skippedOrders += 1;
        }
    }
    /*
     * Wallet top-ups are standalone payment records.
     * Old non-verified attempts can be discarded after the
     * same seven-day window. Verified credit is never removed.
     */
    const paymentSnapshot = await adminDb
        .collection('payments')
        .where('purpose', '==', 'wallet_topup')
        .get();
    let cleanedTopups = 0;
    for (const paymentDoc of paymentSnapshot.docs) {
        const payment = paymentDoc.data();
        if (!ABANDONED_PAYMENT_STATUSES
            .has(String(payment.status || ''))) {
            continue;
        }
        const created = dateMs(payment.created_at ||
            payment.updated_at);
        if (!created ||
            created > cutoff) {
            continue;
        }
        const result = await cleanupWalletTopup(paymentDoc.id);
        if (result.cleaned) {
            cleanedTopups +=
                1;
        }
    }
    return {
        cutoffDays: AUTO_DELETE_AFTER_DAYS,
        cleanedOrders,
        skippedOrders,
        cleanedTopups,
    };
};
let cleanupTimer = null;
export const startAbandonedCleanupScheduler = () => {
    if (cleanupTimer) {
        return;
    }
    const run = async () => {
        try {
            const result = await runAbandonedCleanup();
            console.log('Abandoned cleanup completed:', result);
        }
        catch (error) {
            console.error('Abandoned cleanup failed:', error);
        }
    };
    /*
     * Run shortly after boot, then every 6 hours.
     */
    setTimeout(() => {
        void run();
    }, 15_000);
    cleanupTimer =
        setInterval(() => {
            void run();
        }, 6 *
            60 *
            60 *
            1000);
};

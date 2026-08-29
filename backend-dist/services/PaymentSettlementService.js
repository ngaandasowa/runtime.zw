import { adminDb, } from '../firebaseAdmin.js';
import { fulfillPaidOrder, } from './OrderFulfillmentService.js';
/*
 * ----------------------------------------------------------
 * PAYMENT SETTLEMENT
 * ----------------------------------------------------------
 *
 * One authoritative path for:
 *
 *   Payment -> verified
 *   Order   -> paid
 *   Order   -> fulfillment
 *
 * Providers are responsible only for proving that money was
 * received. Once that proof exists, they call this service.
 *
 * The transaction makes settlement idempotent: repeated
 * PesePay callbacks/browser checks cannot charge or fulfill
 * the order twice.
 */
export const settleOrderPayment = async ({ paymentId, actor, providerStatus, providerStatusDescription, transactionId, }) => {
    const paymentRef = adminDb
        .collection('payments')
        .doc(paymentId);
    const now = new Date().toISOString();
    return adminDb.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error('Payment not found.');
        }
        const payment = paymentDoc.data();
        const orderId = String(payment.order_id || '').trim();
        if (!orderId) {
            throw new Error('Payment is not linked to an order.');
        }
        const orderRef = adminDb
            .collection('orders')
            .doc(orderId);
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new Error('Order linked to payment was not found.');
        }
        const order = orderDoc.data();
        if (order.status ===
            'cancelled' ||
            order.status ===
                'refunded') {
            throw new Error('This order can no longer be marked paid.');
        }
        const alreadySettled = payment.status ===
            'verified' &&
            (order.status ===
                'paid' ||
                order.status ===
                    'completed');
        /*
         * Merge provider metadata instead of replacing it.
         * This keeps the service reusable for manual EcoCash
         * and Runtime Credit, where some provider fields may
         * not exist.
         */
        transaction.set(paymentRef, {
            status: 'verified',
            ...(providerStatus
                ? {
                    provider_status: providerStatus,
                }
                : {}),
            ...(providerStatusDescription !==
                undefined
                ? {
                    provider_status_description: providerStatusDescription,
                }
                : {}),
            ...(transactionId
                ? {
                    transaction_id: transactionId,
                }
                : {}),
            verified_at: payment.verified_at ||
                now,
            rejection_reason: null,
            updated_at: now,
        }, { merge: true });
        if (order.status !==
            'paid' &&
            order.status !==
                'completed') {
            transaction.set(orderRef, {
                status: 'paid',
                paid_at: order.paid_at ||
                    now,
                updated_at: now,
            }, { merge: true });
        }
        /*
         * Fulfillment is itself expected to be idempotent.
         * Calling it here means every future provider gets
         * identical post-payment behaviour.
         */
        const fulfillment = await fulfillPaidOrder({
            transaction,
            orderRef,
            order,
            paymentId,
            now,
            actor,
        });
        return {
            paymentId,
            orderId,
            alreadySettled,
            fulfillment,
        };
    });
};

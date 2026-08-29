import { adminDb, } from '../firebaseAdmin.js';
import { fulfillPaidOrder, } from './OrderFulfillmentService.js';
const money = (value) => Math.round((Number(value) + Number.EPSILON) *
    100) / 100;
/*
 * ----------------------------------------------------------
 * PAYMENT SETTLEMENT
 * ----------------------------------------------------------
 *
 * Supports both full and split payments.
 *
 * Example:
 *   Order total       $16
 *   Runtime Credit    $10 verified
 *   PesePay            $6 verified
 *   ----------------------
 *   Amount paid       $16 -> order paid + fulfillment
 *
 * A provider payment is verified independently, but the order
 * is only marked paid when verified order payments collectively
 * cover the order total.
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
        const paymentQuery = adminDb
            .collection('payments')
            .where('order_id', '==', orderId);
        const [orderDoc, paymentSnapshot,] = await Promise.all([
            transaction.get(orderRef),
            transaction.get(paymentQuery),
        ]);
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
        const orderTotal = money(Number(order.total || 0));
        if (!Number.isFinite(orderTotal) ||
            orderTotal <= 0) {
            throw new Error('Order has an invalid total.');
        }
        const otherVerifiedTotal = paymentSnapshot.docs
            .filter((doc) => doc.id !==
            paymentId &&
            doc.data().status ===
                'verified')
            .reduce((total, doc) => total +
            Number(doc.data().amount ||
                0), 0);
        const currentAmount = money(Number(payment.amount || 0));
        if (!Number.isFinite(currentAmount) ||
            currentAmount <= 0) {
            throw new Error('Payment has an invalid amount.');
        }
        const amountPaid = money(Math.min(orderTotal, otherVerifiedTotal +
            currentAmount));
        const amountDue = money(Math.max(0, orderTotal -
            amountPaid));
        const fullyPaid = amountDue <= 0;
        const alreadySettled = payment.status ===
            'verified' &&
            (fullyPaid
                ? (order.status ===
                    'paid' ||
                    order.status ===
                        'completed')
                : order.status ===
                    'payment_pending');
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
                    paymentId,
                    now,
                    actor,
                    preloadedDomainDoc: fulfillmentDomainDoc,
                });
        }
        return {
            paymentId,
            orderId,
            alreadySettled,
            fullyPaid,
            amountPaid,
            amountDue,
            fulfillment,
        };
    });
};

import { adminDb, } from '../firebaseAdmin.js';
/*
 * ----------------------------------------------------------
 * ORDER FULFILLMENT
 * ----------------------------------------------------------
 *
 * Payment code should only settle money and mark an order
 * paid. What the customer bought belongs here.
 *
 * This first extraction intentionally preserves Runtime's
 * current domain-registration behaviour without attempting
 * to migrate renewals/cloud/credits at the same time.
 */
const getPrimaryItemType = (order) => String(order.items?.[0]?.item_type ||
    order.metadata?.purpose ||
    '')
    .trim()
    .toLowerCase();
const fulfillDomainRegistration = async ({ transaction, orderRef, paymentId, now, actor = 'Runtime', }) => {
    const domainQuery = adminDb
        .collection('domains')
        .where('order_id', '==', orderRef.id)
        .limit(1);
    const domainSnapshot = await transaction.get(domainQuery);
    if (domainSnapshot.empty) {
        /*
         * Do not fail payment settlement just because the
         * resource is not available yet. The paid order is
         * authoritative and can be fulfilled/retried later.
         */
        return {
            handled: false,
            itemType: 'domain_registration',
        };
    }
    const domainDoc = domainSnapshot.docs[0];
    const domain = domainDoc.data();
    const existingHistory = Array.isArray(domain.history)
        ? domain.history
        : [];
    const historyDescription = 'Payment verified. Domain registration is now being processed.';
    const alreadyRecorded = existingHistory.some((item) => item?.description ===
        historyDescription ||
        item?.description ===
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
                    id: `hist-payment-${paymentId.slice(0, 8)}`,
                    domain_id: domainDoc.id,
                    action: 'STATUS_CHANGE',
                    description: historyDescription,
                    status: 'pending_registration',
                    actor,
                    created_at: now,
                },
            ],
    }, { merge: true });
    return {
        handled: true,
        itemType: 'domain_registration',
        resourceType: 'domain',
        resourceId: domainDoc.id,
    };
};
export const fulfillPaidOrder = async (input) => {
    const itemType = getPrimaryItemType(input.order);
    switch (itemType) {
        case 'domain_registration':
            return fulfillDomainRegistration(input);
        /*
         * These will be migrated one-by-one onto this
         * fulfillment layer. Until then, do not invent
         * behaviour or alter their existing flows.
         */
        case 'domain_renewal':
        case 'domain_transfer':
        case 'cloud_compute':
        case 'database':
        case 'storage':
        case 'application_hosting':
        case 'api_usage':
            return {
                handled: false,
                itemType,
            };
        default:
            /*
             * Backward compatibility for older Runtime domain
             * orders that may not yet contain item_type.
             */
            return fulfillDomainRegistration(input);
    }
};

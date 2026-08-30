import { randomUUID } from 'node:crypto';
import { adminDb, } from '../firebaseAdmin.js';
import { emailService, } from '../email/emailService.js';
const DAY_MS = 24 * 60 * 60 * 1000;
const dateOnlyUtc = (value) => {
    const parsed = value instanceof Date
        ? new Date(value)
        : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid lifecycle date.');
    }
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};
const dayDifference = (simulatedDate, expiryDate) => Math.round((simulatedDate.getTime() -
    expiryDate.getTime()) / DAY_MS);
const milestoneFor = (daysFromExpiry) => {
    switch (daysFromExpiry) {
        case -60:
            return 'd60';
        case -30:
            return 'd30';
        case -14:
            return 'd14';
        case -7:
            return 'd7';
        case 0:
            return 'd0';
        case 7:
            return 'dplus7';
        default:
            return undefined;
    }
};
const renewalOrderId = (domainId, expiresAt) => {
    const expiryKey = dateOnlyUtc(expiresAt)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
    return `renewal-${domainId}-${expiryKey}`;
};
const renewalReference = (domainId, expiresAt) => {
    const compact = domainId
        .replace(/[^a-z0-9]/gi, '')
        .slice(-6)
        .toUpperCase();
    const expiryKey = dateOnlyUtc(expiresAt)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
    return `RT-REN-${expiryKey}-${compact}`;
};
const getCustomerName = async (userId, fallback) => {
    if (!userId) {
        return fallback;
    }
    const snapshot = await adminDb
        .collection('users')
        .doc(userId)
        .get();
    if (!snapshot.exists) {
        return fallback;
    }
    return String(snapshot.data()?.name ||
        fallback ||
        '').trim() || undefined;
};
const eventAlreadyDone = (domain, milestone) => Boolean(domain.renewal_lifecycle?.events?.[milestone]
    ?.completed_at);
const markEvent = async (domainRef, milestone, simulatedDate, extra = {}) => {
    await domainRef.set({
        renewal_lifecycle: {
            events: {
                [milestone]: {
                    completed_at: new Date().toISOString(),
                    simulated_for: simulatedDate.toISOString(),
                    ...extra,
                },
            },
        },
        updated_at: new Date().toISOString(),
    }, { merge: true });
};
const findRenewalOrder = async (domainId, expiresAt) => {
    const orderId = renewalOrderId(domainId, expiresAt);
    const orderRef = adminDb
        .collection('orders')
        .doc(orderId);
    const orderDoc = await orderRef.get();
    return {
        orderId,
        orderRef,
        orderDoc,
        order: orderDoc.exists
            ? orderDoc.data()
            : undefined,
    };
};
const createRenewalOrder = async (domainRef, domain, simulatedDate) => {
    const expiresAt = String(domain.expires_at || '');
    const { orderId, orderRef, orderDoc, } = await findRenewalOrder(domainRef.id, expiresAt);
    if (orderDoc.exists) {
        return {
            orderId,
            created: false,
            order: orderDoc.data(),
        };
    }
    const yearlyRate = Number(domain.renewal_price || 0);
    if (!Number.isFinite(yearlyRate) ||
        yearlyRate <= 0) {
        throw new Error(`Renewal pricing is unavailable for ${domain.domain_name}.`);
    }
    const now = new Date().toISOString();
    const reference = renewalReference(domainRef.id, expiresAt);
    const itemId = `item-${randomUUID()}`;
    const order = {
        id: orderId,
        user_id: String(domain.user_id || ''),
        user_email: String(domain.user_email || ''),
        reference,
        subtotal: yearlyRate,
        discount: 0,
        total: yearlyRate,
        currency: String(domain.currency || 'USD'),
        status: 'pending',
        purpose: 'domain_renewal',
        domain_id: domainRef.id,
        renewal_years: 1,
        lifecycle_generated: true,
        lifecycle_expiry_date: expiresAt,
        created_at: now,
        updated_at: now,
        items: [
            {
                id: itemId,
                order_id: orderId,
                item_type: 'domain_registration',
                reference_id: String(domain.domain_name || ''),
                description: `Domain Renewal: ${domain.domain_name} (1 Year @ $${yearlyRate.toFixed(2)}/yr)`,
                quantity: 1,
                unit_price: yearlyRate,
                total: yearlyRate,
            },
        ],
    };
    await adminDb.runTransaction(async (transaction) => {
        const latestOrder = await transaction.get(orderRef);
        if (!latestOrder.exists) {
            transaction.set(orderRef, order);
        }
        transaction.set(domainRef, {
            renewal_lifecycle: {
                state: 'invoice_created',
                renewal_order_id: orderId,
                renewal_expiry_date: expiresAt,
            },
            updated_at: now,
        }, { merge: true });
    });
    return {
        orderId,
        created: true,
        order,
    };
};
export class RenewalLifecycleService {
    async run(simulatedDateInput) {
        const simulatedDate = dateOnlyUtc(simulatedDateInput);
        const domainsSnapshot = await adminDb
            .collection('domains')
            .get();
        const results = [];
        for (const domainDoc of domainsSnapshot.docs) {
            const domain = domainDoc.data();
            if (!domain.expires_at ||
                ![
                    'active',
                    'expired',
                ].includes(String(domain.status))) {
                continue;
            }
            let expiryDate;
            try {
                expiryDate =
                    dateOnlyUtc(String(domain.expires_at));
            }
            catch {
                continue;
            }
            const daysFromExpiry = dayDifference(simulatedDate, expiryDate);
            const milestone = milestoneFor(daysFromExpiry);
            if (!milestone) {
                continue;
            }
            if (eventAlreadyDone(domain, milestone)) {
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    action: 'already_processed',
                });
                continue;
            }
            const name = await getCustomerName(domain.user_id, domain.owner_details
                ?.full_name);
            const baseEmailData = {
                email: String(domain.user_email),
                name,
                domainName: String(domain.domain_name),
                amount: Number(domain.renewal_price || 0),
                years: 1,
                renewalDate: String(domain.expires_at),
            };
            if (milestone === 'd60' ||
                milestone === 'd30') {
                const event = milestone === 'd60'
                    ? 'domain_expiry_60_day'
                    : 'domain_expiry_30_day';
                await emailService.sendEvent(event, baseEmailData);
                await markEvent(domainDoc.ref, milestone, simulatedDate);
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    action: `sent_${milestone}_reminder`,
                });
                continue;
            }
            if (milestone === 'd14') {
                const created = await createRenewalOrder(domainDoc.ref, domain, simulatedDate);
                await emailService.sendEvent('renewal_order_created', {
                    ...baseEmailData,
                    orderReference: String(created.order.reference),
                });
                await markEvent(domainDoc.ref, 'd14', simulatedDate, { order_id: created.orderId });
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    orderId: created.orderId,
                    action: created.created
                        ? 'renewal_order_created'
                        : 'renewal_order_already_exists',
                });
                continue;
            }
            const renewal = await findRenewalOrder(domainDoc.id, String(domain.expires_at));
            const orderPaid = renewal.order?.status ===
                'paid';
            if (orderPaid) {
                await markEvent(domainDoc.ref, milestone, simulatedDate, {
                    skipped: 'renewal_order_paid',
                    order_id: renewal.orderId,
                });
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    orderId: renewal.orderId,
                    action: 'skipped_paid_renewal',
                });
                continue;
            }
            if (milestone === 'd7') {
                if (!renewal.order) {
                    results.push({
                        domainId: domainDoc.id,
                        domainName: String(domain.domain_name),
                        daysFromExpiry,
                        milestone,
                        action: 'no_renewal_order_to_remind',
                    });
                    continue;
                }
                await emailService.sendEvent('domain_renewal_payment_reminder', {
                    ...baseEmailData,
                    orderReference: String(renewal.order.reference),
                });
                await markEvent(domainDoc.ref, milestone, simulatedDate, {
                    order_id: renewal.orderId,
                });
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    orderId: renewal.orderId,
                    action: 'sent_unpaid_renewal_reminder',
                });
                continue;
            }
            if (milestone === 'd0') {
                const now = new Date().toISOString();
                await domainDoc.ref.set({
                    status: 'expired',
                    renewal_lifecycle: {
                        state: 'expired',
                        renewal_order_id: renewal.orderId,
                    },
                    updated_at: now,
                }, { merge: true });
                const graceEndsAt = new Date(expiryDate.getTime() +
                    7 * DAY_MS).toISOString();
                await emailService.sendEvent('domain_expired', {
                    ...baseEmailData,
                    orderReference: renewal.order
                        ?.reference,
                    graceEndsAt,
                });
                await markEvent(domainDoc.ref, 'd0', simulatedDate, { order_id: renewal.orderId });
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    orderId: renewal.orderId,
                    action: 'marked_expired_and_notified',
                });
                continue;
            }
            if (milestone === 'dplus7') {
                const now = new Date().toISOString();
                await domainDoc.ref.set({
                    status: 'expired',
                    renewal_lifecycle: {
                        state: 'grace_period_ended',
                        renewal_order_id: renewal.orderId,
                    },
                    updated_at: now,
                }, { merge: true });
                await emailService.sendEvent('domain_grace_period_ended', {
                    ...baseEmailData,
                    orderReference: renewal.order
                        ?.reference,
                });
                await markEvent(domainDoc.ref, 'dplus7', simulatedDate, { order_id: renewal.orderId });
                results.push({
                    domainId: domainDoc.id,
                    domainName: String(domain.domain_name),
                    daysFromExpiry,
                    milestone,
                    orderId: renewal.orderId,
                    action: 'grace_period_ended_and_notified',
                });
            }
        }
        return {
            simulatedDate: simulatedDate.toISOString(),
            scanned: domainsSnapshot.size,
            matched: results.length,
            results,
        };
    }
}
export const renewalLifecycleService = new RenewalLifecycleService();

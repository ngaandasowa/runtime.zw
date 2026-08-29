import {
  adminDb,
} from '../firebaseAdmin.js';

type FulfillmentTransaction =
  FirebaseFirestore.Transaction;

type FulfillPaidOrderInput = {
  transaction:
    FulfillmentTransaction;
  orderRef:
    FirebaseFirestore.DocumentReference;
  order:
    FirebaseFirestore.DocumentData;
  paymentId: string;
  now: string;
  actor?: string;
};

export type OrderFulfillmentResult = {
  handled: boolean;
  itemType: string;
  resourceType?: 'domain';
  resourceId?: string;
};

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

const getPrimaryItemType = (
  order: FirebaseFirestore.DocumentData
) =>
  String(
    order.purpose ||
      order.metadata?.purpose ||
      order.items?.[0]?.item_type ||
      ''
  )
    .trim()
    .toLowerCase();

const fulfillDomainRegistration =
  async ({
    transaction,
    orderRef,
    paymentId,
    now,
    actor = 'Runtime',
  }: FulfillPaidOrderInput):
    Promise<OrderFulfillmentResult> => {
    const domainQuery =
      adminDb
        .collection('domains')
        .where(
          'order_id',
          '==',
          orderRef.id
        )
        .limit(1);

    const domainSnapshot =
      await transaction.get(
        domainQuery
      );

    if (domainSnapshot.empty) {
      /*
       * Do not fail payment settlement just because the
       * resource is not available yet. The paid order is
       * authoritative and can be fulfilled/retried later.
       */
      return {
        handled: false,
        itemType:
          'domain_registration',
      };
    }

    const domainDoc =
      domainSnapshot.docs[0];

    const domain =
      domainDoc.data();

    const existingHistory =
      Array.isArray(
        domain.history
      )
        ? domain.history
        : [];

    const historyDescription =
      'Payment verified. Domain registration is now being processed.';

    const alreadyRecorded =
      existingHistory.some(
        (item: any) =>
          item?.description ===
            historyDescription ||
          item?.description ===
            'PesePay payment verified. Domain registration is now being processed.'
      );

    transaction.set(
      domainDoc.ref,
      {
        status:
          domain.status ===
          'pending_payment'
            ? 'pending_registration'
            : domain.status,
        payment_id:
          paymentId,
        updated_at:
          now,
        history:
          alreadyRecorded
            ? existingHistory
            : [
                ...existingHistory,
                {
                  id:
                    `hist-payment-${paymentId.slice(
                      0,
                      8
                    )}`,
                  domain_id:
                    domainDoc.id,
                  action:
                    'STATUS_CHANGE',
                  description:
                    historyDescription,
                  status:
                    'pending_registration',
                  actor,
                  created_at:
                    now,
                },
              ],
      },
      { merge: true }
    );

    return {
      handled: true,
      itemType:
        'domain_registration',
      resourceType:
        'domain',
      resourceId:
        domainDoc.id,
    };
  };


const fulfillDomainRenewal =
  async ({
    transaction,
    order,
    paymentId,
    now,
    actor = 'Runtime',
  }: FulfillPaidOrderInput):
    Promise<OrderFulfillmentResult> => {
    const domainId =
      String(
        order.domain_id ||
        order.metadata?.domain_id ||
        ''
      ).trim();

    if (!domainId) {
      return {
        handled: false,
        itemType: 'domain_renewal',
      };
    }

    const domainRef =
      adminDb
        .collection('domains')
        .doc(domainId);

    const domainDoc =
      await transaction.get(
        domainRef
      );

    if (!domainDoc.exists) {
      return {
        handled: false,
        itemType: 'domain_renewal',
      };
    }

    const domain =
      domainDoc.data()!;

    const existingHistory =
      Array.isArray(domain.history)
        ? domain.history
        : [];

    /*
     * Settlement can be reached more than once (for example,
     * callback + browser verification). The payment ID is the
     * idempotency key: one paid renewal payment extends the
     * domain exactly once.
     */
    const historyId =
      `hist-renewal-${paymentId.slice(0, 12)}`;

    const alreadyRenewed =
      existingHistory.some(
        (item: any) =>
          item?.id === historyId ||
          item?.payment_id === paymentId
      );

    if (alreadyRenewed) {
      return {
        handled: true,
        itemType: 'domain_renewal',
        resourceType: 'domain',
        resourceId: domainDoc.id,
      };
    }

    const years =
      Math.max(
        1,
        Number(
          order.renewal_years ||
          order.metadata?.renewal_years ||
          order.items?.[0]?.quantity ||
          1
        ) || 1
      );

    const currentTime =
      new Date(now);

    const existingExpiry =
      domain.expires_at
        ? new Date(domain.expires_at)
        : null;

    const baseDate =
      existingExpiry &&
      !Number.isNaN(
        existingExpiry.getTime()
      ) &&
      existingExpiry.getTime() >
        currentTime.getTime()
        ? new Date(existingExpiry)
        : new Date(currentTime);

    const newExpiry =
      new Date(baseDate);

    newExpiry.setFullYear(
      newExpiry.getFullYear() +
      years
    );

    transaction.set(
      domainRef,
      {
        status: 'active',
        expires_at:
          newExpiry.toISOString(),
        updated_at: now,
        history: [
          ...existingHistory,
          {
            id: historyId,
            domain_id: domainDoc.id,
            action: 'RENEWAL',
            description:
              `Renewal payment confirmed. Domain renewed for ${years} ${
                years === 1
                  ? 'year'
                  : 'years'
              }.`,
            status: 'confirmed',
            actor,
            payment_id: paymentId,
            created_at: now,
          },
        ],
      },
      { merge: true }
    );

    return {
      handled: true,
      itemType: 'domain_renewal',
      resourceType: 'domain',
      resourceId: domainDoc.id,
    };
  };

export const fulfillPaidOrder =
  async (
    input: FulfillPaidOrderInput
  ): Promise<OrderFulfillmentResult> => {
    const itemType =
      getPrimaryItemType(
        input.order
      );

    switch (itemType) {
      case 'domain_registration':
        return fulfillDomainRegistration(
          input
        );

      /*
       * These will be migrated one-by-one onto this
       * fulfillment layer. Until then, do not invent
       * behaviour or alter their existing flows.
       */
      case 'domain_renewal':
        return fulfillDomainRenewal(
          input
        );

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
        return fulfillDomainRegistration(
          input
        );
    }
  };

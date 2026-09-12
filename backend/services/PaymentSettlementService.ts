import {
  adminDb,
} from '../firebaseAdmin.js';

import {
  fulfillPaidOrder,
} from './OrderFulfillmentService.js';

import {
  emailService,
} from '../email/emailService.js';

export type SettleOrderPaymentInput = {
  paymentId: string;
  actor: string;
  providerStatus?: string;
  providerStatusDescription?: string;
  transactionId?: string;
};

export type SettleOrderPaymentResult = {
  paymentId: string;
  orderId: string;
  alreadySettled: boolean;
  fullyPaid: boolean;
  amountPaid: number;
  amountDue: number;
  fulfillment: {
    handled: boolean;
    itemType: string;
    resourceType?: 'domain';
    resourceId?: string;
  };
};

const money = (
  value: number
) =>
  Math.round(
    (Number(value) + Number.EPSILON) *
      100
  ) / 100;


const paymentMethodLabel = (gateway: unknown) => {
  const value = String(gateway || '').trim().toLowerCase();
  if (value === 'runtime_credit') return 'Runtime Credit';
  if (value === 'pesepay') return 'PesePay';
  if (value === 'ecocash_usd') return 'EcoCash USD';
  return value
    ? value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Payment';
};

const orderServiceName = (order: FirebaseFirestore.DocumentData) => {
  const item = Array.isArray(order.items) ? order.items[0] : undefined;
  const itemType = String(order.purpose || order.metadata?.purpose || item?.item_type || '').trim().toLowerCase();
  if (itemType === 'domain_registration') return 'Domain registration';
  if (itemType === 'domain_renewal') return 'Domain renewal';
  if (itemType === 'domain_transfer') return 'Domain transfer';
  return String(item?.name || item?.description || order.service_name || 'Runtime service').trim();
};

const orderDomainName = (order: FirebaseFirestore.DocumentData) => {
  const item = Array.isArray(order.items) ? order.items[0] : undefined;
  return String(order.domain_name || order.metadata?.domain_name || item?.domain_name || item?.reference_id || '').trim();
};

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
export const settleOrderPayment =
  async ({
    paymentId,
    actor,
    providerStatus,
    providerStatusDescription,
    transactionId,
  }: SettleOrderPaymentInput):
    Promise<SettleOrderPaymentResult> => {
    const paymentRef =
      adminDb
        .collection('payments')
        .doc(paymentId);

    const now =
      new Date().toISOString();

    const result =
      await adminDb.runTransaction(
      async (transaction) => {
        const paymentDoc =
          await transaction.get(
            paymentRef
          );

        if (!paymentDoc.exists) {
          throw new Error(
            'Payment not found.'
          );
        }

        const payment =
          paymentDoc.data()!;

        const orderId =
          String(
            payment.order_id || ''
          ).trim();

        if (!orderId) {
          throw new Error(
            'Payment is not linked to an order.'
          );
        }

        const orderRef =
          adminDb
            .collection('orders')
            .doc(orderId);

        const paymentQuery =
          adminDb
            .collection('payments')
            .where(
              'order_id',
              '==',
              orderId
            );

        const [
          orderDoc,
          paymentSnapshot,
        ] =
          await Promise.all([
            transaction.get(
              orderRef
            ),
            transaction.get(
              paymentQuery
            ),
          ]);

        if (!orderDoc.exists) {
          throw new Error(
            'Order linked to payment was not found.'
          );
        }

        const order =
          orderDoc.data()!;

        if (
          order.status ===
            'cancelled' ||
          order.status ===
            'refunded'
        ) {
          throw new Error(
            'This order can no longer be marked paid.'
          );
        }

        const orderTotal =
          money(
            Number(
              order.total || 0
            )
          );

        if (
          !Number.isFinite(orderTotal) ||
          orderTotal <= 0
        ) {
          throw new Error(
            'Order has an invalid total.'
          );
        }

        const otherVerifiedTotal =
          paymentSnapshot.docs
            .filter(
              (doc) =>
                doc.id !==
                  paymentId &&
                doc.data().status ===
                  'verified'
            )
            .reduce(
              (
                total,
                doc
              ) =>
                total +
                Number(
                  doc.data().amount ||
                  0
                ),
              0
            );

        const currentAmount =
          money(
            Number(
              payment.amount || 0
            )
          );

        if (
          !Number.isFinite(currentAmount) ||
          currentAmount <= 0
        ) {
          throw new Error(
            'Payment has an invalid amount.'
          );
        }

        const amountPaid =
          money(
            Math.min(
              orderTotal,
              otherVerifiedTotal +
                currentAmount
            )
          );

        const amountDue =
          money(
            Math.max(
              0,
              orderTotal -
                amountPaid
            )
          );

        const fullyPaid =
          amountDue <= 0;

        const alreadySettled =
          payment.status ===
            'verified' &&
          (
            fullyPaid
              ? (
                  order.status ===
                    'paid' ||
                  order.status ===
                    'completed'
                )
              : order.status ===
                  'payment_pending'
          );


        /*
         * Firestore requires every transaction read to happen
         * before the first write. Fulfillment may need a domain
         * document, so preload it now and pass it into
         * fulfillPaidOrder later.
         */
        const itemType =
          String(
            order.purpose ||
              order.metadata?.purpose ||
              order.items?.[0]?.item_type ||
              ''
          )
            .trim()
            .toLowerCase();

        let fulfillmentDomainDoc:
          FirebaseFirestore.QueryDocumentSnapshot |
          FirebaseFirestore.DocumentSnapshot |
          null = null;

        if (
          fullyPaid &&
          itemType ===
            'domain_renewal'
        ) {
          const domainId =
            String(
              order.domain_id ||
                order.metadata?.domain_id ||
                ''
            ).trim();

          if (domainId) {
            fulfillmentDomainDoc =
              await transaction.get(
                adminDb
                  .collection('domains')
                  .doc(domainId)
              );
          }
        } else if (fullyPaid) {
          const domainSnapshot =
            await transaction.get(
              adminDb
                .collection('domains')
                .where(
                  'order_id',
                  '==',
                  orderRef.id
                )
                .limit(1)
            );

          fulfillmentDomainDoc =
            domainSnapshot.empty
              ? null
              : domainSnapshot.docs[0];
        }

        transaction.set(
          paymentRef,
          {
            status:
              'verified',
            ...(providerStatus
              ? {
                  provider_status:
                    providerStatus,
                }
              : {}),
            ...(providerStatusDescription !==
            undefined
              ? {
                  provider_status_description:
                    providerStatusDescription,
                }
              : {}),
            ...(transactionId
              ? {
                  transaction_id:
                    transactionId,
                }
              : {}),
            verified_at:
              payment.verified_at ||
              now,
            rejection_reason:
              null,
            updated_at:
              now,
          },
          { merge: true }
        );

        transaction.set(
          orderRef,
          {
            status:
              fullyPaid
                ? 'paid'
                : 'payment_pending',
            amount_paid:
              amountPaid,
            amount_due:
              amountDue,
            ...(fullyPaid
              ? {
                  paid_at:
                    order.paid_at ||
                    now,
                }
              : {}),
            updated_at:
              now,
          },
          { merge: true }
        );

        let fulfillment = {
          handled: false,
          itemType:
            String(
              order.purpose ||
                order.metadata
                  ?.purpose ||
                order.items?.[0]
                  ?.item_type ||
                ''
            ),
        } as SettleOrderPaymentResult[
          'fulfillment'
        ];

        if (fullyPaid) {
          fulfillment =
            await fulfillPaidOrder({
              transaction,
              orderRef,
              order,
              paymentId,
              now,
              actor,
              preloadedDomainDoc:
                fulfillmentDomainDoc,
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
      }
    );

    if (!result.alreadySettled) {
      try {
        const [settledPaymentDoc, settledOrderDoc, allPaymentDocs] = await Promise.all([
          paymentRef.get(),
          adminDb.collection('orders').doc(result.orderId).get(),
          adminDb.collection('payments').where('order_id', '==', result.orderId).get(),
        ]);
        const settledPayment = settledPaymentDoc.exists ? settledPaymentDoc.data()! : {};
        const settledOrder = settledOrderDoc.exists ? settledOrderDoc.data()! : {};
        const userId = String(settledOrder.user_id || settledPayment.user_id || '').trim();
        const userDoc = userId ? await adminDb.collection('users').doc(userId).get() : null;
        const user = userDoc?.exists ? userDoc.data()! : {};
        const email = String(settledOrder.user_email || settledPayment.user_email || user.email || '').trim();
        if (email) {
          const verifiedPayments = allPaymentDocs.docs
            .filter((doc) => doc.data().status === 'verified')
            .map((doc) => ({ id: doc.id, ...doc.data() }));
          const runtimeCreditApplied = money(verifiedPayments
            .filter((item: any) => item.gateway === 'runtime_credit')
            .reduce((total: number, item: any) => total + Number(item.amount || 0), 0));
          const paymentBreakdown = verifiedPayments
            .map((item: any) => `${paymentMethodLabel(item.gateway)}: $${Number(item.amount || 0).toFixed(2)} USD`)
            .join(' + ');
          const domainName = orderDomainName(settledOrder);
          await emailService.sendEvent('payment_received', {
            email,
            name: String(user.name || settledOrder.customer_name || '').trim() || undefined,
            orderReference: String(settledOrder.reference || result.orderId),
            paymentReference: String(settledPayment.reference || paymentId),
            domainName: domainName || undefined,
            serviceName: orderServiceName(settledOrder),
            amount: Number(settledPayment.amount || 0),
            paymentMethod: paymentMethodLabel(settledPayment.gateway),
            transactionId: String(settledPayment.transaction_id || settledPayment.provider_reference || transactionId || '').trim() || undefined,
            creditApplied: runtimeCreditApplied > 0 ? runtimeCreditApplied : undefined,
            orderTotal: Number(settledOrder.total || 0),
            amountPaid: result.amountPaid,
            amountRemaining: result.amountDue,
            paymentBreakdown: paymentBreakdown || undefined,
          });
        }
      } catch (error) {
        console.error('Payment receipt email failed:', error);
      }
    }

    return result;
  };

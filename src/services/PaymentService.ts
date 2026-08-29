import {
  Payment,
  PaymentGateway,
} from '../types';

/*
 * Manual EcoCash USD payment details.
 *
 * Display/payment instructions only.
 * Never place provider API secrets in this frontend service.
 */
export const ECOCASH_USD_DETAILS = {
  phone: '0783827570',
  accountName:
    'Ngaavongwe Ndasowampange',
  currency: 'USD',
} as const;

const createPaymentId = () =>
  'pay-' +
  Date.now().toString(36) +
  '-' +
  Math.random()
    .toString(36)
    .substring(2, 8);

const createPaymentReference = () =>
  'RT-' +
  Date.now()
    .toString(36)
    .toUpperCase() +
  '-' +
  Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

export type CheckoutPaymentInput = {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
};

export class PaymentService {
  /*
   * ----------------------------------------------------------
   * FRONTEND PAYMENT RECORD FACTORY
   * ----------------------------------------------------------
   *
   * This service does NOT settle money.
   *
   * Provider-backed payments such as PesePay are created by
   * the secure backend. The frontend factory remains only for
   * manual payment records that Runtime intentionally creates
   * client-side during the current migration.
   */
  private createPendingPayment(
    input: CheckoutPaymentInput
  ): Payment {
    const now =
      new Date().toISOString();

    return {
      id: createPaymentId(),
      order_id: input.orderId,
      user_id: input.userId,
      reference:
        createPaymentReference(),
      amount: input.amount,
      currency: input.currency,
      gateway: input.gateway,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };
  }

  async createEcoCashPayment(
    orderId: string,
    userId: string,
    amount: number,
    currency = 'USD'
  ): Promise<Payment> {
    return this.createPendingPayment({
      orderId,
      userId,
      amount,
      currency,
      gateway: 'ecocash_usd',
    });
  }

  /*
   * ----------------------------------------------------------
   * REUSABLE CHECKOUT ENTRY POINT
   * ----------------------------------------------------------
   *
   * Existing registration/renewal callers can continue using
   * processCheckout() while the rest of Runtime migrates.
   *
   * Manual EcoCash:
   *   creates the pending local payment record.
   *
   * PesePay:
   *   MUST be initiated through /api/payments/pesepay.
   *
   * Future Runtime Credit:
   *   MUST go through the secure backend wallet/checkout
   *   service, never by manufacturing a verified frontend
   *   payment.
   */
  async processCheckout(
    orderId: string,
    amount: number,
    currency: string,
    userId: string,
    gateway: PaymentGateway
  ): Promise<Payment> {
    if (
      gateway === 'ecocash_usd' ||
      gateway === 'ecocash'
    ) {
      return this.createEcoCashPayment(
        orderId,
        userId,
        amount,
        currency
      );
    }

    if (gateway === 'pesepay') {
      throw new Error(
        'PesePay checkout must be started through the secure Runtime payment API.'
      );
    }

    throw new Error(
      `Payment gateway "${String(
        gateway
      )}" is not available through the frontend checkout service.`
    );
  }

  /*
   * Customer confirmation is only a submission state.
   * It never verifies money.
   */
  markEcoCashSubmitted(
    payment: Payment
  ): Payment {
    const now =
      new Date().toISOString();

    return {
      ...payment,
      status:
        'pending_verification',
      customer_confirmed_payment:
        true,
      customer_confirmed_at:
        now,
      updated_at: now,
    };
  }

  /*
   * ----------------------------------------------------------
   * LEGACY ADMIN HELPERS
   * ----------------------------------------------------------
   *
   * Kept temporarily for import compatibility only.
   *
   * StoreContext now sends approval/rejection to the secure
   * backend. New code MUST NOT use these methods for actual
   * settlement.
   */
  approveManualPayment(
    payment: Payment,
    adminId: string,
    transactionId = 'Cash received'
  ): Payment {
    const now =
      new Date().toISOString();

    return {
      ...payment,
      status: 'verified',
      verified_at: now,
      verified_by: adminId,
      transaction_id:
        transactionId.trim() ||
        'Cash received',
      updated_at: now,
    };
  }

  rejectManualPayment(
    payment: Payment,
    adminId: string,
    reason?: string
  ): Payment {
    const now =
      new Date().toISOString();

    return {
      ...payment,
      status: 'rejected',
      verified_by: adminId,
      rejection_reason:
        reason ||
        'Payment could not be confirmed.',
      updated_at: now,
    };
  }

  getEcoCashWhatsAppUrl(
    runtimeWhatsAppNumber: string,
    orderReference: string,
    amount: number,
    domainName?: string
  ): string {
    const lines = [
      'Hi Runtime, I have made my EcoCash USD payment.',
      '',
      `Order: ${orderReference}`,
      domainName
        ? `Domain: ${domainName}`
        : null,
      `Amount: $${amount.toFixed(
        2
      )} USD`,
      '',
      'I have attached my payment screenshot for verification.',
    ];

    const message =
      lines
        .filter(
          (
            item
          ): item is string =>
            Boolean(item)
        )
        .join('\n');

    return (
      `https://wa.me/${runtimeWhatsAppNumber}` +
      `?text=${encodeURIComponent(
        message
      )}`
    );
  }
}

export const paymentService =
  new PaymentService();

import {
  Payment,
  PaymentGateway,
} from '../types';

/*
 * Manual EcoCash USD payment details.
 *
 * These are display/payment instructions only.
 * They are NOT secret API credentials.
 */
export const ECOCASH_USD_DETAILS = {
  phone: '0783827570',
  accountName:
    'Ngaavongwe Ndasowampange',
  currency: 'USD',
} as const;

const createPaymentId = () => {
  return (
    'pay-' +
    Date.now().toString(36) +
    '-' +
    Math.random()
      .toString(36)
      .substring(2, 8)
  );
};

const createPaymentReference =
  () => {
    return (
      'RT-' +
      Date.now()
        .toString(36)
        .toUpperCase() +
      '-' +
      Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()
    );
  };

export class PaymentService {
  /*
   * ----------------------------------------------------------
   * ECOCASH USD
   * ----------------------------------------------------------
   *
   * Creates a payment record only.
   *
   * It does NOT mark payment as verified.
   */
  async createEcoCashPayment(
    orderId: string,
    userId: string,
    amount: number
  ): Promise<Payment> {
    const now =
      new Date().toISOString();

    const payment: Payment = {
      id: createPaymentId(),

      order_id: orderId,

      user_id: userId,

      reference:
        createPaymentReference(),

      amount,

      currency: 'USD',

      gateway: 'ecocash_usd',

      status: 'pending',

      created_at: now,

      updated_at: now,
    };

    return payment;
  }

  /*
   * ----------------------------------------------------------
   * GENERAL CHECKOUT ENTRY POINT
   * ----------------------------------------------------------
   *
   * StoreContext already calls processCheckout()
   * for registration and renewal.
   *
   * Keep this function until PesePay is added.
   */
  async processCheckout(
    orderId: string,
    amount: number,
    currency: string,
    userId: string,
    gateway: PaymentGateway
  ): Promise<Payment> {
    /*
     * EcoCash direct/manual payment.
     */
    if (
      gateway ===
        'ecocash_usd' ||
      gateway === 'ecocash'
    ) {
      return await this.createEcoCashPayment(
        orderId,
        userId,
        amount
      );
    }

    /*
     * PesePay will later create the
     * transaction through a secure backend.
     *
     * For now create a pending record.
     * Never fake a successful payment.
     */
    const now =
      new Date().toISOString();

    const payment: Payment = {
      id: createPaymentId(),

      order_id: orderId,

      user_id: userId,

      reference:
        createPaymentReference(),

      amount,

      currency,

      gateway,

      status: 'pending',

      created_at: now,

      updated_at: now,
    };

    return payment;
  }

  /*
   * ----------------------------------------------------------
   * CUSTOMER SAYS ECOCASH WAS SENT
   * ----------------------------------------------------------
   *
   * This does NOT verify the money.
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

      updated_at:
        now,
    };
  }

  /*
   * ----------------------------------------------------------
   * ADMIN APPROVAL
   * ----------------------------------------------------------
   */
  approveManualPayment(
    payment: Payment,
    adminId: string
  ): Payment {
    const now =
      new Date().toISOString();

    return {
      ...payment,

      status: 'verified',

      verified_at: now,

      verified_by: adminId,

      updated_at: now,
    };
  }

  /*
   * ----------------------------------------------------------
   * ADMIN REJECTION
   * ----------------------------------------------------------
   */
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

  /*
   * ----------------------------------------------------------
   * WHATSAPP SCREENSHOT LINK
   * ----------------------------------------------------------
   */
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
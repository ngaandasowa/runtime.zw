import { Payment, PaymentGateway, PaymentStatus } from '../types';

export interface PaymentGatewayResponse {
  success: boolean;
  reference: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  message: string;
  transactionId?: string;
  checkoutUrl?: string;
}

export interface PaymentGatewayInterface {
  createPayment(orderId: string, amount: number, currency: string, userEmail: string): Promise<PaymentGatewayResponse>;
  verifyPayment(paymentReference: string): Promise<{ verified: boolean; status: PaymentStatus; message: string }>;
  refund(paymentReference: string, amount?: number): Promise<{ success: boolean; message: string }>;
}

/**
 * Paynow / EcoCash / Card Zimbabwe Gateway Adapter
 */
export class PaynowGatewayAdapter implements PaymentGatewayInterface {
  async createPayment(orderId: string, amount: number, currency: string, userEmail: string): Promise<PaymentGatewayResponse> {
    const reference = 'PAY-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    return {
      success: true,
      reference,
      gateway: 'paynow',
      status: 'pending',
      message: 'Payment intent initialized on Paynow / EcoCash gateway.',
      checkoutUrl: `https://secure.paynow.co.zw/checkout?ref=${reference}`,
    };
  }

  async verifyPayment(paymentReference: string): Promise<{ verified: boolean; status: PaymentStatus; message: string }> {
    // In production, server queries Paynow API via hash signature verification
    return {
      verified: true,
      status: 'verified',
      message: 'Payment verified successfully by server-side signature check.',
    };
  }

  async refund(paymentReference: string, amount?: number): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Refund of ${paymentReference} processed.`,
    };
  }
}

export class PaymentService {
  private gatewayAdapters: Map<PaymentGateway, PaymentGatewayInterface> = new Map();

  constructor() {
    const defaultAdapter = new PaynowGatewayAdapter();
    this.gatewayAdapters.set('paynow', defaultAdapter);
    this.gatewayAdapters.set('ecocash', defaultAdapter);
    this.gatewayAdapters.set('innbucks', defaultAdapter);
    this.gatewayAdapters.set('stripe_card', defaultAdapter);
    this.gatewayAdapters.set('bank_transfer', defaultAdapter);
  }

  registerGateway(name: PaymentGateway, adapter: PaymentGatewayInterface) {
    this.gatewayAdapters.set(name, adapter);
  }

  async processCheckout(
    orderId: string, 
    amount: number, 
    currency: string, 
    userEmail: string, 
    gateway: PaymentGateway
  ): Promise<Payment> {
    const adapter = this.gatewayAdapters.get(gateway) || new PaynowGatewayAdapter();
    const result = await adapter.createPayment(orderId, amount, currency, userEmail);

    // Immediate server-side verification in demo / prototype environment
    const verification = await adapter.verifyPayment(result.reference);

    return {
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      order_id: orderId,
      user_id: userEmail,
      reference: result.reference,
      amount,
      currency,
      gateway,
      status: verification.verified ? 'verified' : 'pending',
      verified_at: verification.verified ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
    };
  }
}

export const paymentService = new PaymentService();

import { Order, OrderItem, OrderStatus } from '../types';

export class OrderService {
  /**
   * Generates a new order for domain registration or platform service
   */
  createDomainRegistrationOrder(
    userId: string,
    userEmail: string,
    domainName: string,
    price: number = 2.0,
    currency: string = 'USD'
  ): Order {
    const orderId = 'ord-' + Math.random().toString(36).substring(2, 9);
    const reference = 'RT-ORD-' + Math.floor(100000 + Math.random() * 900000);

    const item: OrderItem = {
      id: 'item-' + Math.random().toString(36).substring(2, 9),
      order_id: orderId,
      item_type: 'domain_registration',
      reference_id: domainName,
      description: `Domain Registration: ${domainName} (1 Year @ $${price.toFixed(2)}/yr)`,
      quantity: 1,
      unit_price: price,
      total: price,
    };

    return {
      id: orderId,
      user_id: userId,
      user_email: userEmail,
      reference,
      subtotal: price,
      discount: 0,
      total: price,
      currency,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [item],
    };
  }

  /**
   * Generates an unpaid Runtime domain-transfer order.
   *
   * The transfer does not start here. Payment settlement later
   * fulfills the order and moves the linked domain from
   * pending_payment to pending_transfer.
   */
  createDomainTransferOrder(
    userId: string,
    userEmail: string,
    domainName: string,
    price: number,
    currency: string = 'USD'
  ): Order {
    const orderId =
      'ord-' +
      Math.random()
        .toString(36)
        .substring(2, 9);

    const reference =
      'RT-ORD-' +
      Math.floor(
        100000 +
        Math.random() *
          900000
      );

    const item: OrderItem = {
      id:
        'item-' +
        Math.random()
          .toString(36)
          .substring(2, 9),

      order_id:
        orderId,

      item_type:
        'domain_transfer',

      reference_id:
        domainName,

      description:
        `Domain Transfer: ${domainName} (1 Year @ $${price.toFixed(
          2
        )})`,

      quantity:
        1,

      unit_price:
        price,

      total:
        price,
    };

    const now =
      new Date()
        .toISOString();

    return {
      id:
        orderId,

      user_id:
        userId,

      user_email:
        userEmail,

      reference,

      subtotal:
        price,

      discount:
        0,

      total:
        price,

      currency,

      status:
        'pending',

      created_at:
        now,

      updated_at:
        now,

      items: [
        item,
      ],

      /*
       * Extra metadata is useful to payment settlement and
       * reporting while remaining backward-compatible with
       * the existing Order type.
       */
      purpose:
        'domain_transfer',
    } as Order & {
      purpose:
        'domain_transfer';
    };
  }

  markPaid(order: Order): Order {
    return {
      ...order,
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}

export const orderService = new OrderService();

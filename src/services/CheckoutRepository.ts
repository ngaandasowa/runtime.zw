import {
  doc,
  writeBatch,
} from 'firebase/firestore';

import {
  db,
} from '../firebase/firebase';

import {
  Domain,
  Order,
  Payment,
} from '../types';


class CheckoutRepository {
  /*
   * Atomically creates a new domain registration.
   *
   * Firestore commits all three documents together:
   * - order
   * - payment
   * - pending domain
   *
   * If any write is rejected or fails, none of the three
   * documents are created.
   */
  async createDomainRegistration(
    order: Order,
    payment: Payment,
    domain: Domain
  ): Promise<void> {
    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        'orders',
        order.id
      ),
      order
    );

    batch.set(
      doc(
        db,
        'payments',
        payment.id
      ),
      payment
    );

    batch.set(
      doc(
        db,
        'domains',
        domain.id
      ),
      domain
    );

    await batch.commit();
  }


  /*
   * Renewal checkout does not create another domain.
   * It atomically creates only the renewal order and its
   * payment record.
   */
  async createOrderPayment(
    order: Order,
    payment: Payment
  ): Promise<void> {
    const batch =
      writeBatch(db);

    batch.set(
      doc(
        db,
        'orders',
        order.id
      ),
      order
    );

    batch.set(
      doc(
        db,
        'payments',
        payment.id
      ),
      payment
    );

    await batch.commit();
  }
}


export const checkoutRepository =
  new CheckoutRepository();

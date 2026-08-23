import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { Payment } from '../types';

class PaymentRepository {
  async createPayment(payment: Payment): Promise<Payment> {
    await setDoc(
      doc(db, 'payments', payment.id),
      payment
    );

    return payment;
  }

  async getPayment(paymentId: string): Promise<Payment | null> {
    const snapshot = await getDoc(
      doc(db, 'payments', paymentId)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return {
      ...(snapshot.data() as Payment),
      id: (snapshot.data() as Payment).id || snapshot.id,
    };
  }

  async updatePayment(
    paymentId: string,
    changes: Partial<Payment>
  ): Promise<void> {
    await updateDoc(
      doc(db, 'payments', paymentId),
      {
        ...changes,
        updated_at: new Date().toISOString(),
      }
    );
  }

  async getPaymentsForOrder(orderId: string): Promise<Payment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, 'payments'),
        where('order_id', '==', orderId)
      )
    );

    return snapshot.docs.map((item) => ({
      ...(item.data() as Payment),
      id: (item.data() as Payment).id || item.id,
    }));
  }

  async getPaymentsForUser(userId: string): Promise<Payment[]> {
    const snapshot = await getDocs(
      query(
        collection(db, 'payments'),
        where('user_id', '==', userId)
      )
    );

    return snapshot.docs
      .map((item) => ({
        ...(item.data() as Payment),
        id: (item.data() as Payment).id || item.id,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }

  async getAllPayments(): Promise<Payment[]> {
    const snapshot = await getDocs(
      collection(db, 'payments')
    );

    return snapshot.docs
      .map((item) => ({
        ...(item.data() as Payment),
        id: (item.data() as Payment).id || item.id,
      }))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }
}

export const paymentRepository =
  new PaymentRepository();
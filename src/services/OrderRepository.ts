import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  db,
} from '../firebase/firebase';

import {
  Order,
} from '../types';


class OrderRepository {
  async createOrder(
    order: Order
  ): Promise<Order> {
    await setDoc(
      doc(
        db,
        'orders',
        order.id
      ),
      order
    );

    return order;
  }


  async getOrder(
    orderId: string
  ): Promise<Order | null> {
    const snapshot =
      await getDoc(
        doc(
          db,
          'orders',
          orderId
        )
      );

    if (
      !snapshot.exists()
    ) {
      return null;
    }

    return {
      ...(snapshot.data() as Order),

      id:
        (snapshot.data() as Order)
          .id ||
        snapshot.id,
    };
  }


  async updateOrder(
    orderId: string,
    changes: Partial<Order>
  ): Promise<void> {
    /*
     * Do not automatically attach extra fields here
     * beyond updated_at because customer Firestore
     * cancellation rules allow only status + updated_at.
     */
    await updateDoc(
      doc(
        db,
        'orders',
        orderId
      ),
      {
        ...changes,

        updated_at:
          changes.updated_at ||
          new Date()
            .toISOString(),
      }
    );
  }


  async deleteOrder(
    orderId: string
  ): Promise<void> {
    await deleteDoc(
      doc(
        db,
        'orders',
        orderId
      )
    );
  }


  async getOrdersForUser(
    userId: string
  ): Promise<Order[]> {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            'orders'
          ),

          where(
            'user_id',
            '==',
            userId
          )
        )
      );

    return snapshot.docs
      .map(
        (item) => ({
          ...(item.data() as Order),

          id:
            (item.data() as Order)
              .id ||
            item.id,
        })
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
  }


  async getAllOrders():
    Promise<Order[]> {
    const snapshot =
      await getDocs(
        collection(
          db,
          'orders'
        )
      );

    return snapshot.docs
      .map(
        (item) => ({
          ...(item.data() as Order),

          id:
            (item.data() as Order)
              .id ||
            item.id,
        })
      )
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );
  }
}


export const orderRepository =
  new OrderRepository();

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/firebase';

import type {
  Wallet,
  WalletTransaction,
} from '../types';

export class WalletRepository {
  async getWalletForUser(
    userId: string
  ): Promise<Wallet> {
    const snapshot = await getDoc(
      doc(
        db,
        'wallets',
        userId
      )
    );

    if (!snapshot.exists()) {
      return {
        id: userId,
        user_id: userId,
        balance: 0,
        currency: 'USD',
        created_at: '',
        updated_at: '',
      };
    }

    return snapshot.data() as Wallet;
  }

  async getTransactionsForUser(
    userId: string,
    maxResults = 50
  ): Promise<WalletTransaction[]> {
    const safeLimit = Math.max(
      1,
      Math.min(
        Math.floor(maxResults),
        100
      )
    );

    const snapshot = await getDocs(
      query(
        collection(
          db,
          'wallet_transactions'
        ),
        where(
          'user_id',
          '==',
          userId
        )
      )
    );

    const transactions =
      snapshot.docs.map(
        (item) =>
          item.data() as WalletTransaction
      );

    return transactions
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )
      .slice(0, safeLimit);
  }
}

export const walletRepository =
  new WalletRepository();
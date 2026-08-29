import crypto from 'crypto';

import {
  adminDb,
} from '../firebaseAdmin.js';

export type WalletMutationType =
  | 'credit'
  | 'debit'
  | 'refund'
  | 'adjustment';

export type WalletReferenceType =
  | 'payment'
  | 'order'
  | 'refund'
  | 'admin_adjustment';

export type WalletMutationInput = {
  userId: string;
  amount: number;
  type: WalletMutationType;

  referenceType:
    WalletReferenceType;

  referenceId: string;

  description: string;

  /*
   * Same business event = same key.
   *
   * Examples:
   *   wallet-topup:<paymentId>
   *   order-payment:<orderId>
   *   order-refund:<orderId>
   */
  idempotencyKey: string;

  currency?: string;
};

export type WalletMutationResult = {
  walletId: string;
  transactionId: string;
  balanceBefore: number;
  balanceAfter: number;
  alreadyApplied: boolean;
};

const normaliseMoney = (
  value: number
) => {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      'Wallet amount must be a valid non-negative number.'
    );
  }

  return (
    Math.round(
      (value + Number.EPSILON) *
      100
    ) / 100
  );
};

const toMinorUnits = (
  value: number
) =>
  Math.round(
    normaliseMoney(value) * 100
  );

const fromMinorUnits = (
  value: number
) =>
  value / 100;

const makeLedgerId = (
  idempotencyKey: string
) => {
  const digest =
    crypto
      .createHash('sha256')
      .update(idempotencyKey)
      .digest('hex');

  return `wtx-${digest.slice(0, 32)}`;
};

export class WalletService {
  async getWallet(
    userId: string
  ) {
    const walletDoc =
      await adminDb
        .collection('wallets')
        .doc(userId)
        .get();

    if (!walletDoc.exists) {
      return {
        id: userId,
        user_id: userId,
        balance: 0,
        currency: 'USD',
        created_at: null,
        updated_at: null,
      };
    }

    return walletDoc.data()!;
  }

  async listTransactions(
    userId: string,
    limit = 50
  ) {
    const safeLimit =
      Math.max(
        1,
        Math.min(
          Math.floor(limit),
          100
        )
      );

    const snapshot =
      await adminDb
        .collection(
          'wallet_transactions'
        )
        .where(
          'user_id',
          '==',
          userId
        )
        .orderBy(
          'created_at',
          'desc'
        )
        .limit(
          safeLimit
        )
        .get();

    return snapshot.docs.map(
      (doc) => doc.data()
    );
  }

  async mutate(
    input: WalletMutationInput
  ): Promise<WalletMutationResult> {
    const userId =
      input.userId.trim();

    const idempotencyKey =
      input.idempotencyKey.trim();

    const referenceId =
      input.referenceId.trim();

    if (!userId) {
      throw new Error(
        'Wallet user is required.'
      );
    }

    if (
      !idempotencyKey ||
      !referenceId
    ) {
      throw new Error(
        'Wallet mutation requires a reference and idempotency key.'
      );
    }

    const amount =
      normaliseMoney(
        input.amount
      );

    if (amount <= 0) {
      throw new Error(
        'Wallet amount must be greater than zero.'
      );
    }

    const currency =
      String(
        input.currency ||
        'USD'
      )
        .trim()
        .toUpperCase();

    if (currency !== 'USD') {
      throw new Error(
        'Runtime Credit currently supports USD only.'
      );
    }

    const walletRef =
      adminDb
        .collection('wallets')
        .doc(userId);

    const ledgerRef =
      adminDb
        .collection(
          'wallet_transactions'
        )
        .doc(
          makeLedgerId(
            idempotencyKey
          )
        );

    const now =
      new Date().toISOString();

    return adminDb.runTransaction(
      async (transaction) => {
        const [
          walletDoc,
          existingLedger,
        ] =
          await Promise.all([
            transaction.get(
              walletRef
            ),
            transaction.get(
              ledgerRef
            ),
          ]);

        /*
         * Idempotency is checked before changing balance.
         * The same business event cannot credit/debit twice.
         */
        if (
          existingLedger.exists
        ) {
          const existing =
            existingLedger.data()!;

          return {
            walletId:
              userId,
            transactionId:
              ledgerRef.id,
            balanceBefore:
              Number(
                existing.balance_before ||
                0
              ),
            balanceAfter:
              Number(
                existing.balance_after ||
                0
              ),
            alreadyApplied:
              true,
          };
        }

        const wallet =
          walletDoc.exists
            ? walletDoc.data()!
            : null;

        const walletCurrency =
          String(
            wallet?.currency ||
            currency
          ).toUpperCase();

        if (
          walletCurrency !==
          currency
        ) {
          throw new Error(
            'Wallet currency does not match this transaction.'
          );
        }

        const beforeMinor =
          toMinorUnits(
            Number(
              wallet?.balance ||
              0
            )
          );

        const amountMinor =
          toMinorUnits(
            amount
          );

        const increasesBalance =
          input.type ===
            'credit' ||
          input.type ===
            'refund';

        const signedMinor =
          increasesBalance
            ? amountMinor
            : -amountMinor;

        const afterMinor =
          beforeMinor +
          signedMinor;

        if (afterMinor < 0) {
          throw new Error(
            'Insufficient Runtime Credit.'
          );
        }

        const balanceBefore =
          fromMinorUnits(
            beforeMinor
          );

        const balanceAfter =
          fromMinorUnits(
            afterMinor
          );

        transaction.set(
          walletRef,
          {
            id: userId,
            user_id: userId,
            balance:
              balanceAfter,
            currency,
            created_at:
              wallet?.created_at ||
              now,
            updated_at:
              now,
          },
          { merge: true }
        );

        transaction.create(
          ledgerRef,
          {
            id:
              ledgerRef.id,
            wallet_id:
              userId,
            user_id:
              userId,
            type:
              input.type,
            amount,
            balance_before:
              balanceBefore,
            balance_after:
              balanceAfter,
            reference_type:
              input.referenceType,
            reference_id:
              referenceId,
            description:
              input.description,
            idempotency_key:
              idempotencyKey,
            created_at:
              now,
          }
        );

        return {
          walletId:
            userId,
          transactionId:
            ledgerRef.id,
          balanceBefore,
          balanceAfter,
          alreadyApplied:
            false,
        };
      }
    );
  }

  credit(
    input: Omit<
      WalletMutationInput,
      'type'
    >
  ) {
    return this.mutate({
      ...input,
      type: 'credit',
    });
  }

  debit(
    input: Omit<
      WalletMutationInput,
      'type'
    >
  ) {
    return this.mutate({
      ...input,
      type: 'debit',
    });
  }

  refund(
    input: Omit<
      WalletMutationInput,
      'type'
    >
  ) {
    return this.mutate({
      ...input,
      type: 'refund',
    });
  }
}

export const walletService =
  new WalletService();

import crypto from 'crypto';
import { adminDb, } from '../firebaseAdmin.js';
import { emailService, } from '../email/emailService.js';
const toMinorUnits = (value) => Math.round((value + Number.EPSILON) *
    100);
const fromMinorUnits = (value) => value / 100;
const ledgerIdForPayment = (paymentId) => `wtx-${crypto
    .createHash('sha256')
    .update(`wallet-topup:${paymentId}`)
    .digest('hex')
    .slice(0, 32)}`;
export const settleWalletTopup = async (input) => {
    const paymentId = input.paymentId.trim();
    if (!paymentId) {
        throw new Error('Payment ID is required.');
    }
    const paymentRef = adminDb
        .collection('payments')
        .doc(paymentId);
    const now = new Date().toISOString();
    const result = await adminDb.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error('Payment not found.');
        }
        const payment = paymentDoc.data();
        if (payment.purpose !==
            'wallet_topup') {
            throw new Error('Payment is not a Runtime Credit top-up.');
        }
        if (payment.status ===
            'rejected' ||
            payment.status ===
                'failed' ||
            payment.status ===
                'refunded') {
            throw new Error('This top-up can no longer be verified.');
        }
        const userId = String(payment.user_id ||
            '').trim();
        const amount = Number(payment.amount);
        const currency = String(payment.currency ||
            'USD')
            .trim()
            .toUpperCase();
        if (!userId) {
            throw new Error('Top-up has no customer.');
        }
        if (!Number.isFinite(amount) ||
            amount <= 0) {
            throw new Error('Top-up amount is invalid.');
        }
        if (currency !== 'USD') {
            throw new Error('Runtime Credit currently supports USD only.');
        }
        const walletRef = adminDb
            .collection('wallets')
            .doc(userId);
        const ledgerRef = adminDb
            .collection('wallet_transactions')
            .doc(ledgerIdForPayment(paymentId));
        const [walletDoc, ledgerDoc,] = await Promise.all([
            transaction.get(walletRef),
            transaction.get(ledgerRef),
        ]);
        const wallet = walletDoc.exists
            ? walletDoc.data()
            : null;
        const beforeMinor = toMinorUnits(Number(wallet?.balance ||
            0));
        /*
         * The ledger document ID is deterministic from paymentId.
         * If it already exists, the money was already credited.
         */
        if (ledgerDoc.exists) {
            const existing = ledgerDoc.data();
            if (payment.status !==
                'verified') {
                transaction.set(paymentRef, {
                    status: 'verified',
                    verified_at: payment.verified_at ||
                        now,
                    verified_by: input.actor,
                    provider_status: input.providerStatus ||
                        payment.provider_status ||
                        'VERIFIED',
                    provider_status_description: input.providerStatusDescription ||
                        payment.provider_status_description ||
                        '',
                    transaction_id: input.transactionId ||
                        payment.transaction_id ||
                        '',
                    updated_at: now,
                }, { merge: true });
            }
            return {
                paymentId,
                walletId: userId,
                walletTransactionId: ledgerRef.id,
                balanceBefore: Number(existing.balance_before ||
                    0),
                balanceAfter: Number(existing.balance_after ||
                    0),
                alreadySettled: true,
            };
        }
        const amountMinor = toMinorUnits(amount);
        const afterMinor = beforeMinor +
            amountMinor;
        const balanceBefore = fromMinorUnits(beforeMinor);
        const balanceAfter = fromMinorUnits(afterMinor);
        transaction.set(paymentRef, {
            status: 'verified',
            verified_at: payment.verified_at ||
                now,
            verified_by: input.actor,
            provider_status: input.providerStatus ||
                'VERIFIED',
            provider_status_description: input.providerStatusDescription ||
                '',
            transaction_id: input.transactionId ||
                payment.transaction_id ||
                '',
            rejection_reason: null,
            wallet_transaction_id: ledgerRef.id,
            updated_at: now,
        }, { merge: true });
        transaction.set(walletRef, {
            id: userId,
            user_id: userId,
            balance: balanceAfter,
            currency: 'USD',
            created_at: wallet?.created_at ||
                now,
            updated_at: now,
        }, { merge: true });
        transaction.create(ledgerRef, {
            id: ledgerRef.id,
            wallet_id: userId,
            user_id: userId,
            type: 'credit',
            amount: fromMinorUnits(amountMinor),
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            reference_type: 'payment',
            reference_id: paymentId,
            description: 'Runtime Credit top-up',
            idempotency_key: `wallet-topup:${paymentId}`,
            created_at: now,
        });
        return {
            paymentId,
            walletId: userId,
            walletTransactionId: ledgerRef.id,
            balanceBefore,
            balanceAfter,
            alreadySettled: false,
        };
    });
    /*
     * Send once, after the balance is safely committed.
     * Concurrent callback/browser verification stays idempotent because
     * only the settlement that created the ledger has alreadySettled=false.
     */
    if (!result.alreadySettled) {
        try {
            const paymentDoc = await paymentRef.get();
            const payment = paymentDoc.exists
                ? paymentDoc.data()
                : {};
            const userId = String(payment.user_id ||
                result.walletId ||
                '').trim();
            const userDoc = userId
                ? await adminDb
                    .collection('users')
                    .doc(userId)
                    .get()
                : null;
            const user = userDoc?.exists
                ? userDoc.data()
                : {};
            const email = String(payment.user_email ||
                user.email ||
                '').trim();
            if (email) {
                await emailService
                    .sendEvent('wallet_credit_added', {
                    email,
                    name: String(user.name ||
                        '').trim() ||
                        undefined,
                    paymentReference: String(payment.reference ||
                        paymentId),
                    amount: Number(payment.amount ||
                        (result.balanceAfter -
                            result.balanceBefore)),
                    balanceBefore: result.balanceBefore,
                    balanceAfter: result.balanceAfter,
                });
            }
        }
        catch (error) {
            console.error('Runtime Credit top-up email failed:', error);
        }
    }
    return result;
};

import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

import crypto from 'crypto';
import nodeFetch from 'node-fetch';

import {
  adminAuth,
  adminDb,
} from '../firebaseAdmin.js';

import {
  settleOrderPayment,
} from '../services/PaymentSettlementService.js';

import {
  settleWalletTopup,
} from '../services/WalletTopupSettlementService.js';

const router = Router();

const PESEPAY_MAKE_PAYMENT_URL =
  'https://api.pesepay.com/api/payments-engine/v2/payments/make-payment';

const PESEPAY_INITIATE_URL =
  'https://api.pesepay.com/api/payments-engine/v1/payments/initiate';

const PESEPAY_METHODS_URL =
  'https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency';

const PESEPAY_STATUS_URL =
  'https://api.pesepay.com/api/payments-engine/v1/payments/check-payment';

type RuntimeUser = {
  uid: string;
  email: string;
  name: string;
  role: string;
};

type AuthenticatedRequest =
  Request & {
    runtimeUser?: RuntimeUser;
  };

type PesePayTransaction = {
  referenceNumber?: string;
  internalReference?: string;
  transactionStatus?: string;
  transactionStatusCode?: number;
  transactionStatusDescription?: string;
  redirectRequired?: boolean;
  redirectUrl?: string;
  pollUrl?: string;
  paymentMethodDetails?: {
    paymentMethodStatus?: string;
    paymentMethodMessage?: string;
    paymentMethodName?: string;
    paymentMethodReference?: string;
  };
};

/*
 * ----------------------------------------------------------
 * AUTHENTICATION
 * ----------------------------------------------------------
 */

const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const header =
      req.headers.authorization;

    if (
      !header?.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const token =
      header.slice(7);

    const decoded =
      await adminAuth.verifyIdToken(
        token
      );

    const profile =
      await adminDb
        .collection('users')
        .doc(decoded.uid)
        .get();

    const profileData =
      profile.exists
        ? profile.data()
        : undefined;

    req.runtimeUser = {
      uid: decoded.uid,
      email: decoded.email || '',
      name: String(
        profileData?.name ||
          decoded.name ||
          decoded.email ||
          'Runtime customer'
      ),
      role: String(
        profileData?.role ||
          'customer'
      ),
    };

    next();
  } catch (error) {
    console.error(
      'Payment authentication failed:',
      error
    );

    return res.status(401).json({
      success: false,
      message:
        'Invalid authentication token.',
    });
  }
};

/*
 * ----------------------------------------------------------
 * PESEPAY CREDENTIALS
 * ----------------------------------------------------------
 */

const getPesePayCredentials = () => {
  const integrationKey =
    process.env.PESEPAY_INTEGRATION_KEY
      ?.trim();

  const encryptionKey =
    process.env.PESEPAY_ENCRYPTION_KEY
      ?.trim();

  if (
    !integrationKey ||
    !encryptionKey
  ) {
    throw new Error(
      'PesePay credentials are not configured.'
    );
  }

  if (
    Buffer.byteLength(
      encryptionKey,
      'utf8'
    ) !== 32
  ) {
    throw new Error(
      'PesePay encryption key must be exactly 32 UTF-8 bytes.'
    );
  }

  return {
    integrationKey,
    encryptionKey,
  };
};

/*
 * ----------------------------------------------------------
 * PESEPAY ENCRYPTION
 * ----------------------------------------------------------
 */

const encryptPayload = (
  payload: Record<string, unknown>,
  encryptionKey: string
) => {
  const key = Buffer.from(
    encryptionKey,
    'utf8'
  );

  const iv = Buffer.from(
    encryptionKey.substring(0, 16),
    'utf8'
  );

  const cipher =
    crypto.createCipheriv(
      'aes-256-cbc',
      key,
      iv
    );

  let encrypted = cipher.update(
    JSON.stringify(payload),
    'utf8',
    'base64'
  );

  encrypted +=
    cipher.final('base64');

  return encrypted;
};

const decryptPayload = (
  encryptedPayload: string,
  encryptionKey: string
): PesePayTransaction => {
  const key = Buffer.from(
    encryptionKey,
    'utf8'
  );

  const iv = Buffer.from(
    encryptionKey.substring(0, 16),
    'utf8'
  );

  const decipher =
    crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      iv
    );

  let decrypted =
    decipher.update(
      encryptedPayload,
      'base64',
      'utf8'
    );

  decrypted +=
    decipher.final('utf8');

  if (!decrypted) {
    throw new Error(
      'PesePay returned an empty encrypted response.'
    );
  }

  return JSON.parse(
    decrypted
  ) as PesePayTransaction;
};

const fetchPesePayStatus = async (
  referenceNumber: string
): Promise<PesePayTransaction> => {
  const {
    integrationKey,
    encryptionKey,
  } = getPesePayCredentials();

  const url =
    `${PESEPAY_STATUS_URL}?referenceNumber=${encodeURIComponent(
      referenceNumber
    )}`;

  const response =
    await nodeFetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization:
            integrationKey,
          Accept:
            'application/json',
        },
        insecureHTTPParser: true,
      }
    );

  let responseBody: any;

  try {
    responseBody =
      await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    console.error(
      'PesePay status check failed:',
      response.status,
      responseBody
    );

    throw new Error(
      `PesePay status check failed with HTTP ${response.status}.`
    );
  }

  if (
    !responseBody ||
    typeof responseBody.payload !==
      'string' ||
    !responseBody.payload
  ) {
    throw new Error(
      'PesePay returned an invalid status response.'
    );
  }

  return decryptPayload(
    responseBody.payload,
    encryptionKey
  );
};

/*
 * ----------------------------------------------------------
 * HELPERS
 * ----------------------------------------------------------
 */

type RuntimePaymentState =
  | 'pending'
  | 'success'
  | 'failed';

const classifyPesePayStatus = (
  transaction: PesePayTransaction
): RuntimePaymentState => {
  const status = String(
    transaction.transactionStatus ||
      ''
  )
    .trim()
    .toUpperCase();

  const description = String(
    transaction
      .transactionStatusDescription ||
      ''
  )
    .trim()
    .toUpperCase();

  const methodStatus = String(
    transaction
      .paymentMethodDetails
      ?.paymentMethodStatus ||
      ''
  )
    .trim()
    .toUpperCase();

  const methodMessage = String(
    transaction
      .paymentMethodDetails
      ?.paymentMethodMessage ||
      ''
  )
    .trim()
    .toUpperCase();

  if (status === 'SUCCESS') {
    return 'success';
  }

  const combined =
    [
      status,
      description,
      methodStatus,
      methodMessage,
    ].join(' ');

  /*
   * PesePay can report a terminal failure either in the
   * transaction status or inside paymentMethodDetails.
   * Insufficient-funds responses are terminal for this
   * attempt even when the top-level status has not yet
   * changed from INITIATED.
   */
  const terminalFailureWords = [
    'AUTHORIZATION_FAILED',
    'AUTHORIZATION FAILED',
    'FAILED',
    'FAILURE',
    'CANCELLED',
    'CANCELED',
    'DECLINED',
    'REJECTED',
    'EXPIRED',
    'ABORTED',
    'TIMEOUT',
    'UNSUCCESSFUL',
    'INSUFFICIENT',
    'NOT ENOUGH FUNDS',
    'LOW BALANCE',
    'BALANCE TOO LOW',
  ];

  if (
    terminalFailureWords.some(
      (word) =>
        combined.includes(word)
    )
  ) {
    return 'failed';
  }

  return 'pending';
};

const markInitiationFailed = async (
  paymentId: string,
  orderId: string,
  previousOrderStatus: string,
  reason: string
) => {
  const now =
    new Date().toISOString();

  await adminDb.runTransaction(
    async (transaction) => {
      const paymentRef =
        adminDb
          .collection('payments')
          .doc(paymentId);

      const orderRef =
        adminDb
          .collection('orders')
          .doc(orderId);

      const orderSnapshot =
        await transaction.get(
          orderRef
        );

      transaction.set(
        paymentRef,
        {
          status: 'failed',
          rejection_reason: reason,
          updated_at: now,
        },
        { merge: true }
      );

      if (
        orderSnapshot.exists &&
        orderSnapshot.data()?.status ===
          'payment_pending'
      ) {
        transaction.update(
          orderRef,
          {
            status:
              previousOrderStatus,
            updated_at: now,
          }
        );
      }
    }
  );
};


type RuntimePesePayMethod = {
  code: string;
  name: string;
  description: string;
  seamless: boolean;
  requiresPhone: boolean;
};

const normalisePesePayMethod = (
  value: any
): RuntimePesePayMethod | null => {
  const code = String(
    value?.paymentMethodCode ??
      value?.code ??
      ''
  ).trim();

  const name = String(
    value?.paymentMethodName ??
      value?.name ??
      value?.description ??
      code
  ).trim();

  if (!code) {
    return null;
  }

  const searchable =
    `${code} ${name}`.toLowerCase();

  const isEcoCash =
    code === 'PZW211' ||
    searchable.includes('ecocash');

  const isInnBucks =
    code === 'PZW212' ||
    searchable.includes('innbucks');

  return {
    code,
    name: name || code,
    description: String(
      value?.description ??
        value?.paymentMethodDescription ??
        ''
    ).trim(),

    /*
     * EcoCash is handled as a direct/seamless request
     * because Runtime supplies the required phone number.
     *
     * InnBucks is intentionally sent through PesePay's
     * hosted checkout. Runtime was previously treating it
     * as seamless without receiving/rendering the QR/code
     * data required to complete that flow.
     */
    seamless:
      isEcoCash,

    requiresPhone:
      isEcoCash,

    // Kept only so method identification remains explicit.
    ...(isInnBucks
      ? {}
      : {}),
  };
};

const fetchPesePayMethods = async (
  currencyCode: string
): Promise<RuntimePesePayMethod[]> => {
  const { integrationKey } =
    getPesePayCredentials();

  const url =
    `${PESEPAY_METHODS_URL}?currencyCode=${encodeURIComponent(
      currencyCode
    )}`;

  const response =
    await nodeFetch(url, {
      method: 'GET',
      headers: {
        authorization:
          integrationKey,
        'Content-Type':
          'application/json',
        Accept:
          'application/json',
      },
      insecureHTTPParser: true,
    });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      `PesePay payment methods request failed (${response.status}).`
    );
  }

  const values: unknown[] =
    Array.isArray(body)
      ? body
      : Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body?.paymentMethods)
          ? body.paymentMethods
          : [];

  return values
    .map(normalisePesePayMethod)
    .filter(
      (
        method: RuntimePesePayMethod | null
      ): method is RuntimePesePayMethod =>
        method !== null
    );
};

/*
 * ----------------------------------------------------------
 * HEALTH / CONFIG CHECK
 * ----------------------------------------------------------
 */

router.get(
  '/pesepay/status',
  (_req, res) => {
    try {
      getPesePayCredentials();

      return res.json({
        success: true,
        provider: 'pesepay',
        configured: true,
      });
    } catch {
      return res.status(503).json({
        success: false,
        provider: 'pesepay',
        configured: false,
      });
    }
  }
);

router.get(
  '/pesepay/methods',
  authenticate,
  async (req, res) => {
    try {
      const currencyCode =
        typeof req.query.currencyCode ===
        'string'
          ? req.query.currencyCode
              .trim()
              .toUpperCase()
          : 'USD';

      const methods =
        await fetchPesePayMethods(
          currencyCode
        );

      return res.json({
        success: true,
        currencyCode,
        methods,
      });
    } catch (error) {
      console.error(
        'PesePay methods error:',
        error
      );

      return res.status(502).json({
        success: false,
        message:
          'Unable to load PesePay payment methods.',
      });
    }
  }
);

type PesePaySettlementResult = {
  verified: boolean;
  paymentState:
    | 'pending'
    | 'success'
    | 'failed';
  terminal: boolean;
  paymentId: string;
  orderId: string;
  purpose: 'order_payment' | 'wallet_topup';
  transactionStatus: string;
  transactionStatusDescription: string;
};

type SettlePesePayOptions = {
  /*
   * PesePay callbacks can arrive before initiation has saved
   * provider_reference. Browser verification normally does
   * not need this wait.
   */
  waitForProviderReference?: boolean;
};

const settlePesePayPayment = async (
  paymentId: string,
  options: SettlePesePayOptions = {}
): Promise<PesePaySettlementResult> => {
  const paymentRef =
    adminDb
      .collection('payments')
      .doc(paymentId);

  let paymentDoc:
    FirebaseFirestore.DocumentSnapshot | null =
      null;

  const attempts =
    options.waitForProviderReference
      ? 5
      : 1;

  for (
    let attempt = 0;
    attempt < attempts;
    attempt += 1
  ) {
    paymentDoc =
      await paymentRef.get();

    if (
      paymentDoc.exists &&
      paymentDoc.data()
        ?.provider_reference
    ) {
      break;
    }

    if (
      options.waitForProviderReference &&
      attempt < attempts - 1
    ) {
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          1000
        )
      );
    }
  }

  if (
    !paymentDoc ||
    !paymentDoc.exists
  ) {
    throw new Error(
      'Payment not found.'
    );
  }

  const payment =
    paymentDoc.data()!;

  if (
    payment.gateway !==
    'pesepay'
  ) {
    throw new Error(
      'This is not a PesePay payment.'
    );
  }

  const purpose =
    payment.purpose === 'wallet_topup'
      ? 'wallet_topup'
      : 'order_payment';

  const orderId =
    String(
      payment.order_id ||
      ''
    ).trim();

  const providerReference =
    String(
      payment.provider_reference ||
      ''
    ).trim();

  if (
    !providerReference ||
    (
      purpose === 'order_payment' &&
      !orderId
    )
  ) {
    throw new Error(
      'The PesePay transaction is not ready for verification yet.'
    );
  }

  const providerTransaction =
    await fetchPesePayStatus(
      providerReference
    );

  const providerStatus =
    String(
      providerTransaction
        .transactionStatus ||
      ''
    )
      .trim()
      .toUpperCase();

  const providerDescription =
    String(
      providerTransaction
        .transactionStatusDescription ||
      providerTransaction
        .paymentMethodDetails
        ?.paymentMethodMessage ||
      ''
    );

  const providerInternalReference =
    String(
      providerTransaction
        .internalReference ||
      providerReference
    );

  const paymentState =
    classifyPesePayStatus(
      providerTransaction
    );

  const now =
    new Date().toISOString();

  /*
   * SUCCESS is the only state that is allowed to settle
   * money and mark the order paid.
   */
  if (
    paymentState ===
    'success'
  ) {
    /*
     * PesePay's job ends after it proves SUCCESS.
     * The generic settlement service owns all local money,
     * order and fulfillment state from this point onward.
     */
    if (
      purpose === 'wallet_topup'
    ) {
      await settleWalletTopup({
        paymentId,
        actor: 'PesePay',
        providerStatus:
          providerStatus ||
          'SUCCESS',
        providerStatusDescription:
          providerDescription,
        transactionId:
          providerInternalReference,
      });

      return {
        verified: true,
        paymentState:
          'success',
        terminal: true,
        paymentId,
        orderId: '',
        purpose,
        transactionStatus:
          providerStatus ||
          'SUCCESS',
        transactionStatusDescription:
          providerDescription,
      };
    }

    const result =
      await settleOrderPayment({
        paymentId,
        actor: 'PesePay',
        providerStatus:
          providerStatus ||
          'SUCCESS',
        providerStatusDescription:
          providerDescription,
        transactionId:
          providerInternalReference,
      });

    return {
      verified: true,
      paymentState:
        'success',
      terminal: true,
      paymentId,
      orderId:
        result.orderId,
      purpose,
      transactionStatus:
        providerStatus ||
        'SUCCESS',
      transactionStatusDescription:
        providerDescription,
    };
  }

  /*
   * Every non-success response is recorded consistently
   * regardless of whether settlement was triggered by:
   *   - the browser verify endpoint, or
   *   - PesePay's callback.
   *
   * Terminal failures free the order for another payment.
   * Genuine pending statuses keep the order payment_pending.
   */
  const runtimePaymentStatus =
    paymentState === 'failed'
      ? 'failed'
      : 'pending';

  await adminDb.runTransaction(
    async (transaction) => {
      const freshPayment =
        await transaction.get(
          paymentRef
        );

      if (!freshPayment.exists) {
        throw new Error(
          'Payment disappeared during verification.'
        );
      }

      transaction.set(
        paymentRef,
        {
          status:
            runtimePaymentStatus,
          provider_status:
            providerStatus ||
            'UNKNOWN',
          provider_status_description:
            providerDescription,
          transaction_id:
            providerInternalReference,
          rejection_reason:
            paymentState ===
              'failed'
              ? providerDescription ||
                `PesePay returned ${providerStatus || 'a failed status'}.`
              : null,
          failed_at:
            paymentState ===
              'failed'
              ? (
                  freshPayment.data()
                    ?.failed_at ||
                  now
                )
              : null,
          updated_at:
            now,
        },
        { merge: true }
      );

      if (
        purpose === 'order_payment' &&
        orderId &&
        paymentState === 'failed'
      ) {
        const orderRef =
          adminDb
            .collection('orders')
            .doc(orderId);

        const freshOrder =
          await transaction.get(
            orderRef
          );

        if (
          freshOrder.exists &&
          freshOrder.data()
            ?.status ===
            'payment_pending'
        ) {
          transaction.set(
            orderRef,
            {
              status: 'pending',
              updated_at: now,
            },
            { merge: true }
          );
        }
      }
    }
  );

  return {
    verified: false,
    paymentState,
    terminal:
      paymentState ===
      'failed',
    paymentId,
    orderId,
    purpose,
    transactionStatus:
      providerStatus ||
      'UNKNOWN',
    transactionStatusDescription:
      providerDescription,
  };
};

/*
 * ----------------------------------------------------------
 * PESEPAY RESULT CALLBACK
 * ----------------------------------------------------------
 *
 * PesePay can call this URL when the transaction changes.
 * We intentionally do NOT trust the callback as proof of
 * payment. The payment will be verified against PesePay's
 * Check Payment Status API before an order is marked paid.
 */

router.all(
  '/pesepay/result',
  async (req, res) => {
    try {
      const paymentId =
        typeof req.query.paymentId ===
        'string'
          ? req.query.paymentId
          : '';

      if (paymentId) {
        await adminDb
          .collection('payments')
          .doc(paymentId)
          .set(
            {
              provider_callback_received_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            },
            { merge: true }
          );

        await settlePesePayPayment(
          paymentId,
          {
            waitForProviderReference:
              true,
          }
        );
      }

      return res.status(200).json({
        success: true,
      });
    } catch (error) {
      console.error(
        'PesePay result callback error:',
        error
      );

      return res.status(200).json({
        success: true,
      });
    }
  }
);

/*
 * ----------------------------------------------------------
 * VERIFY PESEPAY PAYMENT
 * ----------------------------------------------------------
 *
 * Runtime never trusts the browser or callback as proof of
 * payment. This route asks PesePay for the authoritative
 * transaction status before changing local payment state.
 *
 * Only SUCCESS is treated as paid. Unknown/non-success
 * statuses remain pending until we explicitly map PesePay's
 * terminal failure statuses.
 */

router.post(
  '/pesepay/verify',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const body =
        req.body ?? {};

      const paymentId =
        typeof body.paymentId ===
        'string'
          ? body.paymentId.trim()
          : '';

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message:
            'Payment ID is required.',
        });
      }

      const runtimeUser =
        req.runtimeUser!;

      /*
       * Authorization stays at the route boundary.
       * Settlement itself is shared with the trusted
       * PesePay callback and never trusts browser status.
       */
      const paymentDoc =
        await adminDb
          .collection('payments')
          .doc(paymentId)
          .get();

      if (!paymentDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            'Payment not found.',
        });
      }

      const payment =
        paymentDoc.data()!;

      const ownsPayment =
        payment.user_id ===
        runtimeUser.uid;

      const isAdmin =
        runtimeUser.role ===
        'super_admin';

      if (
        !ownsPayment &&
        !isAdmin
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You may only verify your own payment.',
        });
      }

      if (
        payment.gateway !==
        'pesepay'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This is not a PesePay payment.',
        });
      }

      const result =
        await settlePesePayPayment(
          paymentId
        );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'PesePay verification error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to verify PesePay payment.';

      if (
        message ===
        'The PesePay transaction is not ready for verification yet.'
      ) {
        return res.status(409).json({
          success: false,
          message,
        });
      }

      if (
        message ===
        'Payment not found.'
      ) {
        return res.status(404).json({
          success: false,
          message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          'Unable to verify PesePay payment.',
      });
    }
  }
);



/*
 * ----------------------------------------------------------
 * ADMIN DOMAIN STATUS
 * ----------------------------------------------------------
 *
 * Status changes are backend-owned. This avoids customer Firestore
 * rules blocking an administrator and prevents the UI from hiding a
 * domain when persistence actually failed.
 */
router.post(
  '/admin/domain-status',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const runtimeUser =
        req.runtimeUser!;

      if (
        runtimeUser.role !==
        'super_admin'
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Super admin permission required.',
        });
      }

      const domainId =
        typeof req.body?.domainId ===
        'string'
          ? req.body.domainId.trim()
          : '';

      const status =
        typeof req.body?.status ===
        'string'
          ? req.body.status.trim()
          : '';

      const allowedStatuses =
        new Set([
          'pending',
          'pending_payment',
          'pending_registration',
          'active',
          'pending_transfer',
          'pending_delete',
          'expired',
          'cancelled',
          'registry_rejected',
          'replaced',
          'suspended',
        ]);

      if (
        !domainId ||
        !allowedStatuses.has(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A valid domain and status are required.',
        });
      }

      const domainRef =
        adminDb
          .collection('domains')
          .doc(domainId);

      const result =
        await adminDb.runTransaction(
          async (transaction) => {
            const domainDoc =
              await transaction.get(
                domainRef
              );

            if (!domainDoc.exists) {
              throw new Error(
                'Domain not found.'
              );
            }

            const domain =
              domainDoc.data()!;

            const now =
              new Date();

            const nowIso =
              now.toISOString();

            let registeredAt =
              domain.registered_at ||
              null;

            let expiresAt =
              domain.expires_at ||
              null;

            if (
              status === 'active' &&
              !registeredAt
            ) {
              registeredAt =
                nowIso;

              const firstExpiry =
                new Date(now);

              firstExpiry.setFullYear(
                firstExpiry.getFullYear() +
                  1
              );

              expiresAt =
                firstExpiry
                  .toISOString();
            }

            const existingHistory =
              Array.isArray(
                domain.history
              )
                ? domain.history
                : [];

            const nextHistory = [
              ...existingHistory,
              {
                id:
                  `hist-${crypto.randomUUID()}`,
                domain_id:
                  domainId,
                action:
                  'STATUS_CHANGE',
                description:
                  status ===
                    'registry_rejected'
                    ? 'Domain registration was rejected by the registry.'
                    : status ===
                        'active'
                      ? 'Domain registration completed and the domain is now active.'
                      : `Domain status changed to ${status.replace(/_/g, ' ')}.`,
                status,
                actor:
                  runtimeUser.email ||
                  runtimeUser.uid,
                created_at:
                  nowIso,
              },
            ];

            const changes: Record<
              string,
              unknown
            > = {
              status,
              registered_at:
                registeredAt,
              expires_at:
                expiresAt,
              history:
                nextHistory,
              updated_at:
                nowIso,
            };

            if (
              status ===
              'registry_rejected'
            ) {
              changes.rejected_at =
                domain.rejected_at ||
                nowIso;

              changes.archived_at =
                nowIso;
            }

            if (
              status ===
              'cancelled'
            ) {
              changes.archived_at =
                domain.archived_at ||
                nowIso;
            }

            transaction.set(
              domainRef,
              changes,
              {
                merge: true,
              }
            );

            return {
              domainId,
              previousStatus:
                domain.status,
              status,
              registeredAt,
              expiresAt,
            };
          }
        );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'Admin domain status update error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update domain status.';

      return res
        .status(
          message ===
          'Domain not found.'
            ? 404
            : 500
        )
        .json({
          success: false,
          message,
        });
    }
  }
);


/*
 * ----------------------------------------------------------
 * ADMIN DOMAIN REPLACEMENT
 * ----------------------------------------------------------
 *
 * Used when a registry rejects a domain after the customer's order
 * has already been paid. The original verified payment is NEVER
 * recreated, moved, refunded or duplicated. Fulfillment is changed
 * to a replacement domain under the same paid order.
 */
router.post(
  '/admin/domain-replacement',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const runtimeUser =
        req.runtimeUser!;

      if (
        runtimeUser.role !==
        'super_admin'
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Super admin permission required.',
        });
      }

      const domainId =
        typeof req.body?.domainId ===
        'string'
          ? req.body.domainId.trim()
          : '';

      const replacementDomainName =
        typeof req.body
          ?.replacementDomainName ===
        'string'
          ? req.body
              .replacementDomainName
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, '')
              .replace(/^www\./, '')
              .split('/')[0]
          : '';

      const existingDomainId =
        typeof req.body?.existingDomainId ===
        'string'
          ? req.body.existingDomainId.trim()
          : '';

      const reason =
        typeof req.body?.reason ===
          'string' &&
        req.body.reason.trim()
          ? req.body.reason.trim()
          : 'Registry rejected the original domain.';

      if (
        !domainId ||
        !replacementDomainName ||
        !replacementDomainName.includes('.')
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Original domain and a valid replacement domain are required.',
        });
      }

      const oldDomainRef =
        adminDb
          .collection('domains')
          .doc(domainId);

      const replacementRef =
        adminDb
          .collection('domains')
          .doc(
            existingDomainId ||
            `dom-${crypto.randomUUID()}`
          );

      const now =
        new Date().toISOString();

      const result =
        await adminDb.runTransaction(
          async (transaction) => {
            /*
             * IMPORTANT:
             * Every read happens before the first write.
             */
            const oldDomainDoc =
              await transaction.get(
                oldDomainRef
              );

            if (!oldDomainDoc.exists) {
              throw new Error(
                'Original domain not found.'
              );
            }

            const oldDomain =
              oldDomainDoc.data()!;

            if (
              ![
                'cancelled',
                'registry_rejected',
                'pending_registration',
                'pending_delete',
              ].includes(
                String(
                  oldDomain.status
                )
              )
            ) {
              throw new Error(
                'Only a cancelled, registry-rejected, or registration-processing domain can be replaced.'
              );
            }

            const orderId =
              String(
                oldDomain.order_id ||
                ''
              ).trim();

            if (!orderId) {
              throw new Error(
                'The original domain is not linked to an order.'
              );
            }

            const orderRef =
              adminDb
                .collection('orders')
                .doc(orderId);

            const orderDoc =
              await transaction.get(
                orderRef
              );

            if (!orderDoc.exists) {
              throw new Error(
                'The paid order linked to this domain was not found.'
              );
            }

            const order =
              orderDoc.data()!;

            if (
              order.user_id !==
              oldDomain.user_id
            ) {
              throw new Error(
                'Domain and order customer do not match.'
              );
            }

            const paymentQuery =
              adminDb
                .collection('payments')
                .where(
                  'order_id',
                  '==',
                  orderId
                );

            const paymentSnapshot =
              await transaction.get(
                paymentQuery
              );

            const existingReplacementDoc =
              existingDomainId
                ? await transaction.get(
                    replacementRef
                  )
                : null;

            if (
              existingDomainId &&
              !existingReplacementDoc?.exists
            ) {
              throw new Error(
                'The existing replacement domain was not found.'
              );
            }

            const verifiedPayments =
              paymentSnapshot.docs
                .map(
                  (doc) => ({
                    id: doc.id,
                    ...doc.data(),
                  })
                )
                .filter(
                  (payment: any) =>
                    payment.status ===
                    'verified'
                );

            const verifiedTotal =
              Math.round(
                verifiedPayments.reduce(
                  (
                    total: number,
                    payment: any
                  ) =>
                    total +
                    Number(
                      payment.amount ||
                      0
                    ),
                  0
                ) *
                100
              ) / 100;

            const orderTotal =
              Math.round(
                Number(
                  order.total ||
                  0
                ) *
                100
              ) / 100;

            if (
              verifiedTotal +
                0.00001 <
              orderTotal
            ) {
              throw new Error(
                'The linked order is not fully paid. A replacement cannot use an unpaid order.'
              );
            }

            if (
              existingDomainId
            ) {
              const existingDomain =
                existingReplacementDoc!
                  .data()!;

              if (
                replacementRef.id ===
                oldDomainRef.id
              ) {
                throw new Error(
                  'The original domain cannot replace itself.'
                );
              }

              if (
                existingDomain.user_id !==
                oldDomain.user_id
              ) {
                throw new Error(
                  'The existing replacement domain belongs to a different customer.'
                );
              }

              if (
                String(
                  existingDomain.domain_name ||
                  ''
                )
                  .trim()
                  .toLowerCase() !==
                replacementDomainName
              ) {
                throw new Error(
                  'The selected existing domain does not match the replacement domain name.'
                );
              }

              if (
                [
                  'cancelled',
                  'registry_rejected',
                  'replaced',
                ].includes(
                  String(
                    existingDomain.status
                  )
                )
              ) {
                throw new Error(
                  'An archived or failed domain cannot be used as the replacement.'
                );
              }

              const conflictingOrderId =
                String(
                  existingDomain.order_id ||
                  ''
                ).trim();

              if (
                conflictingOrderId &&
                conflictingOrderId !==
                  orderId
              ) {
                throw new Error(
                  'The existing replacement domain is already linked to another order.'
                );
              }
            } else {
              const duplicateQuery =
                adminDb
                  .collection('domains')
                  .where(
                    'domain_name',
                    '==',
                    replacementDomainName
                  );

              const duplicateSnapshot =
                await transaction.get(
                  duplicateQuery
                );

              if (
                !duplicateSnapshot.empty
              ) {
                throw new Error(
                  'That replacement domain already exists in Runtime. Use "Use Existing Domain" instead.'
                );
              }
            }

            const parts =
              replacementDomainName
                .split('.');

            const tld =
              replacementDomainName
                .endsWith('.co.zw')
                ? '.co.zw'
                : replacementDomainName
                    .endsWith('.org.zw')
                  ? '.org.zw'
                  : replacementDomainName
                      .endsWith('.ac.zw')
                    ? '.ac.zw'
                    : parts.length > 1
                      ? `.${parts
                          .slice(1)
                          .join('.')}`
                      : '';

            if (
              oldDomain.tld &&
              String(
                oldDomain.tld
              ).toLowerCase() !==
                tld.toLowerCase()
            ) {
              throw new Error(
                'A no-charge replacement must use the same domain extension as the original paid domain.'
              );
            }

            const oldHistory =
              Array.isArray(
                oldDomain.history
              )
                ? oldDomain.history
                : [];

            const existingReplacement =
              existingDomainId
                ? existingReplacementDoc!
                    .data()!
                : null;

            const existingReplacementHistory =
              Array.isArray(
                existingReplacement
                  ?.history
              )
                ? existingReplacement
                    .history
                : [];

            const newDomain = {
              ...(existingReplacement ||
                {}),
              id:
                replacementRef.id,
              domain_name:
                replacementDomainName,
              tld,
              user_id:
                oldDomain.user_id,
              user_email:
                oldDomain.user_email,
              status:
                existingReplacement
                  ?.status ||
                'pending_registration',
              nameservers:
                existingReplacement &&
                Array.isArray(
                  existingReplacement
                    .nameservers
                )
                  ? existingReplacement
                      .nameservers
                  : Array.isArray(
                      oldDomain.nameservers
                    )
                    ? oldDomain
                        .nameservers
                    : [],
              nameserver_ips:
                existingReplacement &&
                Array.isArray(
                  existingReplacement
                    .nameserver_ips
                )
                  ? existingReplacement
                      .nameserver_ips
                  : Array.isArray(
                      oldDomain
                        .nameserver_ips
                    )
                    ? oldDomain
                        .nameserver_ips
                    : [],
              auto_renew:
                existingReplacement
                  ?.auto_renew ??
                oldDomain.auto_renew ??
                true,
              renewal_price:
                Number(
                  existingReplacement
                    ?.renewal_price ??
                  oldDomain
                    .renewal_price ??
                  0
                ),
              currency:
                existingReplacement
                  ?.currency ||
                oldDomain.currency ||
                order.currency ||
                'USD',
              registrant_type:
                existingReplacement
                  ?.registrant_type ||
                oldDomain
                  .registrant_type ||
                'myself',
              owner_details:
                existingReplacement
                  ?.owner_details ||
                oldDomain
                  .owner_details ||
                {},
              processing_type:
                existingReplacement
                  ?.processing_type ||
                oldDomain
                  .processing_type ||
                'zispa',
              registration_price:
                Number(
                  oldDomain
                    .registration_price ||
                  order.total ||
                  0
                ),
              order_id:
                orderId,
              payment_id:
                verifiedPayments.length ===
                1
                  ? verifiedPayments[0]
                      .id
                  : existingReplacement
                      ?.payment_id,
              payment_ids:
                verifiedPayments.map(
                  (payment: any) =>
                    payment.id
                ),
              replacement_for_domain_id:
                oldDomainRef.id,
              history: [
                ...existingReplacementHistory,
                {
                  id:
                    `hist-${crypto.randomUUID()}`,
                  domain_id:
                    replacementRef.id,
                  action: 'NEW',
                  description:
                    existingDomainId
                      ? `Existing domain linked as the replacement for ${oldDomain.domain_name}. Existing paid order ${order.reference || orderId} applied; no new payment created.`
                      : `Replacement for ${oldDomain.domain_name}. Existing paid order ${order.reference || orderId} applied; no new payment created.`,
                  status:
                    existingReplacement
                      ?.status ||
                    'pending_registration',
                  actor:
                    runtimeUser.email ||
                    runtimeUser.uid,
                  created_at:
                    now,
                },
              ],
              created_at:
                existingReplacement
                  ?.created_at ||
                now,
              updated_at:
                now,
            };

            const nextItems =
              Array.isArray(
                order.items
              )
                ? order.items.map(
                    (
                      item: any
                    ) =>
                      item.item_type ===
                      'domain_registration'
                        ? {
                            ...item,
                            reference_id:
                              replacementDomainName,
                            description:
                              `Domain registration: ${replacementDomainName}`,
                          }
                        : item
                  )
                : [];

            /*
             * All reads are complete. Writes begin here.
             */
            transaction.set(
              oldDomainRef,
              {
                status:
                  'replaced',
                registry_rejection_reason:
                  reason,
                rejected_at:
                  oldDomain.rejected_at ||
                  now,
                archived_at:
                  now,
                replacement_domain_id:
                  replacementRef.id,
                replaced_by_domain:
                  replacementDomainName,
                replaced_at:
                  now,
                updated_at:
                  now,
                history: [
                  ...oldHistory,
                  {
                    id:
                      `hist-${crypto.randomUUID()}`,
                    domain_id:
                      oldDomainRef.id,
                    action:
                      'STATUS_CHANGE',
                    description:
                      `Registry replacement: ${oldDomain.domain_name} was replaced by ${replacementDomainName}. Existing payment/order retained.`,
                    status:
                      'replaced',
                    actor:
                      runtimeUser.email ||
                      runtimeUser.uid,
                    created_at:
                      now,
                  },
                ],
              },
              {
                merge: true,
              }
            );

            if (
              existingDomainId
            ) {
              transaction.set(
                replacementRef,
                newDomain,
                {
                  merge: true,
                }
              );
            } else {
              transaction.create(
                replacementRef,
                newDomain
              );
            }

            transaction.set(
              orderRef,
              {
                status:
                  order.status ===
                    'completed'
                    ? 'processing'
                    : order.status,
                items:
                  nextItems,
                fulfillment_domain_id:
                  replacementRef.id,
                original_domain_id:
                  oldDomainRef.id,
                replacement_reason:
                  reason,
                replacement_at:
                  now,
                updated_at:
                  now,
              },
              {
                merge: true,
              }
            );

            /*
             * Payment documents are intentionally untouched.
             */
            return {
              replacementDomain:
                newDomain,
              originalDomainId:
                oldDomainRef.id,
              orderId,
              orderReference:
                order.reference ||
                orderId,
              paymentIds:
                verifiedPayments.map(
                  (payment: any) =>
                    payment.id
                ),
              verifiedTotal,
              orderTotal,
              reusedExistingDomain:
                Boolean(
                  existingDomainId
                ),
            };
          }
        );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'Domain replacement error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to replace domain.';

      const status =
        message.includes(
          'not found'
        )
          ? 404
          : message.includes(
                'Only a cancelled'
              ) ||
              message.includes(
                'not fully paid'
              ) ||
              message.includes(
                'already exists'
              ) ||
              message.includes(
                'do not match'
              ) ||
              message.includes(
                'same domain extension'
              )
            ? 409
            : 500;

      return res.status(status).json({
        success: false,
        message,
      });
    }
  }
);


/*
 * ----------------------------------------------------------
 * ADMIN MANUAL PAYMENT VERIFICATION
 * ----------------------------------------------------------
 *
 * Manual EcoCash is the only gateway an administrator may
 * approve/reject here. Provider-authoritative PesePay attempts
 * must continue through PesePay verification instead.
 */

router.post(
  '/admin/manual/approve',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const runtimeUser =
        req.runtimeUser!;

      if (
        runtimeUser.role !==
        'super_admin'
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Super admin permission required.',
        });
      }

      const paymentId =
        typeof req.body?.paymentId ===
        'string'
          ? req.body.paymentId.trim()
          : '';

      const transactionId =
        typeof req.body?.transactionId ===
        'string'
          ? req.body.transactionId.trim()
          : '';

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message:
            'Payment ID is required.',
        });
      }

      const paymentDoc =
        await adminDb
          .collection('payments')
          .doc(paymentId)
          .get();

      if (!paymentDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            'Payment not found.',
        });
      }

      const payment =
        paymentDoc.data()!;

      if (
        payment.gateway !==
        'ecocash_usd'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Only manual EcoCash USD payments can be approved manually.',
        });
      }

      if (
        payment.status ===
        'rejected' ||
        payment.status ===
        'failed'
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This payment attempt is no longer awaiting verification. The customer should create a new payment attempt.',
        });
      }

      const purpose =
        payment.purpose ===
          'wallet_topup'
          ? 'wallet_topup'
          : 'order_payment';

      const result =
        purpose === 'wallet_topup'
          ? await settleWalletTopup({
              paymentId,
              actor:
                runtimeUser.email ||
                runtimeUser.uid,
              providerStatus:
                'MANUALLY_VERIFIED',
              providerStatusDescription:
                'Manual EcoCash USD wallet top-up verified by Runtime administrator.',
              transactionId:
                transactionId ||
                undefined,
            })
          : await settleOrderPayment({
              paymentId,
              actor:
                runtimeUser.email ||
                runtimeUser.uid,
              providerStatus:
                'MANUALLY_VERIFIED',
              providerStatusDescription:
                'Manual EcoCash USD payment verified by Runtime administrator.',
              transactionId:
                transactionId ||
                undefined,
            });

      return res.json({
        success: true,
        purpose,
        ...result,
      });
    } catch (error) {
      console.error(
        'Manual payment approval error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to approve payment.';

      const status =
        message === 'Payment not found.'
          ? 404
          : message.includes(
              'can no longer be marked paid'
            )
            ? 409
            : 500;

      return res.status(status).json({
        success: false,
        message,
      });
    }
  }
);

router.post(
  '/admin/manual/reject',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const runtimeUser =
        req.runtimeUser!;

      if (
        runtimeUser.role !==
        'super_admin'
      ) {
        return res.status(403).json({
          success: false,
          message:
            'Super admin permission required.',
        });
      }

      const paymentId =
        typeof req.body?.paymentId ===
        'string'
          ? req.body.paymentId.trim()
          : '';

      const reason =
        typeof req.body?.reason ===
        'string' &&
        req.body.reason.trim()
          ? req.body.reason.trim()
          : 'Payment could not be verified.';

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message:
            'Payment ID is required.',
        });
      }

      const paymentRef =
        adminDb
          .collection('payments')
          .doc(paymentId);

      const now =
        new Date().toISOString();

      const result =
        await adminDb.runTransaction(
          async (transaction) => {
            const paymentDoc =
              await transaction.get(
                paymentRef
              );

            if (!paymentDoc.exists) {
              throw new Error(
                'Payment not found.'
              );
            }

            const payment =
              paymentDoc.data()!;

            if (
              payment.gateway !==
              'ecocash_usd'
            ) {
              throw new Error(
                'Only manual EcoCash USD payments can be rejected manually.'
              );
            }

            if (
              payment.status ===
              'verified'
            ) {
              throw new Error(
                'A verified payment cannot be rejected.'
              );
            }

            const purpose =
              payment.purpose ===
                'wallet_topup'
                ? 'wallet_topup'
                : 'order_payment';

            const orderId =
              String(
                payment.order_id || ''
              ).trim();

            let orderRef:
              FirebaseFirestore.DocumentReference | null =
              null;

            let order:
              FirebaseFirestore.DocumentData | null =
              null;

            if (
              purpose === 'order_payment'
            ) {
              if (!orderId) {
                throw new Error(
                  'Payment is not linked to an order.'
                );
              }

              orderRef =
                adminDb
                  .collection('orders')
                  .doc(orderId);

              const orderDoc =
                await transaction.get(
                  orderRef
                );

              if (!orderDoc.exists) {
                throw new Error(
                  'Order linked to payment was not found.'
                );
              }

              order =
                orderDoc.data()!;
            }

            transaction.set(
              paymentRef,
              {
                status: 'rejected',
                rejection_reason:
                  reason,
                rejected_at:
                  payment.rejected_at ||
                  now,
                rejected_by:
                  runtimeUser.uid,
                updated_at: now,
              },
              { merge: true }
            );

            /*
             * Rejecting one attempt does not cancel the order.
             * The customer remains free to try another method.
             */
          if (
  purpose === 'order_payment' &&
  orderRef !== null &&
  order !== null &&
  order.status ===
    'payment_pending'
) {
  transaction.set(
    orderRef,
    {
      status: 'pending',
      updated_at: now,
    },
    { merge: true }
  );
}

            return {
              paymentId,
              orderId,
            };
          }
        );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'Manual payment rejection error:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to reject payment.';

      const status =
        message === 'Payment not found.'
          ? 404
          : message.includes('cannot be rejected') ||
              message.includes(
                'Only manual EcoCash'
              )
            ? 409
            : 500;

      return res.status(status).json({
        success: false,
        message,
      });
    }
  }
);



/*
 * ----------------------------------------------------------
 * CREATE MANUAL ECOCASH WALLET TOP-UP
 * ----------------------------------------------------------
 *
 * This only creates a pending payment attempt.
 * Runtime Credit is added only after an administrator verifies
 * the payment through /admin/manual/approve.
 */

router.post(
  '/wallet/ecocash',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const runtimeUser =
        req.runtimeUser!;

      const amount =
        Number(
          req.body?.amount
        );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Top-up amount must be greater than zero.',
        });
      }

      const roundedAmount =
        Math.round(
          (amount + Number.EPSILON) *
          100
        ) / 100;

      const now =
        new Date().toISOString();

      const paymentRef =
        adminDb
          .collection('payments')
          .doc();

      const payment = {
        id: paymentRef.id,
        purpose: 'wallet_topup',
        user_id:
          runtimeUser.uid,
        reference:
          `RT-CREDIT-${Date.now()
            .toString(36)
            .toUpperCase()}`,
        amount:
          roundedAmount,
        currency: 'USD',
        gateway:
          'ecocash_usd',
        status: 'pending',
        customer_confirmed_payment:
          false,
        created_at: now,
        updated_at: now,
      };

      await paymentRef.set(
        payment
      );

      return res.json({
        success: true,
        paymentId:
          paymentRef.id,
        payment,
      });
    } catch (error) {
      console.error(
        'EcoCash wallet top-up error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to prepare Runtime Credit top-up.',
      });
    }
  }
);


/*
 * ----------------------------------------------------------
 * CREATE / RETRY MANUAL ECOCASH PAYMENT FOR EXISTING ORDER
 * ----------------------------------------------------------
 *
 * This endpoint exists so customer retries do not write
 * directly to Firestore. Firebase Admin performs the write
 * after verifying the authenticated user owns the order.
 */
router.post(
  '/order/ecocash',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const orderId =
        typeof req.body?.orderId ===
        'string'
          ? req.body.orderId.trim()
          : '';

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message:
            'Order ID is required.',
        });
      }

      const runtimeUser =
        req.runtimeUser!;

      const orderRef =
        adminDb
          .collection('orders')
          .doc(orderId);

      const orderDoc =
        await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            'Order not found.',
        });
      }

      const order =
        orderDoc.data()!;

      if (
        order.user_id !==
        runtimeUser.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You may only pay for your own order.',
        });
      }

      if (
        order.status === 'paid' ||
        order.status ===
          'completed'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This order has already been paid.',
        });
      }

      if (
        order.status ===
          'cancelled' ||
        order.status ===
          'refunded'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This order can no longer be paid.',
        });
      }

      const amount =
        Number(order.total);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This order has an invalid amount.',
        });
      }

      const existingPayments =
        await adminDb
          .collection('payments')
          .where(
            'order_id',
            '==',
            orderId
          )
          .get();

      const activeManual =
        existingPayments.docs.find(
          (doc) => {
            const data =
              doc.data();

            return (
              data.gateway ===
                'ecocash_usd' &&
              (
                data.status ===
                  'pending' ||
                data.status ===
                  'pending_verification'
              )
            );
          }
        );

      if (activeManual) {
        return res.json({
          success: true,
          paymentId:
            activeManual.id,
          payment:
            activeManual.data(),
          reused: true,
        });
      }

      const now =
        new Date()
          .toISOString();

      const paymentRef =
        adminDb
          .collection('payments')
          .doc();

      const payment = {
        id: paymentRef.id,
        purpose: 'order_payment',
        order_id: orderId,
        user_id:
          runtimeUser.uid,
        reference:
          `RT-ECO-${Date.now()
            .toString(36)
            .toUpperCase()}`,
        amount,
        currency:
          String(
            order.currency ||
              'USD'
          ).toUpperCase(),
        gateway:
          'ecocash_usd',
        status: 'pending',
        customer_confirmed_payment:
          false,
        created_at: now,
        updated_at: now,
      };

      const batch =
        adminDb.batch();

      batch.set(
        paymentRef,
        payment
      );

      batch.set(
        orderRef,
        {
          status:
            'payment_pending',
          updated_at: now,
        },
        { merge: true }
      );

      const domainSnapshot =
        await adminDb
          .collection('domains')
          .where(
            'order_id',
            '==',
            orderId
          )
          .limit(1)
          .get();

      if (!domainSnapshot.empty) {
        batch.set(
          domainSnapshot.docs[0].ref,
          {
            payment_id:
              paymentRef.id,
            updated_at: now,
          },
          { merge: true }
        );
      }

      await batch.commit();

      return res.json({
        success: true,
        paymentId:
          paymentRef.id,
        payment,
        reused: false,
      });
    } catch (error) {
      console.error(
        'EcoCash order payment error:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to prepare EcoCash payment.',
      });
    }
  }
);

/*
 * ----------------------------------------------------------
 * INITIATE PESEPAY ECOCASH USD PAYMENT
 * ----------------------------------------------------------
 */

router.post(
  '/pesepay/initiate',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    let paymentId = '';
    let orderId = '';
    let previousOrderStatus =
      'pending';

    try {
      const body =
        req.body ?? {};

      orderId =
        typeof body.orderId ===
        'string'
          ? body.orderId.trim()
          : '';

      const paymentMethodCode =
        typeof body.paymentMethodCode ===
        'string'
          ? body.paymentMethodCode.trim()
          : '';

      const customerPhoneNumber =
        typeof body.customerPhoneNumber ===
        'string'
          ? body.customerPhoneNumber.trim()
          : '';

      if (!orderId || !paymentMethodCode) {
        return res.status(400).json({
          success: false,
          message:
            'Order ID and PesePay payment method are required.',
        });
      }

      const runtimeUser =
        req.runtimeUser!;

      const orderRef =
        adminDb
          .collection('orders')
          .doc(orderId);

      const orderDoc =
        await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).json({
          success: false,
          message:
            'Order not found.',
        });
      }

      const order =
        orderDoc.data()!;

      if (
        order.user_id !==
        runtimeUser.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You may only pay for your own order.',
        });
      }

      if (
        order.status === 'paid' ||
        order.status === 'completed'
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This order has already been paid.',
        });
      }

      /*
       * IMPORTANT:
       * An unpaid order is ALWAYS allowed to start another
       * payment attempt.
       *
       * `payment_pending` describes the order's current
       * payment state. It must never be used as a lock.
       * Previous attempts can be abandoned, fail on the
       * customer's phone, time out, or remain stale at the
       * provider.
       *
       * Before creating the replacement attempt, retire any
       * older local PesePay attempts that are still marked
       * pending. This keeps Runtime's local state honest and
       * prevents stale attempts from blocking checkout.
       */
      if (
        order.status ===
        'payment_pending'
      ) {
        const previousAttempts =
          await adminDb
            .collection('payments')
            .where(
              'order_id',
              '==',
              orderId
            )
            .get();

        const staleBatch =
          adminDb.batch();

        let hasStaleUpdates =
          false;

        for (
          const attempt of
          previousAttempts.docs
        ) {
          const attemptData =
            attempt.data();

          if (
            attemptData.gateway ===
              'pesepay' &&
            (
              attemptData.status ===
                'pending' ||
              attemptData.status ===
                'pending_verification'
            )
          ) {
            staleBatch.set(
              attempt.ref,
              {
                status: 'failed',
                rejection_reason:
                  'Previous payment attempt was replaced by a new customer retry.',
                replaced_at:
                  new Date()
                    .toISOString(),
                updated_at:
                  new Date()
                    .toISOString(),
              },
              { merge: true }
            );

            hasStaleUpdates =
              true;
          }
        }

        if (hasStaleUpdates) {
          await staleBatch.commit();
        }
      }

      const amount =
        Number(order.total);

      const currency =
        String(
          order.currency || 'USD'
        ).toUpperCase();

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'This order has an invalid payment amount.',
        });
      }

      if (currency !== 'USD') {
        return res.status(400).json({
          success: false,
          message:
            'This PesePay payment requires a USD order.',
        });
      }

      const availableMethods =
        await fetchPesePayMethods(
          currency
        );

      const selectedMethod =
        availableMethods.find(
          (method) =>
            method.code ===
            paymentMethodCode
        );

      if (!selectedMethod) {
        return res.status(400).json({
          success: false,
          message:
            'That PesePay payment method is not currently available.',
        });
      }

      if (
        selectedMethod.requiresPhone &&
        !customerPhoneNumber
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${selectedMethod.name} phone number is required.`,
        });
      }

      const orderReference =
        String(
          order.reference || ''
        ).trim();

      if (!orderReference) {
        return res.status(400).json({
          success: false,
          message:
            'This order has no payment reference.',
        });
      }

      const customerEmail =
        String(
          order.user_email ||
            runtimeUser.email
        ).trim();

      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message:
            'Customer email is missing.',
        });
      }

      previousOrderStatus =
        String(
          order.status || 'pending'
        );

      const previousPendingPayments =
        await adminDb
          .collection('payments')
          .where(
            'order_id',
            '==',
            orderId
          )
          .get();

      const retryBatch =
        adminDb.batch();

      previousPendingPayments.docs
        .filter((doc) => {
          const data =
            doc.data();

          return (
            data.gateway ===
              'pesepay' &&
            (
              data.status ===
                'pending' ||
              data.status ===
                'failed'
            )
          );
        })
        .forEach((doc) => {
          const data =
            doc.data();

          if (
            data.status ===
            'pending'
          ) {
            retryBatch.set(
              doc.ref,
              {
                status: 'failed',
                rejection_reason:
                  'Replaced by a new payment attempt.',
                updated_at:
                  new Date()
                    .toISOString(),
              },
              { merge: true }
            );
          }
        });

      await retryBatch.commit();

      const paymentRef =
        adminDb
          .collection('payments')
          .doc();

      paymentId =
        paymentRef.id;

      const merchantReference =
        `${orderReference}-${paymentId.slice(0, 8)}`;

      const reasonForPayment =
        order.items?.[0]?.description
          ? String(
              order.items[0]
                .description
            )
          : `Runtime order ${orderReference}`;

      const now =
        new Date().toISOString();

      const batch =
        adminDb.batch();

      batch.set(
        paymentRef,
        {
          id: paymentId,
          purpose: 'order_payment',
          order_id: orderId,
          user_id: runtimeUser.uid,
          reference:
            merchantReference,
          amount,
          currency,
          gateway: 'pesepay',
          provider_payment_method:
            selectedMethod.code,
          provider_payment_method_name:
            selectedMethod.name,
          provider_payment_flow:
            selectedMethod.seamless
              ? 'seamless'
              : 'redirect',
          status: 'pending',
          customer_confirmed_payment:
            false,
          created_at: now,
          updated_at: now,
        }
      );

      batch.update(
        orderRef,
        {
          status:
            'payment_pending',
          updated_at: now,
        }
      );

      const domainSnapshot =
        await adminDb
          .collection('domains')
          .where(
            'order_id',
            '==',
            orderId
          )
          .limit(1)
          .get();

      if (!domainSnapshot.empty) {
        batch.set(
          domainSnapshot.docs[0].ref,
          {
            payment_id:
              paymentId,
            updated_at:
              now,
          },
          { merge: true }
        );
      }

      await batch.commit();

      const {
        integrationKey,
        encryptionKey,
      } = getPesePayCredentials();

      const apiBaseUrl =
        process.env.RUNTIME_API_URL ||
        'https://runtime-api-my3q.onrender.com';

      const frontendUrl =
        process.env.RUNTIME_FRONTEND_URL ||
        'https://runtime.co.zw';

      const resultUrl =
        `${apiBaseUrl}/api/payments/pesepay/result?paymentId=${encodeURIComponent(
          paymentId
        )}`;

      const returnUrl =
        `${frontendUrl}/dashboard`;

      const customer = {
        email: customerEmail,
        phoneNumber:
          customerPhoneNumber ||
          String(
            order.customer_phone ||
              ''
          ),
        name: runtimeUser.name,
      };

      const paymentBody =
        selectedMethod.seamless
          ? {
              amountDetails: {
                amount,
                currencyCode:
                  currency,
              },
              merchantReference,
              reasonForPayment,
              resultUrl,
              returnUrl,
              paymentMethodCode:
                selectedMethod.code,
              customer,
              paymentMethodRequiredFields:
                selectedMethod.requiresPhone
                  ? {
                      customerPhoneNumber,
                    }
                  : {},
            }
          : {
              amountDetails: {
                amount,
                currencyCode:
                  currency,
              },
              merchantReference,
              reasonForPayment,
              resultUrl,
              returnUrl,
              customer,
            };

      const encryptedPayload =
        encryptPayload(
          paymentBody,
          encryptionKey
        );

      const providerUrl =
        selectedMethod.seamless
          ? PESEPAY_MAKE_PAYMENT_URL
          : PESEPAY_INITIATE_URL;

      const response =
        await nodeFetch(
          providerUrl,
          {
            method: 'POST',
            headers: {
              authorization:
                integrationKey,
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              payload:
                encryptedPayload,
            }),
            insecureHTTPParser: true,
          }
        );

      let responseBody: any;

      try {
        responseBody =
          await response.json();
      } catch {
        responseBody = null;
      }

      if (!response.ok) {
        console.error(
          'PesePay initiation failed:',
          response.status,
          responseBody
        );

        await markInitiationFailed(
          paymentId,
          orderId,
          previousOrderStatus,
          `PesePay initiation failed with HTTP ${response.status}.`
        );

        return res.status(502).json({
          success: false,
          message:
            'PesePay could not initiate the payment.',
        });
      }

      if (
        !responseBody ||
        typeof responseBody.payload !==
          'string' ||
        !responseBody.payload
      ) {
        await markInitiationFailed(
          paymentId,
          orderId,
          previousOrderStatus,
          'PesePay returned an invalid response.'
        );

        return res.status(502).json({
          success: false,
          message:
            'PesePay returned an invalid response.',
        });
      }

      const transaction =
        decryptPayload(
          responseBody.payload,
          encryptionKey
        );

      if (
        !transaction.referenceNumber
      ) {
        await markInitiationFailed(
          paymentId,
          orderId,
          previousOrderStatus,
          'PesePay response did not include a reference number.'
        );

        return res.status(502).json({
          success: false,
          message:
            'PesePay returned an incomplete transaction.',
        });
      }

      await paymentRef.set(
        {
          provider_reference:
            transaction.referenceNumber,
          transaction_id:
            transaction.internalReference ||
            transaction.referenceNumber,
          provider_status:
            transaction.transactionStatus ||
            'INITIATED',
          provider_status_description:
            transaction.transactionStatusDescription ||
            '',
          pesepay_poll_url:
            transaction.pollUrl || '',
          redirect_url:
            transaction.redirectUrl || '',
          updated_at:
            new Date().toISOString(),
        },
        { merge: true }
      );

      return res.json({
        success: true,
        paymentId,
        orderId,
        transaction: {
          referenceNumber:
            transaction.referenceNumber,
          transactionStatus:
            transaction.transactionStatus,
          redirectRequired:
            Boolean(
              transaction.redirectRequired
            ),
          redirectUrl:
            transaction.redirectUrl ||
            null,
          pollUrl:
            transaction.pollUrl || null,
          flow:
            selectedMethod.seamless
              ? 'seamless'
              : 'redirect',
          paymentMethodCode:
            selectedMethod.code,
          paymentMethodName:
            selectedMethod.name,
        },
      });
    } catch (error) {
      console.error(
        'PesePay initiation error:',
        error
      );

      if (
        paymentId &&
        orderId
      ) {
        try {
          await markInitiationFailed(
            paymentId,
            orderId,
            previousOrderStatus,
            'Unable to initiate PesePay payment.'
          );
        } catch (cleanupError) {
          console.error(
            'Unable to clean up failed PesePay initiation:',
            cleanupError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message:
          'Unable to initiate PesePay payment.',
      });
    }
  }
);

export default router;

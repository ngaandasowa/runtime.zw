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
  fulfillPaidOrder,
} from '../services/OrderFulfillmentService.js';

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
    !orderId ||
    !providerReference
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
    const result =
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

          const freshPaymentData =
            freshPayment.data()!;

          const orderRef =
            adminDb
              .collection('orders')
              .doc(
                String(
                  freshPaymentData
                    .order_id
                )
              );

          const freshOrder =
            await transaction.get(
              orderRef
            );

          if (!freshOrder.exists) {
            throw new Error(
              'Order linked to payment was not found.'
            );
          }

          const order =
            freshOrder.data()!;

          if (
            order.status ===
              'cancelled' ||
            order.status ===
              'refunded'
          ) {
            throw new Error(
              'This order can no longer be marked paid.'
            );
          }

          transaction.set(
            paymentRef,
            {
              status:
                'verified',
              provider_status:
                providerStatus ||
                'SUCCESS',
              provider_status_description:
                providerDescription,
              transaction_id:
                providerInternalReference,
              verified_at:
                freshPaymentData
                  .verified_at ||
                now,
              rejection_reason:
                null,
              updated_at:
                now,
            },
            { merge: true }
          );

          if (
            order.status !==
              'paid' &&
            order.status !==
              'completed'
          ) {
            transaction.update(
              orderRef,
              {
                status:
                  'paid',
                paid_at:
                  order.paid_at ||
                  now,
                updated_at:
                  now,
              }
            );
          }

          /*
           * Payment settlement ends with the order becoming
           * paid. Product-specific work is delegated to the
           * fulfillment layer.
           */
          await fulfillPaidOrder({
            transaction,
            orderRef,
            order,
            paymentId,
            now,
            actor: 'PesePay',
          });

          return {
            orderId:
              orderRef.id,
          };
        }
      );

    return {
      verified: true,
      paymentState:
        'success',
      terminal: true,
      paymentId,
      orderId:
        result.orderId,
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

      const orderRef =
        adminDb
          .collection('orders')
          .doc(orderId);

      const freshOrder =
        await transaction.get(
          orderRef
        );

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
        paymentState ===
          'failed' &&
        freshOrder.exists &&
        freshOrder.data()
          ?.status ===
          'payment_pending'
      ) {
        transaction.set(
          orderRef,
          {
            status:
              'pending',
            updated_at:
              now,
          },
          { merge: true }
        );
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

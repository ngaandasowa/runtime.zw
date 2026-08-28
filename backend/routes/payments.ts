import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

import crypto from 'crypto';

import {
  adminAuth,
  adminDb,
} from '../firebaseAdmin.js';

const router = Router();

const PESEPAY_API_URL =
  'https://api.pesepay.com/api/payments-engine/v2/payments/make-payment';

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
    await fetch(
      url,
      {
        method: 'GET',
        headers: {
          authorization:
            integrationKey,
          Accept:
            'application/json',
        },
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

      const paymentRef =
        adminDb
          .collection('payments')
          .doc(paymentId);

      const paymentDoc =
        await paymentRef.get();

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

      const orderId =
        String(
          payment.order_id || ''
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
        return res.status(409).json({
          success: false,
          message:
            'The PesePay transaction is not ready for verification yet.',
        });
      }

      const providerTransaction =
        await fetchPesePayStatus(
          providerReference
        );

      const providerStatus =
        String(
          providerTransaction
            .transactionStatus || ''
        )
          .trim()
          .toUpperCase();

      const providerDescription =
        String(
          providerTransaction
            .transactionStatusDescription ||
          ''
        );

      const providerInternalReference =
        String(
          providerTransaction
            .internalReference ||
          providerReference
        );

      const now =
        new Date().toISOString();

      /*
       * SUCCESS is the only status that can
       * move money/order state to paid.
       */
      if (
        providerStatus ===
        'SUCCESS'
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

              /*
               * Idempotency:
               * repeated verification of the same
               * successful payment is harmless.
               */
              transaction.set(
                paymentRef,
                {
                  status:
                    'verified',
                  provider_status:
                    providerStatus,
                  provider_status_description:
                    providerDescription,
                  transaction_id:
                    providerInternalReference,
                  verified_at:
                    freshPaymentData
                      .verified_at ||
                    now,
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

              return {
                orderId:
                  orderRef.id,
              };
            }
          );

        return res.json({
          success: true,
          verified: true,
          paymentId,
          orderId:
            result.orderId,
          transactionStatus:
            providerStatus,
          transactionStatusDescription:
            providerDescription,
        });
      }

      /*
       * Do not guess which non-success statuses
       * are terminal. Keep the payment pending
       * while recording PesePay's latest status.
       */
      await paymentRef.set(
        {
          provider_status:
            providerStatus ||
            'UNKNOWN',
          provider_status_description:
            providerDescription,
          transaction_id:
            providerInternalReference,
          updated_at:
            now,
        },
        { merge: true }
      );

      return res.json({
        success: true,
        verified: false,
        paymentId,
        orderId,
        transactionStatus:
          providerStatus ||
          'UNKNOWN',
        transactionStatusDescription:
          providerDescription,
      });
    } catch (error) {
      console.error(
        'PesePay verification error:',
        error
      );

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

      const customerPhoneNumber =
        typeof body.customerPhoneNumber ===
        'string'
          ? body.customerPhoneNumber.trim()
          : '';

      if (
        !orderId ||
        !customerPhoneNumber
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Order ID and phone number are required.',
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

      if (
        order.status ===
        'payment_pending'
      ) {
        return res.status(409).json({
          success: false,
          message:
            'A payment is already pending for this order.',
        });
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
            'EcoCash USD payments require a USD order.',
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

      const paymentBody = {
        amountDetails: {
          amount,
          currencyCode: currency,
        },
        merchantReference,
        reasonForPayment,
        resultUrl,
        returnUrl,
        paymentMethodCode:
          'PZW211',
        customer: {
          email: customerEmail,
          phoneNumber:
            customerPhoneNumber,
          name: runtimeUser.name,
        },
        paymentMethodRequiredFields: {
          customerPhoneNumber,
        },
      };

      const encryptedPayload =
        encryptPayload(
          paymentBody,
          encryptionKey
        );

      const response =
        await fetch(
          PESEPAY_API_URL,
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

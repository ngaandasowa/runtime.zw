import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

import { createHash } from 'node:crypto';

import {
  adminAuth,
  adminDb,
} from '../firebaseAdmin.js';

import {
  emailService,
} from '../email/emailService.js';

import {
  EmailEvent,
  EmailEventData,
} from '../email/templates.js';

type RuntimeUser = {
  uid: string;
  email: string;
  role: string;
};

type AuthenticatedRequest =
  Request & {
    runtimeUser?: RuntimeUser;
  };

const router =
  Router();


const claimNameserverNotification =
  async (
    runtimeUser: RuntimeUser,
    data: EmailEventData
  ) => {
    /*
     * Short-window idempotency for nameserver-change emails.
     * This protects against double clicks, repeated client requests,
     * browser retries and duplicate endpoint calls without blocking
     * a legitimate future change forever.
     */
    const bucketMs =
      5 * 60 * 1000;

    const bucket =
      Math.floor(
        Date.now() /
        bucketMs
      );

    const normalizedNameservers =
      Array.isArray(
        data.nameservers
      )
        ? data.nameservers
            .map(
              (item) =>
                String(item)
                  .trim()
                  .replace(/\.$/, '')
                  .toLowerCase()
            )
            .filter(Boolean)
        : [];

    const fingerprint =
      [
        runtimeUser.uid,
        data.email
          .trim()
          .toLowerCase(),
        String(
          data.domainName ||
          ''
        )
          .trim()
          .toLowerCase(),
        normalizedNameservers
          .join(','),
        String(bucket),
      ].join('|');

    const id =
      createHash('sha256')
        .update(
          fingerprint
        )
        .digest('hex');

    const ref =
      adminDb
        .collection(
          'email_notification_dedupe'
        )
        .doc(
          `nameserver-${id}`
        );

    return adminDb.runTransaction(
      async (
        transaction
      ) => {
        const existing =
          await transaction.get(
            ref
          );

        if (
          existing.exists
        ) {
          return {
            claimed: false,
            ref,
          };
        }

        transaction.create(
          ref,
          {
            event:
              'nameserver_change_requested',
            uid:
              runtimeUser.uid,
            email:
              data.email,
            domain_name:
              data.domainName ||
              '',
            nameservers:
              normalizedNameservers,
            created_at:
              new Date()
                .toISOString(),
            expires_at:
              new Date(
                Date.now() +
                bucketMs * 2
              )
                .toISOString(),
          }
        );

        return {
          claimed: true,
          ref,
        };
      }
    );
  };

const supportedEvents:
  EmailEvent[] = [
    'domain_order_created',
    'renewal_order_created',
    'order_cancelled',
    'payment_approved',
    'payment_rejected',
    'renewal_completed',
    'domain_activated',
    'domain_assigned',
    'domain_replaced',
    'nameserver_change_requested',
    'domain_modify_requested',
    'domain_delete_requested',
    'domain_transfer_requested',
    'wallet_credit_added',
    'runtime_credit_applied',
    'domain_expiry_60_day',
    'domain_expiry_30_day',
    'domain_renewal_payment_reminder',
    'domain_expired',
    'domain_grace_period_ended',
  ];

const adminOnlyEvents =
  new Set<EmailEvent>([
    'payment_approved',
    'payment_rejected',
    'renewal_completed',
    'domain_activated',
    'domain_assigned',
    'domain_replaced',
    'wallet_credit_added',
    'runtime_credit_applied',
    'domain_expiry_60_day',
    'domain_expiry_30_day',
    'domain_renewal_payment_reminder',
    'domain_expired',
    'domain_grace_period_ended',
  ]);

const domainRequiredEvents =
  new Set<EmailEvent>([
    'domain_order_created',
    'renewal_order_created',
    'renewal_completed',
    'domain_activated',
    'domain_assigned',
    'domain_replaced',
    'nameserver_change_requested',
    'domain_modify_requested',
    'domain_delete_requested',
    'domain_transfer_requested',
    'domain_expiry_60_day',
    'domain_expiry_30_day',
    'domain_renewal_payment_reminder',
    'domain_expired',
    'domain_grace_period_ended',
  ]);

/*
 * ----------------------------------------------------------
 * AUTHENTICATION
 * ----------------------------------------------------------
 */

const authenticate =
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const header =
        req.headers.authorization;

      if (
        !header?.startsWith(
          'Bearer '
        )
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              'Authentication required.',
          });
      }

      const token =
        header.slice(7);

      const decoded =
        await adminAuth
          .verifyIdToken(
            token
          );

      const profile =
        await adminDb
          .collection(
            'users'
          )
          .doc(
            decoded.uid
          )
          .get();

      const role =
        profile.exists
          ? String(
              profile.data()
                ?.role ||
                'customer'
            )
          : 'customer';

      req.runtimeUser = {
        uid:
          decoded.uid,

        email:
          decoded.email ||
          '',

        role,
      };

      next();
    } catch (error) {
      console.error(
        'Email authentication failed:',
        error
      );

      return res
        .status(401)
        .json({
          success: false,
          message:
            'Invalid authentication token.',
        });
    }
  };

/*
 * ----------------------------------------------------------
 * EMAIL NOTIFICATION ENDPOINT
 * ----------------------------------------------------------
 */

router.post(
  '/notify',
  authenticate,

  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const {
        event,
        data,
      } =
        req.body ?? {};

      /*
       * Validate event.
       */
      if (
        !event ||
        !supportedEvents.includes(
          event
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Unknown email event.',
          });
      }

      /*
       * Validate required email data.
       */
      if (
        !data ||
        typeof data.email !==
          'string' ||
        !data.email.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Invalid notification payload.',
          });
      }

      if (
        domainRequiredEvents.has(
          event
        ) &&
        (
          typeof data.domainName !==
            'string' ||
          !data.domainName.trim()
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'Domain name is required for this notification.',
          });
      }

      const runtimeUser =
        req.runtimeUser!;

      const isSuperAdmin =
        runtimeUser.role ===
        'super_admin';

      /*
       * Certain lifecycle events may only
       * be triggered by a super admin.
       */
      if (
        adminOnlyEvents.has(
          event
        ) &&
        !isSuperAdmin
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'Administrator permission required.',
          });
      }

      /*
       * Normal customers may only trigger
       * notifications for their own
       * authenticated email address.
       *
       * Super admins may send lifecycle
       * notifications to customers while
       * processing orders.
       */
      if (
        !isSuperAdmin &&
        data.email
          .trim()
          .toLowerCase() !==
          runtimeUser.email
            .trim()
            .toLowerCase()
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              'You may only send notifications for your own account.',
          });
      }

      let nameserverDedupe:
        {
          claimed: boolean;
          ref:
            FirebaseFirestore.DocumentReference;
        } |
        null = null;

      if (
        event ===
        'nameserver_change_requested'
      ) {
        nameserverDedupe =
          await claimNameserverNotification(
            runtimeUser,
            data as EmailEventData
          );

        if (
          !nameserverDedupe
            .claimed
        ) {
          return res.json({
            success: true,
            deduplicated:
              true,
          });
        }
      }

      /*
       * Send transactional email.
       */
      try {
        await emailService
          .sendEvent(
            event as EmailEvent,
            data as EmailEventData
          );
      } catch (error) {
        /*
         * If sending genuinely fails, release the dedupe claim so a
         * later retry is allowed.
         */
        if (
          nameserverDedupe
            ?.claimed
        ) {
          await nameserverDedupe
            .ref
            .delete()
            .catch(
              () => undefined
            );
        }

        throw error;
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        'Email notification failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            'Unable to send notification email.',
        });
    }
  }
);

export default router;
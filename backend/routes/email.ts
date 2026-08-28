import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

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
    'nameserver_change_requested',
    'domain_modify_requested',
    'domain_delete_requested',
    'domain_transfer_requested',
  ];

const adminOnlyEvents =
  new Set<EmailEvent>([
    'payment_approved',
    'payment_rejected',
    'renewal_completed',
    'domain_activated',
    'domain_assigned',
  ]);

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
            success:
              false,

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
          success:
            false,

          message:
            'Invalid authentication token.',
        });
    }
  };

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

      if (
        !event ||
        !supportedEvents.includes(
          event
        )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Unknown email event.',
          });
      }

      if (
        !data ||
        typeof data.email !==
          'string' ||
        typeof data.domainName !==
          'string' ||
        !data.email.trim() ||
        !data.domainName.trim()
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              'Invalid notification payload.',
          });
      }

      const runtimeUser =
        req.runtimeUser!;

      const isSuperAdmin =
        runtimeUser.role ===
        'super_admin';

      if (
        adminOnlyEvents.has(
          event
        ) &&
        !isSuperAdmin
      ) {
        return res
          .status(403)
          .json({
            success:
              false,

            message:
              'Administrator permission required.',
          });
      }

      /*
       * Normal customers may only trigger mail
       * to the email address on their own
       * authenticated Firebase account.
       *
       * Super admins may send lifecycle mail
       * to customers while processing orders.
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
            success:
              false,

            message:
              'You may only send notifications for your own account.',
          });
      }

      await emailService
        .sendEvent(
          event as EmailEvent,
          data as EmailEventData
        );

      return res.json({
        success:
          true,
      });
    } catch (error) {
      console.error(
        'Email notification failed:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            'Unable to send notification email.',
        });
    }
  }
);

export default router;
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
  cleanupOrder,
  cleanupWalletTopup,
  runAbandonedCleanup,
} from '../services/AbandonedOrderCleanupService.js';

const router =
  Router();

type RuntimeUser = {
  uid: string;
  email: string;
  role: string;
};

type AuthenticatedRequest =
  Request & {
    runtimeUser?:
      RuntimeUser;
  };

const authenticate =
  async (
    req:
      AuthenticatedRequest,
    res:
      Response,
    next:
      NextFunction
  ) => {
    try {
      const header =
        req.headers
          .authorization;

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

      const decoded =
        await adminAuth
          .verifyIdToken(
            header.slice(7)
          );

      const profile =
        await adminDb
          .collection('users')
          .doc(decoded.uid)
          .get();

      req.runtimeUser = {
        uid:
          decoded.uid,
        email:
          decoded.email ||
          '',
        role:
          String(
            profile.data()
              ?.role ||
            'customer'
          ),
      };

      next();
    } catch (error) {
      console.error(
        'Cleanup authentication failed:',
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

const requireSuperAdmin =
  (
    req:
      AuthenticatedRequest,
    res:
      Response,
    next:
      NextFunction
  ) => {
    if (
      req.runtimeUser
        ?.role !==
      'super_admin'
    ) {
      return res
        .status(403)
        .json({
          success:
            false,
          message:
            'Super admin permission required.',
        });
    }

    next();
  };

router.delete(
  '/orders/:orderId',
  authenticate,
  requireSuperAdmin,
  async (
    req,
    res
  ) => {
    try {
      const result =
        await cleanupOrder(
          req.params
            .orderId
        );

      if (
        !result.cleaned
      ) {
        return res
          .status(400)
          .json({
            success:
              false,
            message:
              result.skippedReason ||
              'Order was not deleted.',
            result,
          });
      }

      return res.json({
        success:
          true,
        result,
      });
    } catch (error) {
      console.error(
        'Admin order cleanup failed:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to delete the order.',
        });
    }
  }
);

router.delete(
  '/wallet-topups/:paymentId',
  authenticate,
  requireSuperAdmin,
  async (
    req,
    res
  ) => {
    try {
      const result =
        await cleanupWalletTopup(
          req.params
            .paymentId
        );

      if (
        !result.cleaned
      ) {
        return res
          .status(400)
          .json({
            success:
              false,
            message:
              result.reason ||
              'Top-up could not be deleted.',
          });
      }

      return res.json({
        success:
          true,
      });
    } catch (error) {
      console.error(
        'Wallet top-up cleanup failed:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to delete the top-up.',
        });
    }
  }
);

router.post(
  '/run',
  authenticate,
  requireSuperAdmin,
  async (
    _req,
    res
  ) => {
    try {
      const result =
        await runAbandonedCleanup();

      return res.json({
        success:
          true,
        result,
      });
    } catch (error) {
      console.error(
        'Manual abandoned cleanup run failed:',
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to run cleanup.',
        });
    }
  }
);

export default router;

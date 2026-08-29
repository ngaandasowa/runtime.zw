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
  walletService,
} from '../services/WalletService.js';

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

const router =
  Router();

const authenticate = async (
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
      return res.status(401).json({
        success: false,
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
      'Wallet authentication failed:',
      error
    );

    return res.status(401).json({
      success: false,
      message:
        'Invalid authentication token.',
    });
  }
};

router.get(
  '/me',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const wallet =
        await walletService
          .getWallet(
            req.runtimeUser!.uid
          );

      return res.json({
        success: true,
        wallet,
      });
    } catch (error) {
      console.error(
        'Wallet load failed:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load Runtime Credit.',
      });
    }
  }
);

router.get(
  '/transactions',
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const requestedLimit =
        Number(
          req.query.limit ||
          50
        );

      const transactions =
        await walletService
          .listTransactions(
            req.runtimeUser!.uid,
            requestedLimit
          );

      return res.json({
        success: true,
        transactions,
      });
    } catch (error) {
      console.error(
        'Wallet transaction load failed:',
        error
      );

      return res.status(500).json({
        success: false,
        message:
          'Unable to load Runtime Credit history.',
      });
    }
  }
);

export default router;

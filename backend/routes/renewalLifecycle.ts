import {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';


import {
  authenticateWithProfile as authenticate,
} from '../middleware/authenticate.js';

import {
  renewalLifecycleService,
} from '../services/RenewalLifecycleService.js';

type RuntimeUser = {
  uid: string;
  email: string;
  role: string;
};

type AuthenticatedRequest =
  Request & {
    runtimeUser?: RuntimeUser;
  };

const router = Router();



const requireSuperAdmin =
  (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (
      req.runtimeUser?.role !==
      'super_admin'
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            'Super administrator permission required.',
        });
    }

    next();
  };

router.post(
  '/admin/run',
  authenticate,
  requireSuperAdmin,
  async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const simulatedDate =
        String(
          req.body?.simulatedDate ||
          ''
        ).trim();

      if (!simulatedDate) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              'A simulated date is required.',
          });
      }

      const result =
        await renewalLifecycleService
          .run(simulatedDate);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error(
        'Renewal lifecycle run failed:',
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to run renewal lifecycle.',
        });
    }
  }
);

export default router;

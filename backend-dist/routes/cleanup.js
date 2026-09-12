import { Router, } from 'express';
import { authenticateWithProfile as authenticate, } from '../middleware/authenticate.js';
import { cleanupOrder, cleanupWalletTopup, runAbandonedCleanup, } from '../services/AbandonedOrderCleanupService.js';
const router = Router();
const requireSuperAdmin = (req, res, next) => {
    if (req.runtimeUser
        ?.role !==
        'super_admin') {
        return res
            .status(403)
            .json({
            success: false,
            message: 'Super admin permission required.',
        });
    }
    next();
};
router.delete('/orders/:orderId', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const result = await cleanupOrder(req.params
            .orderId);
        if (!result.cleaned) {
            return res
                .status(400)
                .json({
                success: false,
                message: result.skippedReason ||
                    'Order was not deleted.',
                result,
            });
        }
        return res.json({
            success: true,
            result,
        });
    }
    catch (error) {
        console.error('Admin order cleanup failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to delete the order.',
        });
    }
});
router.delete('/wallet-topups/:paymentId', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const result = await cleanupWalletTopup(req.params
            .paymentId);
        if (!result.cleaned) {
            return res
                .status(400)
                .json({
                success: false,
                message: result.reason ||
                    'Top-up could not be deleted.',
            });
        }
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Wallet top-up cleanup failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to delete the top-up.',
        });
    }
});
router.post('/run', authenticate, requireSuperAdmin, async (_req, res) => {
    try {
        const result = await runAbandonedCleanup();
        return res.json({
            success: true,
            result,
        });
    }
    catch (error) {
        console.error('Manual abandoned cleanup run failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to run cleanup.',
        });
    }
});
export default router;

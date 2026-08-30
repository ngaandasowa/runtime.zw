import { Router, } from 'express';
import { adminAuth, adminDb, } from '../firebaseAdmin.js';
import { renewalLifecycleService, } from '../services/RenewalLifecycleService.js';
const router = Router();
const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return res
                .status(401)
                .json({
                success: false,
                message: 'Authentication required.',
            });
        }
        const decoded = await adminAuth
            .verifyIdToken(header.slice(7));
        const profile = await adminDb
            .collection('users')
            .doc(decoded.uid)
            .get();
        req.runtimeUser = {
            uid: decoded.uid,
            email: decoded.email || '',
            role: profile.exists
                ? String(profile.data()?.role ||
                    'customer')
                : 'customer',
        };
        next();
    }
    catch (error) {
        console.error('Renewal lifecycle authentication failed:', error);
        return res
            .status(401)
            .json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};
const requireSuperAdmin = (req, res, next) => {
    if (req.runtimeUser?.role !==
        'super_admin') {
        return res
            .status(403)
            .json({
            success: false,
            message: 'Super administrator permission required.',
        });
    }
    next();
};
router.post('/admin/run', authenticate, requireSuperAdmin, async (req, res) => {
    try {
        const simulatedDate = String(req.body?.simulatedDate ||
            '').trim();
        if (!simulatedDate) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'A simulated date is required.',
            });
        }
        const result = await renewalLifecycleService
            .run(simulatedDate);
        return res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('Renewal lifecycle run failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to run renewal lifecycle.',
        });
    }
});
export default router;

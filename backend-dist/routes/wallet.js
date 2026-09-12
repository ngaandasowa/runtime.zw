import { Router, } from 'express';
import { adminDb, } from '../firebaseAdmin.js';
import { authenticateWithProfile as authenticate, } from '../middleware/authenticate.js';
import { walletService, } from '../services/WalletService.js';
const router = Router();
router.get('/admin/:userId', authenticate, async (req, res) => {
    try {
        if (req.runtimeUser?.role !==
            'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Super admin access required.',
            });
        }
        const userId = String(req.params.userId || '').trim();
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Customer ID is required.',
            });
        }
        const userDoc = await adminDb
            .collection('users')
            .doc(userId)
            .get();
        if (!userDoc.exists) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found.',
            });
        }
        const wallet = await walletService
            .getWallet(userId);
        return res.json({
            success: true,
            wallet,
        });
    }
    catch (error) {
        console.error('Admin customer wallet load failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load customer Runtime Credit.',
        });
    }
});
router.get('/me', authenticate, async (req, res) => {
    try {
        const wallet = await walletService
            .getWallet(req.runtimeUser.uid);
        return res.json({
            success: true,
            wallet,
        });
    }
    catch (error) {
        console.error('Wallet load failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load Runtime Credit.',
        });
    }
});
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const requestedLimit = Number(req.query.limit ||
            50);
        const transactions = await walletService
            .listTransactions(req.runtimeUser.uid, requestedLimit);
        return res.json({
            success: true,
            transactions,
        });
    }
    catch (error) {
        console.error('Wallet transaction load failed:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load Runtime Credit history.',
        });
    }
});
export default router;

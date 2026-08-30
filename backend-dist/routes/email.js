import { Router, } from 'express';
import { adminAuth, adminDb, } from '../firebaseAdmin.js';
import { emailService, } from '../email/emailService.js';
const router = Router();
const supportedEvents = [
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
const adminOnlyEvents = new Set([
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
const domainRequiredEvents = new Set([
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
        const token = header.slice(7);
        const decoded = await adminAuth
            .verifyIdToken(token);
        const profile = await adminDb
            .collection('users')
            .doc(decoded.uid)
            .get();
        const role = profile.exists
            ? String(profile.data()
                ?.role ||
                'customer')
            : 'customer';
        req.runtimeUser = {
            uid: decoded.uid,
            email: decoded.email ||
                '',
            role,
        };
        next();
    }
    catch (error) {
        console.error('Email authentication failed:', error);
        return res
            .status(401)
            .json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};
/*
 * ----------------------------------------------------------
 * EMAIL NOTIFICATION ENDPOINT
 * ----------------------------------------------------------
 */
router.post('/notify', authenticate, async (req, res) => {
    try {
        const { event, data, } = req.body ?? {};
        /*
         * Validate event.
         */
        if (!event ||
            !supportedEvents.includes(event)) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Unknown email event.',
            });
        }
        /*
         * Validate required email data.
         */
        if (!data ||
            typeof data.email !==
                'string' ||
            !data.email.trim()) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Invalid notification payload.',
            });
        }
        if (domainRequiredEvents.has(event) &&
            (typeof data.domainName !==
                'string' ||
                !data.domainName.trim())) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Domain name is required for this notification.',
            });
        }
        const runtimeUser = req.runtimeUser;
        const isSuperAdmin = runtimeUser.role ===
            'super_admin';
        /*
         * Certain lifecycle events may only
         * be triggered by a super admin.
         */
        if (adminOnlyEvents.has(event) &&
            !isSuperAdmin) {
            return res
                .status(403)
                .json({
                success: false,
                message: 'Administrator permission required.',
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
        if (!isSuperAdmin &&
            data.email
                .trim()
                .toLowerCase() !==
                runtimeUser.email
                    .trim()
                    .toLowerCase()) {
            return res
                .status(403)
                .json({
                success: false,
                message: 'You may only send notifications for your own account.',
            });
        }
        /*
         * Send transactional email.
         */
        await emailService
            .sendEvent(event, data);
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Email notification failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: 'Unable to send notification email.',
        });
    }
});
export default router;

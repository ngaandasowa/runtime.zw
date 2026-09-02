import { Router, } from 'express';
import { adminAuth, adminDb, } from '../firebaseAdmin.js';
const router = Router();
const normalizeEmail = (email) => email
    .trim()
    .toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalizeEmail(email));
const authenticate = async (req, res, next) => {
    try {
        const header = req.headers
            .authorization;
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
        return next();
    }
    catch (error) {
        console.error('Admin user authentication failed:', error);
        return res
            .status(401)
            .json({
            success: false,
            message: 'Your session has expired. Sign in again.',
        });
    }
};
const requireSuperAdmin = (req, res) => {
    if (req.runtimeUser
        ?.role !==
        'super_admin') {
        res.status(403)
            .json({
            success: false,
            message: 'Super admin permission required.',
        });
        return false;
    }
    return true;
};
router.get('/', authenticate, async (req, res) => {
    if (!requireSuperAdmin(req, res)) {
        return;
    }
    try {
        const snapshot = await adminDb
            .collection('users')
            .get();
        const firestoreUsers = snapshot.docs.map((item) => ({
            ...item.data(),
            id: item.data()
                ?.id ||
                item.id,
        }));
        /*
         * Firebase Auth is authoritative for whether an email
         * identity is actually verified.
         *
         * Firestore can contain an old email_verified_at value,
         * especially for customers that originally signed in
         * with Google before verification syncing was added.
         */
        const authUsers = new Map();
        const BATCH_SIZE = 100;
        for (let index = 0; index <
            firestoreUsers.length; index +=
            BATCH_SIZE) {
            const batch = firestoreUsers
                .slice(index, index +
                BATCH_SIZE)
                .map((user) => ({
                uid: String(user.id),
            }));
            if (batch.length ===
                0) {
                continue;
            }
            const result = await adminAuth
                .getUsers(batch);
            for (const firebaseUser of result.users) {
                authUsers.set(firebaseUser.uid, {
                    emailVerified: firebaseUser
                        .emailVerified,
                    providerIds: firebaseUser
                        .providerData
                        .map((provider) => provider.providerId),
                });
            }
        }
        const now = new Date()
            .toISOString();
        const users = await Promise.all(firestoreUsers.map(async (user) => {
            const authState = authUsers.get(String(user.id));
            if (!authState) {
                return user;
            }
            /*
             * Do not infer verification from "@gmail.com".
             * A Gmail address may have been registered using
             * email/password.
             *
             * Firebase emailVerified is the source of truth.
             */
            const verified = authState
                .emailVerified ===
                true;
            const nextVerifiedAt = verified
                ? user
                    .email_verified_at ||
                    now
                : null;
            const nextUser = {
                ...user,
                email_verified_at: nextVerifiedAt,
                auth_providers: authState
                    .providerIds,
            };
            if (nextVerifiedAt !==
                (user
                    .email_verified_at ||
                    null)) {
                await adminDb
                    .collection('users')
                    .doc(String(user.id))
                    .set({
                    email_verified_at: nextVerifiedAt,
                    updated_at: now,
                }, {
                    merge: true,
                });
            }
            return nextUser;
        }));
        return res.json({
            success: true,
            users,
        });
    }
    catch (error) {
        console.error('Unable to load synced admin users:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: 'Unable to load customer accounts.',
        });
    }
});
router.patch('/:uid/admin-verification', authenticate, async (req, res) => {
    if (!requireSuperAdmin(req, res)) {
        return;
    }
    try {
        const uid = String(req.params.uid ||
            '').trim();
        const verified = req.body?.verified ===
            true;
        const reason = typeof req.body
            ?.reason ===
            'string'
            ? req.body.reason
                .trim()
                .slice(0, 300)
            : '';
        if (!uid) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Customer ID is required.',
            });
        }
        const customerRef = adminDb
            .collection('users')
            .doc(uid);
        const customerDoc = await customerRef
            .get();
        if (!customerDoc.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Customer not found.',
            });
        }
        const customer = customerDoc.data();
        if (String(customer.role ||
            'customer') !==
            'customer') {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Only customer accounts can be admin verified.',
            });
        }
        const now = new Date()
            .toISOString();
        const admin = req.runtimeUser;
        const update = verified
            ? {
                admin_verified: true,
                admin_verified_at: now,
                admin_verified_by: admin.uid,
                admin_verified_by_email: admin.email,
                admin_verification_reason: reason ||
                    'Manually verified by Runtime administrator',
                updated_at: now,
            }
            : {
                admin_verified: false,
                admin_verified_at: null,
                admin_verified_by: null,
                admin_verified_by_email: null,
                admin_verification_reason: null,
                updated_at: now,
            };
        await customerRef.set(update, {
            merge: true,
        });
        /*
         * Keep a small immutable-style audit record in a separate
         * collection. This does NOT alter Firebase email verification.
         */
        await adminDb
            .collection('admin_audit_logs')
            .add({
            action: verified
                ? 'CUSTOMER_ADMIN_VERIFIED'
                : 'CUSTOMER_ADMIN_VERIFICATION_REMOVED',
            admin_user_id: admin.uid,
            admin_email: admin.email,
            target_user_id: uid,
            target_user_email: String(customer.email ||
                ''),
            reason: verified
                ? update
                    .admin_verification_reason
                : 'Admin verification removed',
            created_at: now,
        });
        const updatedDoc = await customerRef
            .get();
        return res.json({
            success: true,
            user: {
                ...updatedDoc.data(),
                id: updatedDoc.id,
            },
        });
    }
    catch (error) {
        console.error('Admin customer verification failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: 'Unable to update customer verification.',
        });
    }
});
router.patch('/:userId', authenticate, async (req, res) => {
    if (!requireSuperAdmin(req, res)) {
        return;
    }
    try {
        const userId = String(req.params.userId ||
            '').trim();
        const name = typeof req.body
            ?.name ===
            'string'
            ? req.body.name.trim()
            : '';
        const email = typeof req.body
            ?.email ===
            'string'
            ? normalizeEmail(req.body.email)
            : '';
        const organisation = typeof req.body
            ?.organisation ===
            'string'
            ? req.body.organisation
                .trim()
            : '';
        const phone = typeof req.body
            ?.phone ===
            'string'
            ? req.body.phone.trim()
            : '';
        if (!userId ||
            name.length < 2) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Enter a valid customer name.',
            });
        }
        if (!isValidEmail(email)) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Enter a valid customer email address.',
            });
        }
        const userRef = adminDb
            .collection('users')
            .doc(userId);
        const snapshot = await userRef.get();
        if (!snapshot.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Customer not found.',
            });
        }
        const before = snapshot.data() ||
            {};
        if (String(before.role ||
            'customer') ===
            'super_admin') {
            return res
                .status(403)
                .json({
                success: false,
                message: 'Super admin accounts cannot be edited from the customer screen.',
            });
        }
        const emailChanged = normalizeEmail(String(before.email ||
            '')) !== email;
        await adminAuth
            .updateUser(userId, {
            displayName: name,
            email,
            ...(emailChanged
                ? {
                    emailVerified: false,
                }
                : {}),
        });
        const now = new Date()
            .toISOString();
        const changes = {
            name,
            email,
            organisation,
            phone,
            ...(emailChanged
                ? {
                    email_verified_at: null,
                }
                : {}),
            updated_at: now,
        };
        await userRef
            .set(changes, {
            merge: true,
        });
        await adminDb
            .collection('admin_audit_logs')
            .add({
            admin_user_id: req.runtimeUser
                .uid,
            admin_email: req.runtimeUser
                .email,
            target_user_id: userId,
            target_user_email: email,
            action: 'CUSTOMER_PROFILE_CHANGED',
            resource_type: 'customer',
            resource_id: userId,
            resource_name: email,
            before: {
                name: before.name ||
                    '',
                email: before.email ||
                    '',
                organisation: before.organisation ||
                    '',
                phone: before.phone ||
                    '',
            },
            after: {
                name,
                email,
                organisation,
                phone,
            },
            description: `${req.runtimeUser.email} updated customer profile ${email}.`,
            created_at: now,
        });
        return res.json({
            success: true,
            user: {
                ...before,
                ...changes,
                id: userId,
            },
        });
    }
    catch (error) {
        console.error('Admin customer update failed:', error);
        const code = typeof error ===
            'object' &&
            error !== null &&
            'code' in error
            ? String(error.code || '')
            : '';
        const message = code ===
            'auth/email-already-exists'
            ? 'Another account already uses that email address.'
            : 'Unable to update this customer account.';
        return res
            .status(code ===
            'auth/email-already-exists'
            ? 409
            : 500)
            .json({
            success: false,
            message,
        });
    }
});
router.delete('/:userId', authenticate, async (req, res) => {
    if (!requireSuperAdmin(req, res)) {
        return;
    }
    try {
        const userId = String(req.params.userId ||
            '').trim();
        if (!userId) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Customer ID is required.',
            });
        }
        if (userId ===
            req.runtimeUser.uid) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'You cannot delete your own administrator account here.',
            });
        }
        const userRef = adminDb
            .collection('users')
            .doc(userId);
        const snapshot = await userRef.get();
        if (!snapshot.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Customer not found.',
            });
        }
        const profile = snapshot.data() ||
            {};
        if (String(profile.role ||
            'customer') !==
            'customer') {
            return res
                .status(403)
                .json({
                success: false,
                message: 'Only customer accounts can be deleted from this screen.',
            });
        }
        const email = normalizeEmail(String(profile.email ||
            ''));
        const confirmation = normalizeEmail(typeof req.body
            ?.confirmationEmail ===
            'string'
            ? req.body
                .confirmationEmail
            : '');
        if (!email ||
            confirmation !==
                email) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Type the customer email exactly to confirm account deletion.',
            });
        }
        const now = new Date()
            .toISOString();
        /*
         * Preserve an audit/archive record. Domain, order and payment
         * records are intentionally not deleted because they are
         * operational/financial history.
         */
        await adminDb
            .collection('deleted_users')
            .doc(userId)
            .set({
            ...profile,
            id: userId,
            deleted_at: now,
            deleted_by: req.runtimeUser
                .uid,
            deleted_by_email: req.runtimeUser
                .email,
        });
        try {
            await adminAuth
                .deleteUser(userId);
        }
        catch (error) {
            const code = typeof error ===
                'object' &&
                error !== null &&
                'code' in error
                ? String(error.code ||
                    '')
                : '';
            if (code !==
                'auth/user-not-found') {
                throw error;
            }
        }
        await userRef.delete();
        await adminDb
            .collection('admin_audit_logs')
            .add({
            admin_user_id: req.runtimeUser
                .uid,
            admin_email: req.runtimeUser
                .email,
            target_user_id: userId,
            target_user_email: email,
            action: 'CUSTOMER_ACCOUNT_DELETED',
            resource_type: 'customer',
            resource_id: userId,
            resource_name: email,
            before: profile,
            description: `${req.runtimeUser.email} deleted customer account ${email}.`,
            created_at: now,
        });
        return res.json({
            success: true,
            message: 'Customer account deleted.',
        });
    }
    catch (error) {
        console.error('Admin customer deletion failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: 'Unable to delete this customer account.',
        });
    }
});
export default router;

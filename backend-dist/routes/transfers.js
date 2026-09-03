import { Router, } from 'express';
import crypto from 'crypto';
import { adminAuth, adminDb, } from '../firebaseAdmin.js';
const router = Router();
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
        req.runtimeUser = {
            uid: decoded.uid,
            email: decoded.email ||
                '',
            role: String(profile.data()
                ?.role ||
                'customer'),
        };
        next();
    }
    catch (error) {
        console.error('Transfer authentication failed:', error);
        return res
            .status(401)
            .json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};
const getEncryptionKey = () => {
    const raw = process.env
        .TRANSFER_SECRET_KEY
        ?.trim();
    /*
     * 32 random bytes represented as 64 hexadecimal chars.
     */
    if (!raw ||
        !/^[0-9a-f]{64}$/i
            .test(raw)) {
        throw new Error('TRANSFER_SECRET_KEY must be configured as 64 hexadecimal characters.');
    }
    return Buffer.from(raw, 'hex');
};
const encrypt = (plaintext) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
};
const decrypt = (payload) => {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(payload.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    return Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, 'base64')),
        decipher.final(),
    ]).toString('utf8');
};
/*
 * Customer stores the authorization/EPP code after Runtime
 * has created the unpaid transfer order.
 */
router.post('/authorization', authenticate, async (req, res) => {
    try {
        const runtimeUser = req.runtimeUser;
        const orderId = typeof req.body
            ?.orderId ===
            'string'
            ? req.body.orderId
                .trim()
            : '';
        const domainName = typeof req.body
            ?.domainName ===
            'string'
            ? req.body.domainName
                .trim()
                .toLowerCase()
            : '';
        const authCode = typeof req.body
            ?.authCode ===
            'string'
            ? req.body.authCode
                .trim()
            : '';
        if (!orderId ||
            !domainName ||
            !authCode) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Order, domain and authorization code are required.',
            });
        }
        const orderDoc = await adminDb
            .collection('orders')
            .doc(orderId)
            .get();
        if (!orderDoc.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Transfer order not found.',
            });
        }
        const order = orderDoc.data();
        if (String(order.user_id ||
            '') !==
            runtimeUser.uid) {
            return res
                .status(403)
                .json({
                success: false,
                message: 'You cannot update this transfer order.',
            });
        }
        const item = order.items?.[0];
        if (String(order.purpose ||
            item?.item_type ||
            '')
            .trim()
            .toLowerCase() !==
            'domain_transfer') {
            return res
                .status(400)
                .json({
                success: false,
                message: 'This is not a domain transfer order.',
            });
        }
        const orderDomain = String(item?.reference_id ||
            '')
            .trim()
            .toLowerCase();
        if (orderDomain &&
            orderDomain !==
                domainName) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'The domain does not match the transfer order.',
            });
        }
        const encrypted = encrypt(authCode);
        const now = new Date()
            .toISOString();
        await adminDb
            .collection('transfer_requests')
            .doc(orderId)
            .set({
            order_id: orderId,
            domain_name: domainName,
            user_id: runtimeUser.uid,
            user_email: runtimeUser.email,
            authorization: encrypted,
            status: 'awaiting_payment',
            created_at: now,
            updated_at: now,
        }, {
            merge: true,
        });
        return res.json({
            success: true,
        });
    }
    catch (error) {
        console.error('Unable to store transfer authorization:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof
                Error
                ? error.message
                : 'Unable to secure the transfer authorization code.',
        });
    }
});
/*
 * Super-admin endpoint for the registrar processing stage.
 * The authorization code is returned only after payment has
 * moved the request to ready_for_processing.
 */
router.get('/admin/:orderId', authenticate, async (req, res) => {
    try {
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
        const orderId = String(req.params.orderId ||
            '').trim();
        const requestDoc = await adminDb
            .collection('transfer_requests')
            .doc(orderId)
            .get();
        if (!requestDoc.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Transfer request not found.',
            });
        }
        const data = requestDoc.data();
        if (data.status !==
            'ready_for_processing') {
            return res
                .status(409)
                .json({
                success: false,
                message: 'Transfer authorization is locked until payment is verified.',
            });
        }
        const authorization = data.authorization;
        if (!authorization
            ?.ciphertext ||
            !authorization
                ?.iv ||
            !authorization
                ?.tag) {
            throw new Error('Encrypted transfer authorization is incomplete.');
        }
        return res.json({
            success: true,
            orderId,
            domainName: data.domain_name,
            status: data.status,
            authCode: decrypt(authorization),
        });
    }
    catch (error) {
        console.error('Unable to read transfer authorization:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof
                Error
                ? error.message
                : 'Unable to load transfer authorization.',
        });
    }
});
export default router;

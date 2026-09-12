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
const cleanRegistrantDetails = (value) => ({
    full_name: String(value?.full_name || '').trim(),
    org_name: String(value?.org_name || '').trim(),
    physical_address: String(value?.physical_address || '').trim(),
    postal_address: String(value?.postal_address || '').trim(),
    city: String(value?.city || '').trim(),
    country: String(value?.country || '').trim(),
    phone: String(value?.phone || '').trim(),
    email: String(value?.email || '').trim(),
    org_description: String(value?.org_description || '').trim(),
    proposed_usage: String(value?.proposed_usage || '').trim(),
});
const validateRegistrantDetails = (owner) => {
    const required = [
        ['full applicant name', owner.full_name],
        ['organisation name', owner.org_name],
        ['physical address', owner.physical_address],
        ['postal address', owner.postal_address],
        ['town or city', owner.city],
        ['country', owner.country],
        ['phone number', owner.phone],
        ['email address', owner.email],
        ['organisation/activity description', owner.org_description],
        ['proposed domain use', owner.proposed_usage],
    ];
    for (const [label, value,] of required) {
        if (!value) {
            return `${label} is required.`;
        }
    }
    if (!owner.email.includes('@')) {
        return 'A valid owner email address is required.';
    }
    if (owner.physical_address.length <
        8) {
        return 'A complete physical address is required.';
    }
    return null;
};
const cleanNameservers = (value) => Array.isArray(value)
    ? value
        .map((item) => String(item || '')
        .trim()
        .replace(/\.$/, '')
        .toLowerCase())
        .filter(Boolean)
    : [];
const validateNameservers = (nameservers) => {
    if (nameservers.length < 2 ||
        nameservers.length > 4) {
        return 'Enter between two and four nameservers.';
    }
    if (new Set(nameservers).size !==
        nameservers.length) {
        return 'Nameservers must be unique.';
    }
    return null;
};
/*
 * ----------------------------------------------------------
 * ZISPA TRANSFER DOMAIN DETAILS
 * ----------------------------------------------------------
 *
 * The transfer order is created by Runtime's existing order
 * system first. Before Billing opens, the customer saves the
 * complete current-owner details required for the ZISPA
 * transfer template.
 */
router.post('/domain-details', authenticate, async (req, res) => {
    try {
        const runtimeUser = req.runtimeUser;
        const domainId = String(req.body?.domainId ||
            '').trim();
        if (!domainId) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Domain ID is required.',
            });
        }
        const domainRef = adminDb
            .collection('domains')
            .doc(domainId);
        const snapshot = await domainRef
            .get();
        if (!snapshot.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Transfer domain not found.',
            });
        }
        const domain = snapshot.data();
        if (String(domain.user_id ||
            '') !==
            runtimeUser.uid) {
            return res
                .status(403)
                .json({
                success: false,
                message: 'You cannot update this transfer.',
            });
        }
        const domainName = String(domain.domain_name ||
            '')
            .trim()
            .toLowerCase();
        const zispaDomain = domainName.endsWith('.co.zw') ||
            domainName.endsWith('.org.zw') ||
            domainName.endsWith('.ac.zw');
        if (!zispaDomain) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Detailed ZISPA owner information is only required for ZISPA-managed domains.',
            });
        }
        if (!domain.transfer_order) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'This domain is not a transfer order.',
            });
        }
        const owner = cleanRegistrantDetails(req.body
            ?.ownerDetails);
        const ownerError = validateRegistrantDetails(owner);
        if (ownerError) {
            return res
                .status(400)
                .json({
                success: false,
                message: ownerError,
            });
        }
        const nameservers = cleanNameservers(req.body
            ?.nameservers);
        const nsError = validateNameservers(nameservers);
        if (nsError) {
            return res
                .status(400)
                .json({
                success: false,
                message: nsError,
            });
        }
        const registrantType = req.body
            ?.registrantType ===
            'client'
            ? 'client'
            : 'myself';
        const now = new Date()
            .toISOString();
        await domainRef.set({
            registrant_type: registrantType,
            owner_details: owner,
            nameservers,
            updated_at: now,
        }, {
            merge: true,
        });
        const updated = await domainRef
            .get();
        return res.json({
            success: true,
            domain: {
                id: updated.id,
                ...updated.data(),
            },
        });
    }
    catch (error) {
        console.error('Unable to save ZISPA transfer details:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to save the transfer details.',
        });
    }
});
/*
 * ----------------------------------------------------------
 * SUPER ADMIN DOMAIN DETAILS
 * ----------------------------------------------------------
 *
 * Admin can correct registrant data and nameservers regardless
 * of the customer's current domain-processing status. This is
 * intentionally backend-owned so customer Firestore rules do
 * not block registrar corrections.
 */
router.post('/admin/domain-details', authenticate, async (req, res) => {
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
        const domainId = String(req.body?.domainId ||
            '').trim();
        if (!domainId) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Domain ID is required.',
            });
        }
        const domainRef = adminDb
            .collection('domains')
            .doc(domainId);
        const snapshot = await domainRef
            .get();
        if (!snapshot.exists) {
            return res
                .status(404)
                .json({
                success: false,
                message: 'Domain not found.',
            });
        }
        const current = snapshot.data();
        const changes = {
            updated_at: new Date()
                .toISOString(),
        };
        if (req.body
            ?.ownerDetails) {
            const owner = cleanRegistrantDetails(req.body
                .ownerDetails);
            const ownerError = validateRegistrantDetails(owner);
            if (ownerError) {
                return res
                    .status(400)
                    .json({
                    success: false,
                    message: ownerError,
                });
            }
            changes.owner_details =
                owner;
        }
        if (req.body
            ?.nameservers) {
            const nameservers = cleanNameservers(req.body
                .nameservers);
            const nsError = validateNameservers(nameservers);
            if (nsError) {
                return res
                    .status(400)
                    .json({
                    success: false,
                    message: nsError,
                });
            }
            changes.nameservers =
                nameservers;
            if (Array.isArray(req.body
                ?.nameserverIps)) {
                changes.nameserver_ips =
                    req.body
                        .nameserverIps
                        .slice(0, nameservers.length)
                        .map((item) => String(item || '').trim());
            }
        }
        if (req.body
            ?.registrantType) {
            changes.registrant_type =
                req.body
                    .registrantType ===
                    'client'
                    ? 'client'
                    : 'myself';
        }
        if (req.body
            ?.renewalPrice !==
            undefined) {
            const renewalPrice = Number(req.body
                .renewalPrice);
            if (!Number.isFinite(renewalPrice) ||
                renewalPrice < 0) {
                return res
                    .status(400)
                    .json({
                    success: false,
                    message: 'Renewal price is invalid.',
                });
            }
            changes.renewal_price =
                renewalPrice;
        }
        if (req.body
            ?.registeredAt !==
            undefined) {
            changes.registered_at =
                req.body
                    .registeredAt ||
                    null;
        }
        if (req.body
            ?.expiresAt !==
            undefined) {
            changes.expires_at =
                req.body
                    .expiresAt ||
                    null;
        }
        if (typeof req.body
            ?.autoRenew ===
            'boolean') {
            changes.auto_renew =
                req.body
                    .autoRenew;
        }
        const history = Array.isArray(current.history)
            ? current.history
            : [];
        changes.history = [
            ...history,
            {
                id: `hist-admin-${crypto.randomUUID()}`,
                domain_id: domainId,
                action: 'MODIFY',
                description: 'Domain details corrected by Runtime administrator.',
                status: String(current.status ||
                    'updated'),
                actor: req.runtimeUser
                    ?.email ||
                    'Runtime administrator',
                created_at: new Date()
                    .toISOString(),
            },
        ];
        await domainRef.set(changes, {
            merge: true,
        });
        const updated = await domainRef
            .get();
        return res.json({
            success: true,
            domain: {
                id: updated.id,
                ...updated.data(),
            },
        });
    }
    catch (error) {
        console.error('Admin domain details update failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to update domain details.',
        });
    }
});
export default router;

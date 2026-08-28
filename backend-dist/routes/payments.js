import { Router } from 'express';
import crypto from 'crypto';
const router = Router();
const PESEPAY_API_URL = 'https://api.pesepay.com/api/payments-engine/v2/payments/make-payment';
const getPesePayCredentials = () => {
    const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
    const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;
    if (!integrationKey || !encryptionKey) {
        throw new Error('PesePay credentials are not configured.');
    }
    return {
        integrationKey,
        encryptionKey,
    };
};
/*
 * ----------------------------------------------------------
 * PESEPAY ENCRYPTION
 * ----------------------------------------------------------
 */
const encryptPayload = (payload, encryptionKey) => {
    const iv = crypto.randomBytes(16);
    const key = crypto
        .createHash('sha256')
        .update(encryptionKey)
        .digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return {
        encryptedPayload: encrypted,
        iv: iv.toString('base64'),
    };
};
/*
 * ----------------------------------------------------------
 * HEALTH / CONFIG CHECK
 * ----------------------------------------------------------
 *
 * This does NOT expose either secret key.
 */
router.get('/pesepay/status', (_req, res) => {
    try {
        getPesePayCredentials();
        return res.json({
            success: true,
            provider: 'pesepay',
            configured: true,
        });
    }
    catch {
        return res.status(503).json({
            success: false,
            provider: 'pesepay',
            configured: false,
        });
    }
});
export default router;

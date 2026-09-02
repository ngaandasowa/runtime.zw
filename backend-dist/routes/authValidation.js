import { Router, } from 'express';
import { resolveMx, } from 'node:dns/promises';
import { domainToASCII, } from 'node:url';
const router = Router();
const WINDOW_MS = 60_000;
const MAX_CHECKS_PER_WINDOW = 20;
const checksByIp = new Map();
const disposableDomains = new Set([
    '10minutemail.com',
    '10minutemail.net',
    'dispostable.com',
    'fakeinbox.com',
    'guerrillamail.com',
    'guerrillamail.net',
    'guerrillamail.org',
    'maildrop.cc',
    'mailinator.com',
    'mailnesia.com',
    'mintemail.com',
    'moakt.com',
    'mohmal.com',
    'mytemp.email',
    'sharklasers.com',
    'spam4.me',
    'temp-mail.org',
    'tempail.com',
    'tempmail.com',
    'tempmail.net',
    'tempmailo.com',
    'throwawaymail.com',
    'trashmail.com',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net',
]);
const normalizeEmail = (value) => value
    .trim()
    .toLowerCase();
const parseEmail = (rawEmail) => {
    const email = normalizeEmail(rawEmail);
    if (email.length < 6 ||
        email.length > 254 ||
        /\s/.test(email)) {
        return null;
    }
    const atIndex = email.lastIndexOf('@');
    if (atIndex <= 0 ||
        atIndex !==
            email.indexOf('@')) {
        return null;
    }
    const localPart = email.slice(0, atIndex);
    const rawDomain = email.slice(atIndex + 1);
    if (!localPart ||
        localPart.length > 64 ||
        !rawDomain) {
        return null;
    }
    if (localPart.startsWith('.') ||
        localPart.endsWith('.') ||
        localPart.includes('..')) {
        return null;
    }
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)) {
        return null;
    }
    const domain = domainToASCII(rawDomain)
        .toLowerCase()
        .replace(/\.$/, '');
    if (!domain ||
        domain.length > 253 ||
        !domain.includes('.')) {
        return null;
    }
    const labels = domain.split('.');
    if (labels.some((label) => !label ||
        label.length > 63 ||
        !/^[a-z0-9-]+$/i.test(label) ||
        label.startsWith('-') ||
        label.endsWith('-'))) {
        return null;
    }
    const tld = labels[labels.length - 1];
    if (!tld ||
        tld.length < 2 ||
        !/^[a-z]+$/i.test(tld)) {
        return null;
    }
    return {
        email: `${localPart}@${domain}`,
        localPart,
        domain,
    };
};
const consumeRateLimit = (ip) => {
    const now = Date.now();
    const current = checksByIp.get(ip);
    if (!current ||
        current.resetAt <= now) {
        checksByIp.set(ip, {
            count: 1,
            resetAt: now +
                WINDOW_MS,
        });
        return true;
    }
    if (current.count >=
        MAX_CHECKS_PER_WINDOW) {
        return false;
    }
    current.count += 1;
    return true;
};
const getDnsErrorCode = (error) => {
    if (typeof error ===
        'object' &&
        error !== null &&
        'code' in error) {
        return String(error.code || '');
    }
    return '';
};
router.post('/email-check', async (req, res) => {
    const ip = req.ip ||
        req.socket
            .remoteAddress ||
        'unknown';
    if (!consumeRateLimit(ip)) {
        return res
            .status(429)
            .json({
            success: false,
            valid: false,
            message: 'Too many email checks. Please wait a moment and try again.',
        });
    }
    const email = typeof req.body
        ?.email ===
        'string'
        ? req.body.email
        : '';
    const parsed = parseEmail(email);
    if (!parsed) {
        return res
            .status(400)
            .json({
            success: true,
            valid: false,
            reason: 'invalid_format',
            message: 'Enter a valid email address.',
        });
    }
    if (disposableDomains.has(parsed.domain)) {
        return res
            .status(400)
            .json({
            success: true,
            valid: false,
            reason: 'disposable_email',
            message: 'Temporary or disposable email addresses are not accepted.',
        });
    }
    try {
        const mxRecords = await resolveMx(parsed.domain);
        const usableMx = mxRecords
            .filter((record) => Boolean(record.exchange) &&
            record.exchange !==
                '.')
            .sort((a, b) => a.priority -
            b.priority);
        if (usableMx.length ===
            0) {
            return res
                .status(400)
                .json({
                success: true,
                valid: false,
                reason: 'no_mail_server',
                message: 'This email domain is not configured to receive email.',
            });
        }
        return res.json({
            success: true,
            valid: true,
            normalizedEmail: parsed.email,
            domain: parsed.domain,
            mailServers: usableMx.map((record) => record.exchange),
        });
    }
    catch (error) {
        const code = getDnsErrorCode(error);
        if (code ===
            'ENOTFOUND' ||
            code ===
                'ENODATA' ||
            code ===
                'ENOENT') {
            return res
                .status(400)
                .json({
                success: true,
                valid: false,
                reason: 'no_mail_server',
                message: 'This email domain does not appear to accept email.',
            });
        }
        console.error('Email MX validation failed:', {
            email: parsed.email,
            domain: parsed.domain,
            code,
            error,
        });
        /*
         * Fail closed. A temporary DNS problem should not cause Runtime
         * to create a potentially bogus account.
         */
        return res
            .status(503)
            .json({
            success: false,
            valid: false,
            reason: 'validation_unavailable',
            message: 'We could not validate this email right now. Please try again shortly.',
        });
    }
});
export default router;

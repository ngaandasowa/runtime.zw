import { Router, } from 'express';
import { promises as dns, } from 'node:dns';
import { adminAuth, } from '../firebaseAdmin.js';
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
        req.runtimeUser = {
            uid: decoded.uid,
            email: decoded.email ||
                '',
        };
        next();
    }
    catch (error) {
        console.error('Nameserver resolver authentication failed:', error);
        return res
            .status(401)
            .json({
            success: false,
            message: 'Invalid authentication token.',
        });
    }
};
const normalizeHostname = (value) => String(value || '')
    .trim()
    .replace(/\.$/, '')
    .toLowerCase();
const validHostname = (hostname) => hostname.length <= 253 &&
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
        .test(hostname);
const resolveOne = async (hostname) => {
    try {
        const ipv4 = await dns.resolve4(hostname);
        if (ipv4[0]) {
            return ipv4[0];
        }
    }
    catch {
        // Fall back to IPv6.
    }
    try {
        const ipv6 = await dns.resolve6(hostname);
        if (ipv6[0]) {
            return ipv6[0];
        }
    }
    catch {
        // Report below.
    }
    throw new Error(`No public A or AAAA record was found for ${hostname}.`);
};
router.post('/resolve', authenticate, async (req, res) => {
    try {
        const raw = Array.isArray(req.body?.nameservers)
            ? req.body.nameservers
            : [];
        const nameservers = raw
            .map(normalizeHostname)
            .filter(Boolean);
        if (nameservers.length < 2 ||
            nameservers.length > 4) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Enter between two and four nameservers.',
            });
        }
        const unique = new Set(nameservers);
        if (unique.size !==
            nameservers.length) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Nameserver hostnames must be unique.',
            });
        }
        const invalid = nameservers.find((hostname) => !validHostname(hostname));
        if (invalid) {
            return res
                .status(400)
                .json({
                success: false,
                message: `Invalid nameserver hostname: ${invalid}`,
            });
        }
        const results = await Promise.all(nameservers.map(async (hostname) => ({
            hostname,
            ip: await resolveOne(hostname),
        })));
        return res.json({
            success: true,
            results,
        });
    }
    catch (error) {
        console.error('Nameserver IP resolution failed:', error);
        return res
            .status(400)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to resolve nameserver IP addresses.',
        });
    }
});
export default router;

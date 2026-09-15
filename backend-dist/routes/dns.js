import { Router, } from 'express';
import { adminDb, } from '../firebaseAdmin.js';
import { authenticateWithProfile, } from '../middleware/authenticate.js';
import { cloudflareDnsService, } from '../services/CloudflareDnsService.js';
const router = Router();
const requireSuperAdmin = (req, res) => {
    if (req.runtimeUser?.role !==
        'super_admin') {
        res.status(403).json({
            success: false,
            message: 'Super admin permission required.',
        });
        return false;
    }
    return true;
};
/*
 * Safe connectivity test.
 * Does not create or modify a Cloudflare zone.
 */
router.get('/cloudflare/status', authenticateWithProfile, async (req, res) => {
    try {
        if (!requireSuperAdmin(req, res)) {
            return;
        }
        const token = await cloudflareDnsService
            .verifyToken();
        return res.json({
            success: true,
            configured: true,
            provider: 'cloudflare',
            tokenStatus: token.status,
        });
    }
    catch (error) {
        console.error('Cloudflare status check failed:', error);
        return res.status(503).json({
            success: false,
            configured: cloudflareDnsService
                .isConfigured(),
            provider: 'cloudflare',
            message: error instanceof Error
                ? error.message
                : 'Unable to connect to Cloudflare.',
        });
    }
});
/*
 * PHASE 1 TEST ENDPOINT
 *
 * This is intentionally super-admin only.
 * It creates/reuses a Cloudflare zone, saves the
 * Cloudflare-assigned nameservers on the matching
 * Runtime domain, but DOES NOT change the registry.
 *
 * IMPORTANT LEGACY RULE:
 * Existing active Runtime domains keep their current
 * nameservers. We do not silently migrate old
 * ns1/ns2.ngaatec.com domains to Cloudflare.
 */
router.post('/cloudflare/provision-test', authenticateWithProfile, async (req, res) => {
    try {
        if (!requireSuperAdmin(req, res)) {
            return;
        }
        const domainId = typeof req.body
            ?.domainId ===
            'string'
            ? req.body.domainId
                .trim()
            : '';
        const requestedDomain = typeof req.body
            ?.domainName ===
            'string'
            ? cloudflareDnsService
                .normalizeDomain(req.body
                .domainName)
            : '';
        if (!domainId &&
            !requestedDomain) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Provide domainId or domainName.',
            });
        }
        let domainRef = null;
        let domain = null;
        if (domainId) {
            const ref = adminDb
                .collection('domains')
                .doc(domainId);
            const snapshot = await ref.get();
            if (!snapshot.exists) {
                return res
                    .status(404)
                    .json({
                    success: false,
                    message: 'Runtime domain not found.',
                });
            }
            domainRef = ref;
            domain =
                snapshot.data() ||
                    {};
        }
        else {
            const snapshot = await adminDb
                .collection('domains')
                .where('domain_name', '==', requestedDomain)
                .limit(1)
                .get();
            if (!snapshot.empty) {
                domainRef =
                    snapshot.docs[0]
                        .ref;
                domain =
                    snapshot.docs[0]
                        .data();
            }
        }
        const domainName = cloudflareDnsService
            .normalizeDomain(domain
            ?.domain_name ||
            requestedDomain);
        if (!domainName) {
            return res
                .status(400)
                .json({
                success: false,
                message: 'Unable to determine the domain name.',
            });
        }
        /*
         * Do not migrate an already-active legacy domain
         * automatically. This protects existing websites,
         * MX records and email from DNS downtime.
         */
        const existingNameservers = Array.isArray(domain?.nameservers)
            ? domain
                .nameservers
                .map((value) => String(value ||
                '')
                .trim()
                .toLowerCase())
                .filter(Boolean)
            : [];
        const isActiveLegacyDomain = domain?.status ===
            'active' &&
            existingNameservers
                .length >= 2 &&
            domain?.dns_provider !==
                'cloudflare';
        if (isActiveLegacyDomain) {
            return res
                .status(409)
                .json({
                success: false,
                protectedLegacyDomain: true,
                message: 'This active domain already uses existing nameservers. Runtime will not automatically migrate it to Cloudflare.',
                currentNameservers: existingNameservers,
            });
        }
        const zone = await cloudflareDnsService
            .createZone(domainName);
        const nameservers = Array.isArray(zone.name_servers)
            ? zone
                .name_servers
                .map((value) => String(value)
                .trim()
                .toLowerCase())
                .filter(Boolean)
            : [];
        if (nameservers.length <
            2) {
            throw new Error('Cloudflare did not return the expected nameservers.');
        }
        const now = new Date()
            .toISOString();
        if (domainRef) {
            await domainRef.set({
                dns_provider: 'cloudflare',
                dns_status: zone.status ===
                    'active'
                    ? 'active'
                    : 'pending',
                nameservers,
                cloudflare: {
                    zone_id: zone.id,
                    status: zone.status ||
                        'pending',
                    provisioned_at: domain
                        ?.cloudflare
                        ?.provisioned_at ||
                        now,
                    activated_at: zone
                        .activated_on ||
                        domain
                            ?.cloudflare
                            ?.activated_at ||
                        null,
                    last_synced_at: now,
                },
                updated_at: now,
            }, {
                merge: true,
            });
        }
        return res.json({
            success: true,
            testMode: true,
            registryChanged: false,
            domainName,
            zoneId: zone.id,
            zoneStatus: zone.status ||
                'pending',
            nameservers,
            runtimeDomainUpdated: Boolean(domainRef),
            message: 'Cloudflare zone is provisioned. Registry nameservers were not changed by this test.',
        });
    }
    catch (error) {
        console.error('Cloudflare test provisioning failed:', error);
        return res
            .status(500)
            .json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to provision the Cloudflare zone.',
        });
    }
});
export default router;

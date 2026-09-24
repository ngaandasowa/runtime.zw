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
 * IMPORTANT CUSTOM-DNS RULE:
 * Existing active domains keep their current nameservers.
 * Runtime never silently migrates custom DNS to Cloudflare.
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
/*
 * ADMIN RECOVERY: reconcile a stale Runtime DNS domain.
 *
 * This never creates a zone and never changes the registry.
 * It repairs Runtime only when ALL of these are true:
 * 1. the domain already has a Cloudflare zone in Runtime's account;
 * 2. Cloudflare reports that zone Active;
 * 3. public authoritative NS lookup matches Cloudflare's assigned NS.
 *
 * This makes the endpoint safe for domains left as "Custom DNS" by
 * the old migration workflow.
 */
router.post('/cloudflare/reconcile', authenticateWithProfile, async (req, res) => {
    try {
        if (!requireSuperAdmin(req, res))
            return;
        const domainId = typeof req.body?.domainId === 'string'
            ? req.body.domainId.trim()
            : '';
        if (!domainId) {
            return res.status(400).json({
                success: false,
                message: 'A domain ID is required.',
            });
        }
        const ref = adminDb.collection('domains').doc(domainId);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            return res.status(404).json({
                success: false,
                message: 'Runtime domain not found.',
            });
        }
        const domain = snapshot.data() || {};
        const domainName = cloudflareDnsService.normalizeDomain(domain.domain_name);
        if (!domainName) {
            return res.status(400).json({
                success: false,
                message: 'Unable to determine the domain name.',
            });
        }
        /*
         * listZone only searches Runtime's configured Cloudflare account.
         * Do not create a zone here: reconciliation is recovery, not migration.
         */
        const zone = await cloudflareDnsService.listZone(domainName);
        if (!zone) {
            return res.status(409).json({
                success: false,
                code: 'ZONE_NOT_FOUND',
                message: 'No Runtime Cloudflare zone exists for this domain. Nothing was changed.',
            });
        }
        const zoneStatus = String(zone.status || '').trim().toLowerCase();
        if (zoneStatus !== 'active') {
            return res.status(409).json({
                success: false,
                code: 'ZONE_NOT_ACTIVE',
                zoneStatus,
                message: `Cloudflare zone is ${zoneStatus || 'unknown'}, not Active. Nothing was changed.`,
            });
        }
        const assignedNameservers = Array.isArray(zone.name_servers)
            ? zone.name_servers
                .map((value) => String(value || '')
                .trim()
                .toLowerCase()
                .replace(/\.$/, ''))
                .filter(Boolean)
            : [];
        if (assignedNameservers.length < 2) {
            return res.status(409).json({
                success: false,
                code: 'ASSIGNED_NS_MISSING',
                message: 'Cloudflare did not return the expected assigned nameservers. Nothing was changed.',
            });
        }
        /*
         * Verify the REAL public delegation independently of Firestore.
         * Cloudflare Active alone is not enough for a repair action.
         */
        const dnsPromises = await import('node:dns/promises');
        let authoritativeNameservers = [];
        try {
            authoritativeNameservers =
                (await dnsPromises.resolveNs(domainName))
                    .map((value) => String(value || '')
                    .trim()
                    .toLowerCase()
                    .replace(/\.$/, ''))
                    .filter(Boolean);
        }
        catch (lookupError) {
            return res.status(409).json({
                success: false,
                code: 'NS_LOOKUP_FAILED',
                message: 'Unable to verify the domain’s public authoritative nameservers. Nothing was changed.',
            });
        }
        const normalizeSet = (values) => [...new Set(values)].sort();
        const expected = normalizeSet(assignedNameservers);
        const actual = normalizeSet(authoritativeNameservers);
        const delegationMatches = expected.length === actual.length &&
            expected.every((value, index) => value === actual[index]);
        if (!delegationMatches) {
            return res.status(409).json({
                success: false,
                code: 'DELEGATION_MISMATCH',
                assignedNameservers,
                authoritativeNameservers,
                message: 'Cloudflare is Active, but the domain’s public authoritative nameservers do not match this Runtime zone. Nothing was changed.',
            });
        }
        const now = new Date().toISOString();
        const pendingIps = Array.isArray(domain.dns_migration?.pending_nameserver_ips)
            ? domain.dns_migration.pending_nameserver_ips
            : Array.isArray(domain.nameserver_ips)
                ? domain.nameserver_ips
                : [];
        const migration = domain.dns_migration &&
            typeof domain.dns_migration === 'object'
            ? {
                ...domain.dns_migration,
                status: 'completed',
                completed_at: domain.dns_migration.completed_at || now,
                reconciled_at: now,
                reconciled_by: req.runtimeUser?.email ||
                    req.runtimeUser?.uid ||
                    'super_admin',
                last_error: null,
            }
            : undefined;
        await ref.set({
            dns_provider: 'cloudflare',
            dns_status: 'active',
            nameservers: assignedNameservers,
            nameserver_ips: pendingIps,
            cloudflare: {
                ...(domain.cloudflare || {}),
                zone_id: zone.id,
                assigned_nameservers: assignedNameservers,
                status: 'active',
                activated_at: domain.cloudflare?.activated_at ||
                    zone.activated_on ||
                    now,
                last_synced_at: now,
                last_error: null,
            },
            ...(migration
                ? { dns_migration: migration }
                : {}),
            nameserver_change_status: null,
            pending_nameservers: null,
            pending_nameserver_ips: null,
            dns_reconciliation: {
                reconciled_at: now,
                reconciled_by: req.runtimeUser?.email ||
                    req.runtimeUser?.uid ||
                    'super_admin',
                previous_dns_provider: domain.dns_provider || null,
                previous_dns_status: domain.dns_status || null,
                verified_zone_id: zone.id,
                verified_nameservers: authoritativeNameservers,
            },
            updated_at: now,
        }, { merge: true });
        /*
         * If the old migration created a persistent registry request,
         * close that stale request as confirmed as part of the same repair.
         */
        const registryRequestId = String(domain.dns_migration?.registry_request_id || '').trim();
        if (registryRequestId) {
            await adminDb
                .collection('registry_requests')
                .doc(registryRequestId)
                .set({
                status: 'confirmed',
                confirmed_at: now,
                registry_response_notes: 'Runtime DNS state reconciled after Cloudflare Active status and public authoritative nameservers were independently verified.',
                updated_at: now,
            }, { merge: true });
        }
        const updated = await ref.get();
        return res.json({
            success: true,
            repaired: true,
            domain: {
                id: updated.id,
                ...updated.data(),
            },
            zoneId: zone.id,
            zoneStatus: 'active',
            nameservers: assignedNameservers,
            message: 'Runtime DNS state reconciled successfully. Cloudflare is Active and the public delegation matches the Runtime zone.',
        });
    }
    catch (error) {
        console.error('Runtime DNS reconciliation failed:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : 'Unable to reconcile Runtime DNS.',
        });
    }
});
export default router;

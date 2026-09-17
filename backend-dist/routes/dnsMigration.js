import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateWithProfile } from '../middleware/authenticate.js';
import { cloudflareDnsService } from '../services/CloudflareDnsService.js';
import { emailService } from '../email/emailService.js';
const router = Router();
const s = (v) => String(v ?? '').trim();
const SUPPORTED = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA', 'SRV']);
const normalizeNs = (value) => Array.isArray(value)
    ? value.map((n) => s(n).toLowerCase().replace(/\.$/, '')).filter(Boolean)
    : [];
const sameNsSet = (left, right) => {
    const a = [...normalizeNs(left)].sort();
    const b = [...normalizeNs(right)].sort();
    return a.length === b.length && a.every((value, index) => value === b[index]);
};
const isZispaDomain = (domain) => s(domain.processing_type).toLowerCase() === 'zispa' ||
    s(domain.domain_name).toLowerCase().endsWith('.co.zw');
async function resolveNameservers(nameservers) {
    const dns = await import('node:dns/promises');
    const output = [];
    for (const hostname of nameservers) {
        let addresses = [];
        try {
            addresses = await dns.resolve4(hostname);
        }
        catch { }
        if (!addresses.length) {
            try {
                addresses = await dns.resolve6(hostname);
            }
            catch { }
        }
        output.push({ hostname, ip: addresses[0] || '' });
    }
    return output;
}
async function owned(req, res) {
    const id = s(req.params.domainId);
    const ref = adminDb.collection('domains').doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
        res.status(404).json({ success: false, message: 'Domain not found.' });
        return null;
    }
    const d = snap.data();
    const email = s(req.runtimeUser?.email).toLowerCase();
    const isSuperAdmin = s(req.runtimeUser?.role) === 'super_admin';
    const isOwner = s(d.user_id) === s(req.runtimeUser?.uid) || Boolean(email && s(d.user_email).toLowerCase() === email);
    if (!isSuperAdmin && !isOwner) {
        res.status(403).json({ success: false, message: 'You do not have access to this domain.' });
        return null;
    }
    if (!['active', 'expired'].includes(s(d.status))) {
        res.status(409).json({ success: false, message: 'Runtime DNS migration is available after domain registration.' });
        return null;
    }
    return { id, ref, d };
}
function migrationView(d) {
    const m = d.dns_migration || {};
    return {
        status: m.status || null,
        previousNameservers: m.previous_nameservers || d.nameservers || [],
        pendingNameservers: m.pending_nameservers || [],
        zoneId: m.cloudflare_zone_id || null,
        scanStartedAt: m.scan_started_at || null,
        reviewedAt: m.reviewed_at || null,
        lastError: m.last_error || null,
    };
}
router.use(authenticateWithProfile);
router.get('/:domainId', async (req, res) => {
    try {
        const x = await owned(req, res);
        if (!x)
            return;
        const zoneId = s(x.d.dns_migration?.cloudflare_zone_id);
        let scanned = [];
        if (zoneId && ['preparing', 'review_required'].includes(s(x.d.dns_migration?.status))) {
            scanned = await cloudflareDnsService.listScannedDnsRecords(zoneId);
        }
        res.json({ success: true, domainName: x.d.domain_name, currentNameservers: x.d.nameservers || [], migration: migrationView(x.d), records: scanned.filter((r) => SUPPORTED.has(s(r.type).toUpperCase())) });
    }
    catch (e) {
        res.status(502).json({ success: false, message: e instanceof Error ? e.message : 'Unable to load DNS migration.' });
    }
});
router.post('/:domainId/start', async (req, res) => {
    try {
        const x = await owned(req, res);
        if (!x)
            return;
        const migrationStatus = s(x.d.dns_migration?.status).toLowerCase();
        const assigned = normalizeNs(x.d.dns_migration?.pending_nameservers?.length
            ? x.d.dns_migration.pending_nameservers
            : x.d.cloudflare?.assigned_nameservers);
        const genuinelyActive = s(x.d.dns_provider).toLowerCase() === 'cloudflare' &&
            s(x.d.dns_status).toLowerCase() === 'active' &&
            Boolean(s(x.d.cloudflare?.zone_id)) &&
            migrationStatus !== 'delegation_pending' &&
            (assigned.length < 2 || sameNsSet(x.d.nameservers, assigned));
        if (genuinelyActive) {
            return res.status(409).json({ success: false, message: 'This domain is already using Runtime DNS.' });
        }
        const current = normalizeNs(x.d.nameservers);
        if (current.length < 2)
            return res.status(409).json({ success: false, message: 'At least two current nameservers are required before migration.' });
        const existingZoneId = s(x.d.dns_migration?.cloudflare_zone_id);
        const zone = existingZoneId ? await cloudflareDnsService.getZone(existingZoneId) : await cloudflareDnsService.createZone(x.d.domain_name);
        const zoneAssigned = (zone.name_servers || []).map(n => s(n).toLowerCase()).filter(Boolean);
        if (zoneAssigned.length < 2)
            throw new Error('Cloudflare did not return assigned nameservers.');
        await cloudflareDnsService.triggerDnsScan(zone.id);
        await x.ref.set({
            dns_migration: {
                status: 'preparing',
                previous_nameservers: current,
                pending_nameservers: zoneAssigned,
                cloudflare_zone_id: zone.id,
                started_at: x.d.dns_migration?.started_at || new Date().toISOString(),
                scan_started_at: new Date().toISOString(),
                reviewed_at: null,
                last_error: null
            },
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true, message: 'DNS scan started. Your current nameservers have not been changed.', pendingNameservers: zoneAssigned });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to start DNS migration.' });
    }
});
router.post('/:domainId/refresh', async (req, res) => {
    try {
        const x = await owned(req, res);
        if (!x)
            return;
        const zoneId = s(x.d.dns_migration?.cloudflare_zone_id);
        if (!zoneId)
            return res.status(409).json({ success: false, message: 'Start the migration first.' });
        const records = await cloudflareDnsService.listScannedDnsRecords(zoneId);
        await x.ref.set({ dns_migration: { ...x.d.dns_migration, status: 'review_required', last_scan_check_at: new Date().toISOString(), last_error: null }, updated_at: FieldValue.serverTimestamp() }, { merge: true });
        res.json({ success: true, records: records.filter((r) => SUPPORTED.has(s(r.type).toUpperCase())) });
    }
    catch (e) {
        res.status(502).json({ success: false, message: e instanceof Error ? e.message : 'Unable to refresh scanned DNS records.' });
    }
});
router.post('/:domainId/review', async (req, res) => {
    try {
        const x = await owned(req, res);
        if (!x)
            return;
        const zoneId = s(x.d.dns_migration?.cloudflare_zone_id);
        if (!zoneId)
            return res.status(409).json({ success: false, message: 'Start the migration first.' });
        const discovered = await cloudflareDnsService.listScannedDnsRecords(zoneId);
        const selected = new Set(Array.isArray(req.body?.selectedKeys) ? req.body.selectedKeys.map((v) => s(v)) : []);
        if (!selected.size)
            return res.status(400).json({ success: false, message: 'Select at least one DNS record to import.' });
        const key = (r) => [s(r.type).toUpperCase(), s(r.name).toLowerCase(), s(r.content), String(r.priority ?? '')].join('|');
        const safe = (r) => {
            const o = { type: s(r.type).toUpperCase(), name: s(r.name), content: s(r.content), ttl: Number(r.ttl) || 1 };
            if (typeof r.proxied === 'boolean')
                o.proxied = r.proxied;
            if (r.priority !== undefined)
                o.priority = Number(r.priority);
            return o;
        };
        const accepts = discovered.filter((r) => SUPPORTED.has(s(r.type).toUpperCase()) && selected.has(key(r))).map(safe);
        if (!accepts.length)
            return res.status(400).json({ success: false, message: 'The selected records are no longer available. Refresh the scan.' });
        await cloudflareDnsService.reviewScannedDnsRecords(zoneId, accepts, []);
        const now = new Date().toISOString();
        const pendingNameservers = normalizeNs(x.d.dns_migration?.pending_nameservers);
        if (pendingNameservers.length < 2) {
            return res.status(409).json({ success: false, message: 'Runtime DNS nameservers are missing.' });
        }
        const resolved = await resolveNameservers(pendingNameservers);
        if (resolved.some((item) => !item.ip)) {
            return res.status(409).json({ success: false, message: 'Unable to resolve one or more Runtime DNS nameserver IPs.' });
        }
        const registryRequestId = `dns-migration-${x.id}-${zoneId}`;
        const registryRequest = {
            id: registryRequestId,
            domain_id: x.id,
            domain_name: s(x.d.domain_name),
            action: 'M',
            generated_template: '',
            status: 'ready',
            email_subject: `${s(x.d.domain_name)} - Runtime DNS nameserver modification`,
            customer_email: s(x.d.user_email),
            submitted_by: s(req.runtimeUser?.email) || s(req.runtimeUser?.uid) || 'customer',
            created_at: s(x.d.dns_migration?.registry_request_created_at) || now,
            updated_at: now,
            workflow_type: 'runtime_dns_migration',
            requested_nameservers: pendingNameservers,
            requested_nameserver_ips: resolved.map((item) => item.ip),
            cloudflare_zone_id: zoneId,
            notification_status: 'pending'
        };
        /*
         * Persist the manual ZISPA/registrar job BEFORE email is attempted.
         * A mail outage can therefore never make the operational request disappear.
         */
        await adminDb.collection('registry_requests').doc(registryRequestId).set(registryRequest, { merge: true });
        await x.ref.set({
            dns_migration: {
                ...x.d.dns_migration,
                status: 'ready_for_registry',
                reviewed_at: now,
                accepted_record_count: accepts.length,
                pending_nameservers: pendingNameservers,
                pending_nameserver_ips: resolved.map((item) => item.ip),
                registry_request_id: registryRequestId,
                registry_request_created_at: s(x.d.dns_migration?.registry_request_created_at) || now,
                last_error: null
            },
            cloudflare: {
                ...(x.d.cloudflare || {}),
                zone_id: zoneId,
                assigned_nameservers: pendingNameservers,
                last_error: null
            },
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        let notificationError = '';
        try {
            if (s(x.d.user_email)) {
                await emailService.sendEvent('dns_migration_ready', {
                    email: s(x.d.user_email),
                    name: s(x.d.owner_details?.full_name) || undefined,
                    domainName: s(x.d.domain_name),
                    nameservers: pendingNameservers,
                    dnsProvider: 'cloudflare',
                    dnsStatus: 'ready_for_registry'
                });
            }
            await adminDb.collection('registry_requests').doc(registryRequestId).set({
                notification_status: 'sent',
                notification_sent_at: new Date().toISOString(),
                notification_error: null,
                updated_at: new Date().toISOString()
            }, { merge: true });
        }
        catch (mailError) {
            notificationError = mailError instanceof Error ? mailError.message : 'Unable to send notification.';
            console.error('Runtime DNS registry notification failed:', mailError);
            await adminDb.collection('registry_requests').doc(registryRequestId).set({
                notification_status: 'failed',
                notification_error: notificationError,
                updated_at: new Date().toISOString()
            }, { merge: true });
        }
        res.json({
            success: true,
            status: 'ready_for_registry',
            accepted: accepts.length,
            pendingNameservers,
            registryRequestId,
            notificationSent: !notificationError,
            notificationError: notificationError || undefined,
            message: 'DNS records imported. The registry request is saved permanently and Runtime has been notified for manual processing.'
        });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to import reviewed DNS records.' });
    }
});
router.post('/:domainId/registry-submitted', async (req, res) => {
    try {
        const x = await owned(req, res);
        if (!x)
            return;
        if (s(req.runtimeUser?.role) !== 'super_admin')
            return res.status(403).json({ success: false, message: 'Only a Runtime administrator can confirm registrar submission.' });
        const m = x.d.dns_migration || {};
        if (s(m.status) !== 'ready_for_registry')
            return res.status(409).json({ success: false, message: 'DNS records must be reviewed before registrar cutover.' });
        const pending = Array.isArray(m.pending_nameservers) ? m.pending_nameservers.map((n) => s(n).toLowerCase()).filter(Boolean) : [];
        if (pending.length < 2)
            return res.status(409).json({ success: false, message: 'Runtime DNS nameservers are missing.' });
        const resolved = await resolveNameservers(pending);
        if (resolved.some(v => !v.ip))
            return res.status(409).json({ success: false, message: 'Unable to resolve one or more Runtime DNS nameserver IPs.' });
        const now = new Date().toISOString();
        /*
         * Submission to ZISPA is NOT delegation confirmation.
         * Keep the old live nameservers/provider until Cloudflare sees the new delegation.
         */
        await x.ref.set({
            dns_status: 'pending',
            cloudflare: {
                ...(x.d.cloudflare || {}),
                zone_id: m.cloudflare_zone_id,
                assigned_nameservers: pending,
                status: 'pending',
                provisioned_at: x.d.cloudflare?.provisioned_at || m.started_at || now,
                last_synced_at: now,
                last_error: null
            },
            dns_migration: {
                ...m,
                status: 'delegation_pending',
                pending_nameservers: pending,
                pending_nameserver_ips: resolved.map(v => v.ip),
                registry_submitted_at: now,
                registry_submitted_by: s(req.runtimeUser?.uid),
                last_error: null
            },
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        if (s(m.registry_request_id)) {
            await adminDb.collection('registry_requests').doc(s(m.registry_request_id)).set({
                status: 'submitted',
                submitted_at: now,
                submitted_by: s(req.runtimeUser?.email) || s(req.runtimeUser?.uid),
                registry_response_notes: 'Runtime administrator marked the manual ZISPA/registrar nameserver modification as submitted.',
                updated_at: now
            }, { merge: true });
        }
        res.json({ success: true, status: 'delegation_pending', nameservers: pending, nameserverIps: resolved.map(v => v.ip), message: 'Registrar submission recorded. The current nameservers remain displayed until the new delegation is detected.' });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to record registrar submission.' });
    }
});
export default router;

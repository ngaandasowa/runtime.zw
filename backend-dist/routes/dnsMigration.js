import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateIdentity } from '../middleware/authenticate.js';
import { cloudflareDnsService } from '../services/CloudflareDnsService.js';
const router = Router();
const s = (v) => String(v ?? '').trim();
const SUPPORTED = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA', 'SRV']);
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
    if (s(d.user_id) !== s(req.runtimeUser?.uid) && (!email || s(d.user_email).toLowerCase() !== email)) {
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
router.use(authenticateIdentity);
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
        res.json({ success: true, domainName: x.d.domain_name, currentNameservers: x.d.nameservers || [], migration: migrationView(x.d), records: scanned.filter(r => SUPPORTED.has(s(r.type).toUpperCase())) });
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
        if (s(x.d.dns_provider).toLowerCase() === 'cloudflare') {
            return res.status(409).json({ success: false, message: 'This domain is already using Runtime DNS.' });
        }
        const current = (x.d.nameservers || []).map((n) => s(n).toLowerCase()).filter(Boolean);
        if (current.length < 2)
            return res.status(409).json({ success: false, message: 'At least two current nameservers are required before migration.' });
        const existingZoneId = s(x.d.dns_migration?.cloudflare_zone_id);
        const zone = existingZoneId ? await cloudflareDnsService.getZone(existingZoneId) : await cloudflareDnsService.createZone(x.d.domain_name);
        const assigned = (zone.name_servers || []).map(n => s(n).toLowerCase()).filter(Boolean);
        if (assigned.length < 2)
            throw new Error('Cloudflare did not return assigned nameservers.');
        await cloudflareDnsService.triggerDnsScan(zone.id);
        await x.ref.set({
            dns_migration: {
                status: 'preparing',
                previous_nameservers: current,
                pending_nameservers: assigned,
                cloudflare_zone_id: zone.id,
                started_at: x.d.dns_migration?.started_at || new Date().toISOString(),
                scan_started_at: new Date().toISOString(),
                reviewed_at: null,
                last_error: null
            },
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true, message: 'DNS scan started. Your current nameservers have not been changed.', pendingNameservers: assigned });
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
        res.json({ success: true, records: records.filter(r => SUPPORTED.has(s(r.type).toUpperCase())) });
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
        const accepts = discovered.filter(r => SUPPORTED.has(s(r.type).toUpperCase()) && selected.has(key(r))).map(safe);
        if (!accepts.length)
            return res.status(400).json({ success: false, message: 'The selected records are no longer available. Refresh the scan.' });
        await cloudflareDnsService.reviewScannedDnsRecords(zoneId, accepts, []);
        await x.ref.set({
            dns_migration: {
                ...x.d.dns_migration,
                status: 'ready_for_registry',
                reviewed_at: new Date().toISOString(),
                accepted_record_count: accepts.length,
                last_error: null
            },
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });
        res.json({ success: true, status: 'ready_for_registry', accepted: accepts.length, pendingNameservers: x.d.dns_migration?.pending_nameservers || [], message: 'DNS records imported. Your current nameservers are still unchanged.' });
    }
    catch (e) {
        res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to import reviewed DNS records.' });
    }
});
export default router;

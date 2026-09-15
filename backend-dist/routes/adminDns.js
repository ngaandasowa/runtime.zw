import { Router } from 'express';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateWithProfile } from '../middleware/authenticate.js';
import { cloudflareDnsService } from '../services/CloudflareDnsService.js';
const router = Router();
const TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA']);
const PROXY = new Set(['A', 'AAAA', 'CNAME']);
const s = (v) => String(v ?? '').trim();
router.use(authenticateWithProfile);
router.use((req, res, next) => {
    if (req.runtimeUser?.role !== 'super_admin')
        return res.status(403).json({ success: false, message: 'Super admin access required.' });
    next();
});
async function domainFor(req, res) {
    const id = s(req.params.domainId);
    const snap = await adminDb.collection('domains').doc(id).get();
    if (!snap.exists) {
        res.status(404).json({ success: false, message: 'Domain not found.' });
        return null;
    }
    const d = snap.data();
    if (s(d.dns_provider).toLowerCase() !== 'cloudflare') {
        res.status(409).json({ success: false, message: 'This domain is not using Runtime DNS.' });
        return null;
    }
    const zoneId = s(d.cloudflare?.zone_id);
    if (!zoneId) {
        res.status(409).json({ success: false, message: 'Runtime DNS has not been provisioned yet.' });
        return null;
    }
    return { d, zoneId };
}
function recordName(v, domain) { const x = s(v).toLowerCase().replace(/\.$/, ''); if (!x || x === '@')
    return domain; if (x === domain || x.endsWith('.' + domain))
    return x; if (!/^[a-z0-9_*.-]+$/i.test(x))
    throw new Error('Enter a valid DNS record name.'); return x + '.' + domain; }
function input(body, domain) { const type = s(body?.type).toUpperCase(); if (!TYPES.has(type))
    throw new Error('Supported record types are A, AAAA, CNAME, MX, TXT and CAA.'); const content = s(body?.content ?? body?.value); if (!content)
    throw new Error('Record value is required.'); const raw = Number(body?.ttl ?? 1); const o = { type, name: recordName(body?.name, domain), content, ttl: raw === 1 ? 1 : Math.max(60, Math.min(86400, Math.floor(raw || 1))) }; o.proxied = PROXY.has(type) ? Boolean(body?.proxied) : false; if (type === 'MX') {
    const p = Number(body?.priority);
    if (!Number.isInteger(p) || p < 0 || p > 65535)
        throw new Error('MX priority must be between 0 and 65535.');
    o.priority = p;
    o.proxied = false;
} return o; }
router.get('/:domainId', async (req, res) => { try {
    const x = await domainFor(req, res);
    if (!x)
        return;
    const records = await cloudflareDnsService.listDnsRecords(x.zoneId);
    res.json({ success: true, domainName: cloudflareDnsService.normalizeDomain(x.d.domain_name), dnsStatus: x.d.dns_status || x.d.cloudflare?.status || 'pending', nameservers: x.d.nameservers || [], zoneId: x.zoneId, records: records.filter(r => TYPES.has(s(r.type).toUpperCase())) });
}
catch (e) {
    res.status(502).json({ success: false, message: e instanceof Error ? e.message : 'Unable to load DNS records.' });
} });
router.post('/:domainId/records', async (req, res) => { try {
    const x = await domainFor(req, res);
    if (!x)
        return;
    const r = await cloudflareDnsService.createDnsRecord(x.zoneId, input(req.body, cloudflareDnsService.normalizeDomain(x.d.domain_name)));
    res.status(201).json({ success: true, record: r });
}
catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to create DNS record.' });
} });
router.put('/:domainId/records/:recordId', async (req, res) => { try {
    const x = await domainFor(req, res);
    if (!x)
        return;
    const all = await cloudflareDnsService.listDnsRecords(x.zoneId);
    if (!all.some(r => r.id === req.params.recordId && TYPES.has(s(r.type).toUpperCase())))
        return res.status(404).json({ success: false, message: 'DNS record not found.' });
    const r = await cloudflareDnsService.updateDnsRecord(x.zoneId, req.params.recordId, input(req.body, cloudflareDnsService.normalizeDomain(x.d.domain_name)));
    res.json({ success: true, record: r });
}
catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to update DNS record.' });
} });
router.delete('/:domainId/records/:recordId', async (req, res) => { try {
    const x = await domainFor(req, res);
    if (!x)
        return;
    const all = await cloudflareDnsService.listDnsRecords(x.zoneId);
    if (!all.some(r => r.id === req.params.recordId && TYPES.has(s(r.type).toUpperCase())))
        return res.status(404).json({ success: false, message: 'DNS record not found.' });
    await cloudflareDnsService.deleteDnsRecord(x.zoneId, req.params.recordId);
    res.json({ success: true });
}
catch (e) {
    res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Unable to delete DNS record.' });
} });
export default router;

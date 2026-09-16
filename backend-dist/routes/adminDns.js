import { Router } from 'express';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateWithProfile } from '../middleware/authenticate.js';
import { cloudflareDnsService } from '../services/CloudflareDnsService.js';
import { DNS_TYPES, dnsAudit, dnsInput } from '../services/RuntimeDnsRecordService.js';
const router = Router();
const s = (value) => String(value ?? '').trim();
router.use(authenticateWithProfile);
router.use((req, res, next) => {
    if (req.runtimeUser?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Super admin access required.' });
    }
    next();
});
async function domainFor(req, res) {
    const id = s(req.params.domainId);
    const snap = await adminDb.collection('domains').doc(id).get();
    if (!snap.exists) {
        res.status(404).json({ success: false, message: 'Domain not found.' });
        return null;
    }
    const domain = snap.data();
    if (s(domain.dns_provider).toLowerCase() !== 'cloudflare') {
        res.status(409).json({ success: false, message: 'This domain is not using Runtime DNS.' });
        return null;
    }
    const zoneId = s(domain.cloudflare?.zone_id);
    if (!zoneId) {
        res.status(409).json({ success: false, message: 'Runtime DNS has not been provisioned yet.' });
        return null;
    }
    return { id, domain, zoneId };
}
function actor(req) {
    const user = req.runtimeUser;
    return { actorUid: s(user?.uid), actorEmail: s(user?.email), actorRole: 'admin' };
}
router.get('/:domainId', async (req, res) => {
    try {
        const x = await domainFor(req, res);
        if (!x)
            return;
        const records = await cloudflareDnsService.listDnsRecords(x.zoneId);
        res.json({
            success: true,
            domainName: cloudflareDnsService.normalizeDomain(x.domain.domain_name),
            dnsStatus: x.domain.dns_status || x.domain.cloudflare?.status || 'pending',
            nameservers: x.domain.nameservers || [],
            zoneId: x.zoneId,
            records: records.filter(r => DNS_TYPES.has(s(r.type).toUpperCase())),
        });
    }
    catch (error) {
        res.status(502).json({ success: false, message: error instanceof Error ? error.message : 'Unable to load DNS records.' });
    }
});
router.post('/:domainId/records', async (req, res) => {
    try {
        const x = await domainFor(req, res);
        if (!x)
            return;
        const domainName = cloudflareDnsService.normalizeDomain(x.domain.domain_name);
        const input = dnsInput(req.body, domainName);
        const record = await cloudflareDnsService.createDnsRecord(x.zoneId, input);
        await dnsAudit({ domainId: x.id, domainName, ...actor(req), action: 'create', recordId: record.id, record });
        res.status(201).json({ success: true, record });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to create DNS record.' });
    }
});
router.put('/:domainId/records/:recordId', async (req, res) => {
    try {
        const x = await domainFor(req, res);
        if (!x)
            return;
        const records = await cloudflareDnsService.listDnsRecords(x.zoneId);
        if (!records.some(r => r.id === req.params.recordId && DNS_TYPES.has(s(r.type).toUpperCase()))) {
            return res.status(404).json({ success: false, message: 'DNS record not found.' });
        }
        const domainName = cloudflareDnsService.normalizeDomain(x.domain.domain_name);
        const input = dnsInput(req.body, domainName);
        const record = await cloudflareDnsService.updateDnsRecord(x.zoneId, req.params.recordId, input);
        await dnsAudit({ domainId: x.id, domainName, ...actor(req), action: 'update', recordId: record.id, record });
        res.json({ success: true, record });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to update DNS record.' });
    }
});
router.delete('/:domainId/records/:recordId', async (req, res) => {
    try {
        const x = await domainFor(req, res);
        if (!x)
            return;
        const records = await cloudflareDnsService.listDnsRecords(x.zoneId);
        const record = records.find(r => r.id === req.params.recordId && DNS_TYPES.has(s(r.type).toUpperCase()));
        if (!record)
            return res.status(404).json({ success: false, message: 'DNS record not found.' });
        await cloudflareDnsService.deleteDnsRecord(x.zoneId, req.params.recordId);
        const domainName = cloudflareDnsService.normalizeDomain(x.domain.domain_name);
        await dnsAudit({ domainId: x.id, domainName, ...actor(req), action: 'delete', recordId: record.id, record });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Unable to delete DNS record.' });
    }
});
export default router;

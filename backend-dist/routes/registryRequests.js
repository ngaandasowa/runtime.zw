import { Router } from 'express';
import { adminDb } from '../firebaseAdmin.js';
import { authenticateWithProfile } from '../middleware/authenticate.js';
const router = Router();
const s = (v) => String(v ?? '').trim();
router.use(authenticateWithProfile);
const requireAdmin = (req, res) => {
    if (s(req.runtimeUser?.role) !== 'super_admin') {
        res.status(403).json({ success: false, message: 'Administrator access required.' });
        return false;
    }
    return true;
};
router.get('/', async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        const snap = await adminDb.collection('registry_requests').get();
        const requests = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
        res.json({ success: true, requests });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unable to load registry requests.',
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const input = req.body?.request || {};
        const id = s(input.id);
        const domainId = s(input.domain_id);
        if (!id || !domainId || !s(input.domain_name) || !s(input.action)) {
            return res.status(400).json({ success: false, message: 'Invalid registry request.' });
        }
        /*
         * Customers may create a durable request only for a domain they own.
         * Admins may create requests for any domain. The generated template is
         * never trusted from the browser; Admin Registry regenerates it from
         * authoritative domain data.
         */
        const domainSnap = await adminDb.collection('domains').doc(domainId).get();
        if (!domainSnap.exists) {
            return res.status(404).json({ success: false, message: 'Domain not found.' });
        }
        const domain = domainSnap.data() || {};
        const email = s(req.runtimeUser?.email).toLowerCase();
        const isAdmin = s(req.runtimeUser?.role) === 'super_admin';
        const isOwner = s(domain.user_id) === s(req.runtimeUser?.uid) ||
            Boolean(email && s(domain.user_email).toLowerCase() === email);
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, message: 'You do not have access to this domain.' });
        }
        const now = new Date().toISOString();
        const request = {
            ...input,
            id,
            domain_id: domainId,
            domain_name: s(domain.domain_name) || s(input.domain_name),
            customer_email: s(domain.user_email) || s(input.customer_email),
            generated_template: '',
            created_at: s(input.created_at) || now,
            updated_at: now,
            persisted_at: now,
        };
        await adminDb.collection('registry_requests').doc(id).set(request, { merge: true });
        res.json({ success: true, request });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unable to save registry request.',
        });
    }
});
router.patch('/:requestId', async (req, res) => {
    try {
        if (!requireAdmin(req, res))
            return;
        const id = s(req.params.requestId);
        const ref = adminDb.collection('registry_requests').doc(id);
        const snap = await ref.get();
        if (!snap.exists) {
            return res.status(404).json({ success: false, message: 'Registry request not found.' });
        }
        const allowed = [
            'status',
            'submitted_at',
            'confirmed_at',
            'submitted_by',
            'registry_response_notes',
            'notification_status',
            'notification_error',
            'updated_at',
        ];
        const incoming = req.body?.changes || {};
        const changes = {};
        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(incoming, key)) {
                changes[key] = incoming[key];
            }
        }
        changes.updated_at = new Date().toISOString();
        await ref.set(changes, { merge: true });
        const updated = await ref.get();
        res.json({ success: true, request: { id, ...updated.data() } });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Unable to update registry request.',
        });
    }
});
export default router;

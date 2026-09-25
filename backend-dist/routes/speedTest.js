import { Router } from 'express';
import { adminDb } from '../firebaseAdmin.js';
const router = Router();
const ref = adminDb.collection('_runtime_tools').doc('speed_test');
router.get('/stats', async (_req, res) => {
    try {
        const doc = await ref.get();
        res.json({ success: true, useful_count: Number(doc.data()?.useful_count || 0) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Could not load speed test stats.' });
    }
});
router.post('/useful', async (_req, res) => {
    try {
        const useful_count = await adminDb.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            const next = Number(doc.data()?.useful_count || 0) + 1;
            tx.set(ref, { useful_count: next, updated_at: new Date().toISOString() }, { merge: true });
            return next;
        });
        res.json({ success: true, useful_count });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || 'Could not save feedback.' });
    }
});
export default router;

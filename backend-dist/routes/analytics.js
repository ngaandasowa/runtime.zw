import { Router } from 'express';
import { analyticsDataService, } from '../services/AnalyticsDataService.js';
import { authenticateWithProfile, } from '../middleware/authenticate.js';
const router = Router();
const requireSuperAdmin = (req, res, next) => {
    if (req.runtimeUser?.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Super administrator permission required.',
        });
    }
    next();
};
const eventWindows = new Map();
const EVENT_WINDOW_MS = 60_000;
const MAX_EVENTS_PER_WINDOW = 120;
const allowEvent = (ip) => {
    const now = Date.now();
    const current = eventWindows.get(ip);
    if (!current || current.resetAt <= now) {
        eventWindows.set(ip, { count: 1, resetAt: now + EVENT_WINDOW_MS });
        return true;
    }
    if (current.count >= MAX_EVENTS_PER_WINDOW) {
        return false;
    }
    current.count += 1;
    return true;
};
router.get('/', authenticateWithProfile, requireSuperAdmin, async (req, res) => {
    try {
        const requested = Number(req.query.days || 30);
        const daysBack = Number.isFinite(requested) ? requested : 30;
        const analytics = await analyticsDataService.getAnalytics(daysBack);
        return res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        console.error('Analytics endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load analytics.',
        });
    }
});
router.get('/user/:userId', authenticateWithProfile, requireSuperAdmin, async (req, res) => {
    try {
        const requested = Number(req.query.days || 30);
        const days = Number.isFinite(requested) ? requested : 30;
        const activity = await analyticsDataService.getUserActivity(String(req.params.userId || ''), days);
        return res.json({ success: true, data: activity });
    }
    catch (error) {
        console.error('User activity endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to load user activity.',
        });
    }
});
router.post('/event', async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!allowEvent(ip)) {
        return res.status(429).json({
            success: false,
            message: 'Too many analytics events.',
        });
    }
    try {
        const eventName = typeof req.body?.eventName === 'string'
            ? req.body.eventName.trim()
            : '';
        if (!eventName || eventName.length > 80) {
            return res.status(400).json({
                success: false,
                message: 'A valid eventName is required.',
            });
        }
        const userId = typeof req.body?.userId === 'string'
            ? req.body.userId
            : null;
        const data = req.body?.data && typeof req.body.data === 'object'
            ? req.body.data
            : {};
        await analyticsDataService.logEvent(eventName, userId, data);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Log event endpoint error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to record analytics event.',
        });
    }
});
export default router;

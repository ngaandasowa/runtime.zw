import { Router, } from 'express';
import { analyticsDataService, } from '../services/AnalyticsDataService.js';
const router = Router();
/**
 * GET /analytics
 * Get aggregated analytics for the dashboard
 */
router.get('/', async (req, res) => {
    try {
        const daysBack = req.query.days
            ? parseInt(req.query.days)
            : 30;
        const analytics = await analyticsDataService.getAnalytics(daysBack);
        res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        console.error('Analytics endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch analytics',
        });
    }
});
/**
 * GET /analytics/conversion
 * Get conversion metrics
 */
router.get('/conversion', async (req, res) => {
    try {
        const metrics = await analyticsDataService.getConversionMetrics();
        res.json({
            success: true,
            data: metrics,
        });
    }
    catch (error) {
        console.error('Conversion metrics endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch conversion metrics',
        });
    }
});
/**
 * GET /analytics/user/:userId
 * Get activity for a specific user
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const days = req.query.days
            ? parseInt(req.query.days)
            : 30;
        const activity = await analyticsDataService.getUserActivity(userId, days);
        res.json({
            success: true,
            data: activity,
        });
    }
    catch (error) {
        console.error('User activity endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch user activity',
        });
    }
});
/**
 * POST /analytics/event
 * Log a custom analytics event
 */
router.post('/event', async (req, res) => {
    try {
        const { eventName, userId, data, } = req.body;
        if (!eventName) {
            return res.status(400).json({
                success: false,
                error: 'eventName is required',
            });
        }
        await analyticsDataService.logEvent(eventName, userId || null, data || {});
        res.json({
            success: true,
            message: 'Event logged successfully',
        });
    }
    catch (error) {
        console.error('Log event endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error
                ? error.message
                : 'Failed to log event',
        });
    }
});
export default router;

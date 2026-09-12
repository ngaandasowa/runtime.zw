import { FieldValue, getFirestore, Timestamp, } from 'firebase-admin/firestore';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_DAYS = 90;
const RECENT_ACTIVITY_LIMIT = 20;
const encodeKey = (value) => Buffer.from(value, 'utf8').toString('base64url');
const decodeKey = (value) => {
    try {
        return Buffer.from(value, 'base64url').toString('utf8');
    }
    catch {
        return value;
    }
};
const safeCount = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
};
const toIso = (value) => {
    if (value?.toDate) {
        return value.toDate().toISOString();
    }
    if (typeof value === 'string') {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toISOString();
        }
    }
    return new Date().toISOString();
};
const utcDayKey = (date = new Date()) => date.toISOString().slice(0, 10);
class AnalyticsDataService {
    db = getFirestore();
    cache = new Map();
    normalizeDays(daysBack) {
        if (!Number.isFinite(daysBack))
            return 30;
        return Math.min(MAX_DAYS, Math.max(1, Math.floor(daysBack)));
    }
    startDayKey(daysBack) {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (daysBack - 1));
        return utcDayKey(start);
    }
    empty() {
        return {
            totalUsers: 0,
            activeUsers: 0,
            signUps: 0,
            signIns: 0,
            signOuts: 0,
            domainSearches: 0,
            domainRegistrations: 0,
            domainTransfers: 0,
            totalPaymentAmount: 0,
            paymentCount: 0,
            topDomains: [],
            topPages: [],
            usersByRole: {},
            signInMethods: {},
            paymentMethods: {},
            recentSessions: [],
        };
    }
    /**
     * Dashboard analytics reads only small daily aggregate documents.
     * It never scans analytics_events, payments, domains or users.
     * Business metrics are calculated in the React admin screen from
     * StoreContext, exactly like AdminDashboard.
     */
    async getAnalytics(daysBack = 30) {
        const days = this.normalizeDays(daysBack);
        const cached = this.cache.get(days);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value;
        }
        const startKey = this.startDayKey(days);
        const startDate = new Date(`${startKey}T00:00:00.000Z`);
        try {
            const [dailySnapshot, recentSnapshot] = await Promise.all([
                this.db
                    .collection('analytics_daily')
                    .where('date', '>=', startKey)
                    .orderBy('date', 'asc')
                    .limit(days)
                    .get(),
                this.db
                    .collection('analytics_events')
                    .where('timestamp', '>=', Timestamp.fromDate(startDate))
                    .orderBy('timestamp', 'desc')
                    .limit(RECENT_ACTIVITY_LIMIT)
                    .get(),
            ]);
            const eventCounts = {};
            const domainCounts = {};
            const pageCounts = {};
            const signInMethods = {};
            const activeUsers = new Set();
            for (const doc of dailySnapshot.docs) {
                const data = doc.data() || {};
                for (const [key, value] of Object.entries(data.eventCounts || {})) {
                    const name = decodeKey(key);
                    eventCounts[name] = (eventCounts[name] || 0) + safeCount(value);
                }
                for (const [key, value] of Object.entries(data.domainCounts || {})) {
                    const name = decodeKey(key);
                    domainCounts[name] = (domainCounts[name] || 0) + safeCount(value);
                }
                for (const [key, value] of Object.entries(data.pageCounts || {})) {
                    const name = decodeKey(key);
                    pageCounts[name] = (pageCounts[name] || 0) + safeCount(value);
                }
                for (const [key, value] of Object.entries(data.signInMethods || {})) {
                    const name = decodeKey(key);
                    signInMethods[name] = (signInMethods[name] || 0) + safeCount(value);
                }
                for (const userId of Array.isArray(data.activeUserIds) ? data.activeUserIds : []) {
                    if (userId && userId !== 'anonymous') {
                        activeUsers.add(String(userId));
                    }
                }
            }
            const topDomains = Object.entries(domainCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([domain, count]) => ({ domain, count }));
            const topPages = Object.entries(pageCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([page, count]) => ({ page, count }));
            const recentSessions = recentSnapshot.docs.map((doc) => {
                const data = doc.data() || {};
                return {
                    userId: String(data.userId || 'anonymous'),
                    event: String(data.eventName || data.event_type || 'event'),
                    timestamp: toIso(data.timestamp),
                    data: data.data || {},
                };
            });
            const value = {
                ...this.empty(),
                activeUsers: activeUsers.size,
                signUps: safeCount(eventCounts.user_sign_up),
                signIns: safeCount(eventCounts.user_sign_in),
                signOuts: safeCount(eventCounts.user_sign_out),
                domainSearches: safeCount(eventCounts.domain_search),
                domainRegistrations: safeCount(eventCounts.domain_registration_initiated),
                domainTransfers: safeCount(eventCounts.domain_transfer_initiated),
                topDomains,
                topPages,
                signInMethods,
                recentSessions,
            };
            this.cache.set(days, {
                expiresAt: Date.now() + CACHE_TTL_MS,
                value,
            });
            return value;
        }
        catch (error) {
            console.error('Failed to get bounded analytics summary:', error);
            return this.empty();
        }
    }
    /**
     * Every event updates one small daily aggregate document. This is a
     * write, not a collection scan. No Firestore read is required here.
     * A raw event is retained for the recent-activity/user timeline, but
     * dashboard reporting never scans the raw collection.
     */
    async logEvent(eventName, userId, eventData) {
        try {
            const normalizedEvent = String(eventName || '').trim();
            if (!normalizedEvent)
                return;
            const normalizedUser = String(userId || 'anonymous');
            const day = utcDayKey();
            const eventKey = encodeKey(normalizedEvent);
            const dailyRef = this.db.collection('analytics_daily').doc(day);
            const payload = {
                date: day,
                updatedAt: FieldValue.serverTimestamp(),
                eventCounts: {
                    [eventKey]: FieldValue.increment(1),
                },
            };
            if (normalizedUser !== 'anonymous') {
                payload.activeUserIds = FieldValue.arrayUnion(normalizedUser);
            }
            const page = String(eventData?.page_name || eventData?.page || '').trim();
            if (normalizedEvent === 'page_view' && page) {
                payload.pageCounts = {
                    [encodeKey(page)]: FieldValue.increment(1),
                };
            }
            const domain = String(eventData?.domain || '').trim().toLowerCase();
            if (domain &&
                (normalizedEvent === 'domain_search' ||
                    normalizedEvent === 'domain_check' ||
                    normalizedEvent === 'domain_registration_initiated' ||
                    normalizedEvent === 'domain_transfer_initiated')) {
                payload.domainCounts = {
                    [encodeKey(domain)]: FieldValue.increment(1),
                };
            }
            const signInMethod = String(eventData?.method || '').trim();
            if (signInMethod &&
                (normalizedEvent === 'user_sign_in' || normalizedEvent === 'user_sign_up')) {
                payload.signInMethods = {
                    [encodeKey(signInMethod)]: FieldValue.increment(1),
                };
            }
            await Promise.all([
                dailyRef.set(payload, { merge: true }),
                this.db.collection('analytics_events').add({
                    eventName: normalizedEvent,
                    userId: normalizedUser,
                    data: eventData || {},
                    timestamp: Timestamp.now(),
                }),
            ]);
            // New activity makes cached summaries stale.
            this.cache.clear();
        }
        catch (error) {
            console.error('Failed to log analytics event:', error);
        }
    }
    async getUserActivity(userId, days = 30) {
        try {
            const safeDays = this.normalizeDays(days);
            const start = new Date();
            start.setDate(start.getDate() - safeDays);
            const snapshot = await this.db
                .collection('analytics_events')
                .where('userId', '==', userId)
                .where('timestamp', '>=', Timestamp.fromDate(start))
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();
            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                timestamp: toIso(doc.data()?.timestamp),
            }));
        }
        catch (error) {
            console.error('Failed to get user activity:', error);
            return [];
        }
    }
}
export const analyticsDataService = new AnalyticsDataService();

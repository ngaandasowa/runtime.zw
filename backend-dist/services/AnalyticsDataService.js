import { getFirestore, Timestamp, } from 'firebase-admin/firestore';
import { getAuth, } from 'firebase-admin/auth';
class AnalyticsDataService {
    db = getFirestore();
    auth = getAuth();
    /**
     * Get all analytics stats
     */
    async getAnalytics(daysBack = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        try {
            const [usersData, eventsData, businessData,] = await Promise.all([
                this.getUserStats(startDate),
                this.getEventsStats(startDate),
                this.getBusinessStats(startDate),
            ]);
            return {
                ...eventsData,
                ...usersData,
                ...businessData,
            };
        }
        catch (error) {
            console.error('Failed to get analytics:', error);
            return this.getEmptyAnalytics();
        }
    }
    /**
     * Get user statistics
     */
    async getUserStats(startDate) {
        try {
            const listUsersResult = await this.auth.listUsers(1000);
            const users = listUsersResult.users;
            const totalUsers = users.length;
            const usersByRole = {
                super_admin: 0,
                admin: 0,
                customer: 0,
            };
            let signUps = 0;
            for (const user of users) {
                const role = user.customClaims?.role ||
                    'customer';
                usersByRole[role] =
                    (usersByRole[role] || 0) + 1;
                const createdAt = user.metadata.creationTime
                    ? new Date(user.metadata.creationTime)
                    : null;
                if (createdAt && createdAt >= startDate) {
                    signUps++;
                }
            }
            const activeSnapshot = await this.db
                .collection('analytics_events')
                .where('timestamp', '>=', Timestamp.fromDate(startDate))
                .get();
            const activeUserIds = new Set();
            activeSnapshot.docs.forEach((doc) => {
                const userId = String(doc.data()?.userId || '');
                if (userId && userId !== 'anonymous') {
                    activeUserIds.add(userId);
                }
            });
            return {
                totalUsers,
                usersByRole,
                activeUsers: activeUserIds.size,
                signUps,
            };
        }
        catch (error) {
            console.error('Failed to get user stats:', error);
            return {
                totalUsers: 0,
                activeUsers: 0,
                signUps: 0,
                usersByRole: {},
            };
        }
    }
    /**
     * Use Runtime's real business collections for money and
     * registered-domain totals. Analytics events remain the source
     * for behavioural data such as page views and searches.
     */
    async getBusinessStats(startDate) {
        try {
            const [paymentsSnapshot, domainsSnapshot] = await Promise.all([
                this.db.collection('payments').get(),
                this.db.collection('domains').get(),
            ]);
            let totalPaymentAmount = 0;
            let paymentCount = 0;
            const paymentMethods = {};
            paymentsSnapshot.docs.forEach((doc) => {
                const payment = doc.data() || {};
                if (payment.status !== 'verified' ||
                    payment.gateway === 'runtime_credit') {
                    return;
                }
                const rawDate = payment.verified_at ||
                    payment.updated_at ||
                    payment.created_at;
                const paymentDate = this.toDate(rawDate);
                if (!paymentDate || paymentDate < startDate) {
                    return;
                }
                const amount = Number(payment.amount || 0);
                if (Number.isFinite(amount)) {
                    totalPaymentAmount += amount;
                }
                paymentCount++;
                const method = String(payment.gateway ||
                    payment.method ||
                    'unknown');
                paymentMethods[method] =
                    (paymentMethods[method] || 0) + 1;
            });
            let domainRegistrations = 0;
            let domainTransfers = 0;
            domainsSnapshot.docs.forEach((doc) => {
                const domain = doc.data() || {};
                const domainDate = this.toDate(domain.registered_at ||
                    domain.created_at ||
                    domain.updated_at);
                if (!domainDate || domainDate < startDate) {
                    return;
                }
                const status = String(domain.status || '');
                if (status !== 'cancelled' &&
                    status !== 'registry_rejected' &&
                    status !== 'replaced') {
                    domainRegistrations++;
                }
                if (domain.transfer === true ||
                    domain.registration_type === 'transfer' ||
                    domain.type === 'transfer') {
                    domainTransfers++;
                }
            });
            return {
                totalPaymentAmount,
                paymentCount,
                paymentMethods,
                domainRegistrations,
                domainTransfers,
            };
        }
        catch (error) {
            console.error('Failed to get business analytics:', error);
            return {
                totalPaymentAmount: 0,
                paymentCount: 0,
                paymentMethods: {},
                domainRegistrations: 0,
                domainTransfers: 0,
            };
        }
    }
    toDate(value) {
        if (!value) {
            return null;
        }
        if (typeof value?.toDate === 'function') {
            return value.toDate();
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
            ? null
            : parsed;
    }
    /**
     * Get events statistics
     */
    async getEventsStats(startDate) {
        try {
            const eventsSnapshot = await this.db
                .collection('analytics_events')
                .where('timestamp', '>=', Timestamp.fromDate(startDate))
                .orderBy('timestamp', 'desc')
                .get();
            const events = eventsSnapshot.docs.map((doc) => doc.data());
            return this.processEventsStats(events);
        }
        catch (error) {
            console.error('Failed to get events stats:', error);
            return {
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
                signInMethods: {},
                paymentMethods: {},
                recentSessions: [],
            };
        }
    }
    /**
     * Process raw events into statistics
     */
    processEventsStats(events) {
        let signUps = 0;
        let signIns = 0;
        let signOuts = 0;
        let domainSearches = 0;
        let domainRegistrations = 0;
        let domainTransfers = 0;
        let totalPaymentAmount = 0;
        let paymentCount = 0;
        const domainCounts = {};
        const pageCounts = {};
        const signInMethods = {};
        const paymentMethods = {};
        const recentSessions = [];
        for (const event of events) {
            const eventType = event.eventName ||
                event.event_type;
            const eventData = event.data || {};
            if (eventType === 'user_sign_up') {
                signUps++;
                const method = eventData.method || 'email';
                signInMethods[method] =
                    (signInMethods[method] || 0) + 1;
            }
            else if (eventType === 'user_sign_in') {
                signIns++;
                const method = eventData.method || 'email';
                signInMethods[method] =
                    (signInMethods[method] || 0) + 1;
            }
            else if (eventType === 'user_sign_out') {
                signOuts++;
            }
            else if (eventType ===
                'domain_search') {
                domainSearches++;
            }
            else if (eventType ===
                'domain_check') {
                if (eventData.domain) {
                    domainCounts[eventData.domain] =
                        (domainCounts[eventData.domain] || 0) + 1;
                }
            }
            else if (eventType ===
                'domain_registration_initiated') {
                domainRegistrations++;
                if (eventData.domain) {
                    domainCounts[eventData.domain] =
                        (domainCounts[eventData.domain] || 0) + 1;
                }
            }
            else if (eventType ===
                'domain_transfer_initiated') {
                domainTransfers++;
                if (eventData.domain) {
                    domainCounts[eventData.domain] =
                        (domainCounts[eventData.domain] || 0) + 1;
                }
            }
            else if (eventType ===
                'payment_completed') {
                paymentCount++;
                totalPaymentAmount +=
                    eventData.amount || 0;
                const method = eventData.method || 'card';
                paymentMethods[method] =
                    (paymentMethods[method] || 0) + 1;
            }
            else if (eventType === 'page_view') {
                const page = eventData.page_name ||
                    eventData.page;
                if (page) {
                    pageCounts[page] =
                        (pageCounts[page] || 0) +
                            1;
                }
            }
            // Collect recent sessions
            if (recentSessions.length < 50) {
                recentSessions.push({
                    userId: event.userId ||
                        'anonymous',
                    event: eventType,
                    timestamp: event.timestamp?.toDate?.()?.toISOString?.() ||
                        (typeof event.timestamp === 'string'
                            ? event.timestamp
                            : new Date().toISOString()),
                    data: event.data,
                });
            }
        }
        // Sort and limit top domains and pages
        const topDomains = Object.entries(domainCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([domain, count,]) => ({
            domain,
            count,
        }));
        const topPages = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([page, count]) => ({
            page,
            count,
        }));
        return {
            signUps,
            signIns,
            signOuts,
            domainSearches,
            domainRegistrations,
            domainTransfers,
            totalPaymentAmount,
            paymentCount,
            topDomains,
            topPages,
            signInMethods,
            paymentMethods,
            recentSessions,
        };
    }
    /**
     * Log an analytics event
     */
    async logEvent(eventName, userId, eventData) {
        try {
            await this.db
                .collection('analytics_events')
                .add({
                eventName,
                userId: userId || 'anonymous',
                data: eventData,
                timestamp: Timestamp.now(),
            });
        }
        catch (error) {
            console.error('Failed to log analytics event:', error);
        }
    }
    /**
     * Get user activity timeline
     */
    async getUserActivity(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const snapshot = await this.db
                .collection('analytics_events')
                .where('userId', '==', userId)
                .where('timestamp', '>=', Timestamp.fromDate(startDate))
                .orderBy('timestamp', 'desc')
                .get();
            return snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data()
                    .timestamp
                    ?.toDate()
                    ?.toISOString() ||
                    new Date().toISOString(),
            }));
        }
        catch (error) {
            console.error('Failed to get user activity:', error);
            return [];
        }
    }
    /**
     * Get conversion metrics
     */
    async getConversionMetrics() {
        try {
            const analytics = await this.getAnalytics(90);
            return {
                totalVisitors: analytics.activeUsers,
                signUpConversion: analytics.totalUsers > 0
                    ? ((analytics.signUps /
                        analytics.activeUsers) *
                        100).toFixed(2)
                    : '0',
                paymentConversion: analytics.totalUsers > 0
                    ? ((analytics.paymentCount /
                        analytics.totalUsers) *
                        100).toFixed(2)
                    : '0',
                averageOrderValue: analytics.paymentCount > 0
                    ? (analytics.totalPaymentAmount /
                        analytics.paymentCount).toFixed(2)
                    : '0',
                domainRegistrationRate: analytics.totalUsers > 0
                    ? ((analytics.domainRegistrations /
                        analytics.totalUsers) *
                        100).toFixed(2)
                    : '0',
            };
        }
        catch (error) {
            console.error('Failed to get conversion metrics:', error);
            return this.getEmptyConversionMetrics();
        }
    }
    getEmptyConversionMetrics() {
        return {
            totalVisitors: 0,
            signUpConversion: '0',
            paymentConversion: '0',
            averageOrderValue: '0',
            domainRegistrationRate: '0',
        };
    }
    getEmptyAnalytics() {
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
}
export const analyticsDataService = new AnalyticsDataService();

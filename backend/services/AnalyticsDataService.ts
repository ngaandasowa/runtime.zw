import {
  FieldValue,
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';

export interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  signUps: number;
  signIns: number;
  signOuts: number;
  domainSearches: number;
  domainRegistrations: number;
  domainTransfers: number;
  totalPaymentAmount: number;
  paymentCount: number;
  topDomains: Array<{ domain: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  usersByRole: Record<string, number>;
  signInMethods: Record<string, number>;
  paymentMethods: Record<string, number>;
  viewStats: { today: number; week: number; month: number; onlineNow: number };
  recentSessions: Array<{
    userId: string;
    event: string;
    timestamp: string;
    data?: Record<string, any>;
  }>;
}

type CacheEntry = {
  expiresAt: number;
  value: AnalyticsStats;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_DAYS = 90;
const RECENT_ACTIVITY_LIMIT = 20;

const encodeKey = (value: string) =>
  Buffer.from(value, 'utf8').toString('base64url');

const decodeKey = (value: string) => {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return value;
  }
};

const safeCount = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const toIso = (value: any) => {
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

const utcDayKey = (date = new Date()) =>
  date.toISOString().slice(0, 10);

class AnalyticsDataService {
  private db = getFirestore();
  private cache = new Map<number, CacheEntry>();

  private normalizeDays(daysBack: number) {
    if (!Number.isFinite(daysBack)) return 30;
    return Math.min(MAX_DAYS, Math.max(1, Math.floor(daysBack)));
  }

  private startDayKey(daysBack: number) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (daysBack - 1));
    return utcDayKey(start);
  }

  private empty(): AnalyticsStats {
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
      viewStats: { today: 0, week: 0, month: 0, onlineNow: 0 },
      recentSessions: [],
    };
  }

  /**
   * Dashboard analytics reads only small daily aggregate documents.
   * It never scans analytics_events, payments, domains or users.
   * Business metrics are calculated in the React admin screen from
   * StoreContext, exactly like AdminDashboard.
   */
  async getAnalytics(daysBack = 30): Promise<AnalyticsStats> {
    const days = this.normalizeDays(daysBack);
    const cached = this.cache.get(days);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const startKey = this.startDayKey(days);
    const startDate = new Date(`${startKey}T00:00:00.000Z`);

    try {
      // Always read at least 30 daily documents so the dashboard can show
      // honest Today / 7 days / 30 days view totals at the same time.
      const viewWindowDays = Math.max(days, 30);
      const viewStartKey = this.startDayKey(viewWindowDays);
      const onlineSince = new Date(Date.now() - 2 * 60 * 1000);

      const [dailySnapshot, recentSnapshot, presenceSnapshot] = await Promise.all([
        this.db
          .collection('analytics_daily')
          .where('date', '>=', viewStartKey)
          .orderBy('date', 'asc')
          .limit(viewWindowDays)
          .get(),
        this.db
          .collection('analytics_events')
          .where('timestamp', '>=', Timestamp.fromDate(startDate))
          .orderBy('timestamp', 'desc')
          .limit(RECENT_ACTIVITY_LIMIT)
          .get(),
        this.db
          .collection('analytics_presence')
          .where('updatedAt', '>=', Timestamp.fromDate(onlineSince))
          .get(),
      ]);

      const eventCounts: Record<string, number> = {};
      const domainCounts: Record<string, number> = {};
      const pageCounts: Record<string, number> = {};
      const signInMethods: Record<string, number> = {};
      const activeUsers = new Set<string>();

      const todayKey = utcDayKey();
      const weekStartKey = this.startDayKey(7);
      const monthStartKey = this.startDayKey(30);
      let viewsToday = 0;
      let viewsWeek = 0;
      let viewsMonth = 0;

      for (const doc of dailySnapshot.docs) {
        const data = doc.data() || {};
        const docDate = String(data.date || doc.id);
        const pageViewsForDay = Object.values(data.pageCounts || {}).reduce(
          (sum: number, value: unknown) => sum + safeCount(value),
          0
        );

        if (docDate === todayKey) viewsToday += pageViewsForDay;
        if (docDate >= weekStartKey) viewsWeek += pageViewsForDay;
        if (docDate >= monthStartKey) viewsMonth += pageViewsForDay;

        // Other dashboard metrics still respect the selected reporting period.
        if (docDate < startKey) continue;

        for (const [key, value] of Object.entries(data.eventCounts || {})) {
          const name = decodeKey(key);
          eventCounts[name] = (eventCounts[name] || 0) + safeCount(value);
        }

        for (const [key, value] of Object.entries(data.searchDomainCountsV2 || {})) {
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

      const value: AnalyticsStats = {
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
        viewStats: {
          today: viewsToday,
          week: viewsWeek,
          month: viewsMonth,
          onlineNow: presenceSnapshot.size,
        },
        recentSessions,
      };

      this.cache.set(days, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        value,
      });

      return value;
    } catch (error) {
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
  async logEvent(
    eventName: string,
    userId: string | null,
    eventData: Record<string, any>
  ) {
    try {
      const normalizedEvent = String(eventName || '').trim();
      if (!normalizedEvent) return;

      const normalizedUser = String(userId || 'anonymous');

      // Presence is a lightweight heartbeat, not a page view. One document per
      // browser tab/session is updated, allowing Online Now to count sessions
      // active in the last two minutes without inflating page-view analytics.
      if (normalizedEvent === 'presence') {
        const sessionId = String(eventData?.session_id || '').trim();
        if (!sessionId) return;

        await this.db.collection('analytics_presence').doc(encodeKey(sessionId)).set({
          sessionId,
          userId: normalizedUser,
          page: String(eventData?.page_name || eventData?.page || ''),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        this.cache.clear();
        return;
      }

      const day = utcDayKey();
      const eventKey = encodeKey(normalizedEvent);
      const dailyRef = this.db.collection('analytics_daily').doc(day);

      const payload: Record<string, any> = {
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
      if (domain && normalizedEvent === 'domain_search') {
        payload.searchDomainCountsV2 = {
          [encodeKey(domain)]: FieldValue.increment(1),
        };
      }

      const signInMethod = String(eventData?.method || '').trim();
      if (
        signInMethod &&
        (normalizedEvent === 'user_sign_in' || normalizedEvent === 'user_sign_up')
      ) {
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
    } catch (error) {
      console.error('Failed to log analytics event:', error);
    }
  }

  async getUserActivity(userId: string, days = 30) {
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
    } catch (error) {
      console.error('Failed to get user activity:', error);
      return [];
    }
  }
}

export const analyticsDataService = new AnalyticsDataService();

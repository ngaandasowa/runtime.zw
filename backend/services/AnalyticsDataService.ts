import {
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  getAuth,
} from 'firebase-admin/auth';

interface AnalyticsStats {
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
  recentSessions: Array<{
    userId: string;
    event: string;
    timestamp: string;
    data?: Record<string, any>;
  }>;
}

class AnalyticsDataService {
  private db = getFirestore();
  private auth = getAuth();

  /**
   * Get all analytics stats
   */
  async getAnalytics(
    daysBack: number = 30
  ): Promise<AnalyticsStats> {
    const startDate = new Date();
    startDate.setDate(
      startDate.getDate() - daysBack
    );

    try {
      const [
        usersData,
        eventsData,
      ] = await Promise.all([
        this.getUserStats(),
        this.getEventsStats(startDate),
      ]);

      return {
        ...usersData,
        ...eventsData,
      };
    } catch (error) {
      console.error(
        'Failed to get analytics:',
        error
      );
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get user statistics
   */
  private async getUserStats() {
    try {
      const listUsersResult =
        await this.auth.listUsers();

      const totalUsers =
        listUsersResult.users.length;

      const usersByRole: Record<
        string,
        number
      > = {
        admin: 0,
        customer: 0,
      };

      for (const user of listUsersResult
        .users) {
        const role =
          (user.customClaims
            ?.role as string) ||
          'customer';

        usersByRole[role] =
          (usersByRole[role] || 0) +
          1;
      }

      return {
        totalUsers,
        usersByRole,
        activeUsers: Math.floor(
          totalUsers * 0.7
        ), // Estimate: 70% active
      };
    } catch (error) {
      console.error(
        'Failed to get user stats:',
        error
      );
      return {
        totalUsers: 0,
        activeUsers: 0,
        usersByRole: {},
      };
    }
  }

  /**
   * Get events statistics
   */
  private async getEventsStats(
    startDate: Date
  ) {
    try {
      const eventsSnapshot =
        await this.db
          .collection(
            'analytics_events'
          )
          .where(
            'timestamp',
            '>=',
            Timestamp.fromDate(
              startDate
            )
          )
          .orderBy(
            'timestamp',
            'desc'
          )
          .get();

      const events =
        eventsSnapshot.docs.map(
          (doc: any) => doc.data()
        );

      return this.processEventsStats(
        events
      );
    } catch (error) {
      console.error(
        'Failed to get events stats:',
        error
      );
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
  private processEventsStats(
    events: any[]
  ) {
    let signUps = 0;
    let signIns = 0;
    let signOuts = 0;
    let domainSearches = 0;
    let domainRegistrations = 0;
    let domainTransfers = 0;
    let totalPaymentAmount = 0;
    let paymentCount = 0;

    const domainCounts: Record<
      string,
      number
    > = {};

    const pageCounts: Record<
      string,
      number
    > = {};

    const signInMethods: Record<
      string,
      number
    > = {};

    const paymentMethods: Record<
      string,
      number
    > = {};

    const recentSessions: any[] =
      [];

    for (const event of events) {
      const eventType =
        event.eventName ||
        event.event_type;

      const eventData = event.data || {};

      if (
        eventType === 'user_sign_up'
      ) {
        signUps++;
        const method =
          eventData.method || 'email';

        signInMethods[method] =
          (signInMethods[
            method
          ] || 0) + 1;
      } else if (
        eventType === 'user_sign_in'
      ) {
        signIns++;
        const method =
          eventData.method || 'email';

        signInMethods[method] =
          (signInMethods[
            method
          ] || 0) + 1;
      } else if (
        eventType === 'user_sign_out'
      ) {
        signOuts++;
      } else if (
        eventType ===
        'domain_search'
      ) {
        domainSearches++;
      } else if (
        eventType ===
        'domain_check'
      ) {
        if (eventData.domain) {
          domainCounts[
            eventData.domain
          ] =
            (domainCounts[
              eventData.domain
            ] || 0) + 1;
        }
      } else if (
        eventType ===
        'domain_registration_initiated'
      ) {
        domainRegistrations++;
        if (eventData.domain) {
          domainCounts[
            eventData.domain
          ] =
            (domainCounts[
              eventData.domain
            ] || 0) + 1;
        }
      } else if (
        eventType ===
        'domain_transfer_initiated'
      ) {
        domainTransfers++;
        if (eventData.domain) {
          domainCounts[
            eventData.domain
          ] =
            (domainCounts[
              eventData.domain
            ] || 0) + 1;
        }
      } else if (
        eventType ===
        'payment_completed'
      ) {
        paymentCount++;
        totalPaymentAmount +=
          eventData.amount || 0;

        const method =
          eventData.method || 'card';

        paymentMethods[method] =
          (paymentMethods[
            method
          ] || 0) + 1;
      } else if (
        eventType === 'page_view'
      ) {
        const page =
          eventData.page_name ||
          eventData.page;

        if (page) {
          pageCounts[page] =
            (pageCounts[page] || 0) +
            1;
        }
      }

      // Collect recent sessions
      if (
        recentSessions.length < 50
      ) {
        recentSessions.push({
          userId:
            event.userId ||
            'anonymous',
          event:
            eventType,
          timestamp:
            event.timestamp ||
            new Date().toISOString(),
          data:
            event.data,
        });
      }
    }

    // Sort and limit top domains and pages
    const topDomains =
      Object.entries(
        domainCounts
      )
        .sort(
          ([, a], [, b]) =>
            b - a
        )
        .slice(0, 10)
        .map(
          ([
            domain,
            count,
          ]) => ({
            domain,
            count,
          })
        );

    const topPages =
      Object.entries(
        pageCounts
      )
        .sort(
          ([, a], [, b]) =>
            b - a
        )
        .slice(0, 10)
        .map(
          ([page, count]) => ({
            page,
            count,
          })
        );

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
  async logEvent(
    eventName: string,
    userId: string | null,
    eventData: Record<string, any>
  ) {
    try {
      await this.db
        .collection(
          'analytics_events'
        )
        .add({
          eventName,
          userId: userId || 'anonymous',
          data: eventData,
          timestamp:
            Timestamp.now(),
        });
    } catch (error) {
      console.error(
        'Failed to log analytics event:',
        error
      );
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(
    userId: string,
    days: number = 30
  ) {
    try {
      const startDate = new Date();
      startDate.setDate(
        startDate.getDate() - days
      );

      const snapshot =
        await this.db
          .collection(
            'analytics_events'
          )
          .where(
            'userId',
            '==',
            userId
          )
          .where(
            'timestamp',
            '>=',
            Timestamp.fromDate(
              startDate
            )
          )
          .orderBy(
            'timestamp',
            'desc'
          )
          .get();

      return snapshot.docs.map(
        (doc: any) => ({
          id: doc.id,
          ...doc.data(),
          timestamp:
            doc.data()
              .timestamp
              ?.toDate()
              ?.toISOString() ||
            new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error(
        'Failed to get user activity:',
        error
      );
      return [];
    }
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics() {
    try {
      const analytics =
        await this.getAnalytics(90);

      return {
        totalVisitors: analytics.activeUsers,
        signUpConversion:
          analytics.totalUsers > 0
            ? (
                (analytics.signUps /
                  analytics.activeUsers) *
                100
              ).toFixed(2)
            : '0',
        paymentConversion:
          analytics.totalUsers > 0
            ? (
                (analytics.paymentCount /
                  analytics.totalUsers) *
                100
              ).toFixed(2)
            : '0',
        averageOrderValue:
          analytics.paymentCount > 0
            ? (
                analytics.totalPaymentAmount /
                analytics.paymentCount
              ).toFixed(2)
            : '0',
        domainRegistrationRate:
          analytics.totalUsers > 0
            ? (
                (analytics.domainRegistrations /
                  analytics.totalUsers) *
                100
              ).toFixed(2)
            : '0',
      };
    } catch (error) {
      console.error(
        'Failed to get conversion metrics:',
        error
      );
      return this.getEmptyConversionMetrics();
    }
  }

  private getEmptyConversionMetrics() {
    return {
      totalVisitors: 0,
      signUpConversion: '0',
      paymentConversion: '0',
      averageOrderValue: '0',
      domainRegistrationRate: '0',
    };
  }

  private getEmptyAnalytics(): AnalyticsStats {
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

export const analyticsDataService =
  new AnalyticsDataService();

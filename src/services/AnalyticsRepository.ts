const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000/api'
    : `${window.location.origin}/api`);

export interface AnalyticsData {
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

export interface ConversionMetrics {
  totalVisitors: number;
  signUpConversion: string;
  paymentConversion: string;
  averageOrderValue: string;
  domainRegistrationRate: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  event: string;
  timestamp: string;
  data?: Record<string, any>;
}

class AnalyticsRepository {
  /**
   * Get analytics dashboard data
   */
  async getAnalytics(
    daysBack: number = 30
  ): Promise<AnalyticsData | null> {
    try {
      const response = await fetch(
        `${API_BASE}/analytics?days=${daysBack}`
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch analytics'
        );
      }

      const result =
        await response.json();

      return result.data || null;
    } catch (error) {
      console.error(
        'Error fetching analytics:',
        error
      );

      return null;
    }
  }

  /**
   * Get conversion metrics
   */
  async getConversionMetrics(): Promise<ConversionMetrics | null> {
    try {
      const response = await fetch(
        `${API_BASE}/analytics/conversion`
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch conversion metrics'
        );
      }

      const result =
        await response.json();

      return result.data || null;
    } catch (error) {
      console.error(
        'Error fetching conversion metrics:',
        error
      );

      return null;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    days: number = 30
  ): Promise<UserActivity[]> {
    try {
      const response = await fetch(
        `${API_BASE}/analytics/user/${userId}?days=${days}`
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch user activity'
        );
      }

      const result =
        await response.json();

      return result.data || [];
    } catch (error) {
      console.error(
        'Error fetching user activity:',
        error
      );

      return [];
    }
  }

  /**
   * Log a custom analytics event
   */
  async logEvent(
    eventName: string,
    userId: string | null,
    data?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE}/analytics/event`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            eventName,
            userId,
            data,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error(
        'Error logging event:',
        error
      );

      return false;
    }
  }
}

export const analyticsRepository =
  new AnalyticsRepository();

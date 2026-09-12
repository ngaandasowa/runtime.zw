import { getAuth } from 'firebase/auth';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://api.runtime.co.zw');

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

export interface UserActivity {
  id: string;
  userId: string;
  event: string;
  timestamp: string;
  data?: Record<string, any>;
}

class AnalyticsRepository {
  private async adminHeaders() {
    const user = getAuth().currentUser;
    if (!user) {
      throw new Error('Authentication required.');
    }

    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async getAnalytics(daysBack = 30): Promise<AnalyticsData | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics?days=${daysBack}`,
        { headers: await this.adminHeaders() }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to fetch analytics');
      }

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  async getUserActivity(userId: string, days = 30): Promise<UserActivity[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/user/${encodeURIComponent(userId)}?days=${days}`,
        { headers: await this.adminHeaders() }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  async logEvent(
    eventName: string,
    userId: string | null,
    data?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/analytics/event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ eventName, userId, data }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error logging event:', error);
      return false;
    }
  }
}

export const analyticsRepository = new AnalyticsRepository();

import React, {
  useEffect,
  useState,
} from 'react';

import {
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  Globe,
  Eye,
  LogIn,
  LogOut,
  ShoppingCart,
} from 'lucide-react';

import {
  analyticsRepository,
  type AnalyticsData,
  type ConversionMetrics,
} from '../../services/AnalyticsRepository';

export const AdminAnalytics: React.FC =
  () => {
    const [
      analytics,
      setAnalytics,
    ] = useState<AnalyticsData | null>(
      null
    );

    const [
      metrics,
      setMetrics,
    ] = useState<ConversionMetrics | null>(
      null
    );

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      daysBack,
      setDaysBack,
    ] = useState(30);

    useEffect(() => {
      loadAnalytics();
    }, [daysBack]);

    const loadAnalytics = async () => {
      setLoading(true);

      try {
        const [
          analyticsData,
          metricsData,
        ] = await Promise.all([
          analyticsRepository.getAnalytics(
            daysBack
          ),
          analyticsRepository.getConversionMetrics(),
        ]);

        setAnalytics(
          analyticsData
        );

        setMetrics(
          metricsData
        );
      } catch (error) {
        console.error(
          'Failed to load analytics:',
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">
            Loading analytics...
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setDaysBack(7)
              }
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                daysBack === 7
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              7 Days
            </button>

            <button
              onClick={() =>
                setDaysBack(30)
              }
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                daysBack === 30
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              30 Days
            </button>

            <button
              onClick={() =>
                setDaysBack(90)
              }
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                daysBack === 90
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Users
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.totalUsers ||
                    0}
                </p>
              </div>

              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Active Users
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.activeUsers ||
                    0}
                </p>
              </div>

              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  $
                  {(
                    analytics?.totalPaymentAmount ||
                    0
                  ).toFixed(2)}
                </p>
              </div>

              <div className="bg-purple-100 p-3 rounded-full">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Payment Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Payments
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.paymentCount ||
                    0}
                </p>
              </div>

              <div className="bg-yellow-100 p-3 rounded-full">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* User Activity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sign Ups */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Sign Ups
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.signUps || 0}
                </p>
              </div>

              <div className="bg-indigo-100 p-3 rounded-full">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Sign Ins */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Sign Ins
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.signIns || 0}
                </p>
              </div>

              <div className="bg-green-100 p-3 rounded-full">
                <LogIn className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Sign Outs */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Sign Outs
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.signOuts || 0}
                </p>
              </div>

              <div className="bg-red-100 p-3 rounded-full">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Domain Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Domain Searches */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Domain Searches
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.domainSearches ||
                    0}
                </p>
              </div>

              <div className="bg-cyan-100 p-3 rounded-full">
                <Eye className="w-6 h-6 text-cyan-600" />
              </div>
            </div>
          </div>

          {/* Registrations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Registrations
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {
                    analytics?.domainRegistrations ||
                    0
                  }
                </p>
              </div>

              <div className="bg-emerald-100 p-3 rounded-full">
                <Globe className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Transfers */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Transfers
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {analytics?.domainTransfers ||
                    0}
                </p>
              </div>

              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Conversion Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Visitors
                </p>

                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metrics.totalVisitors}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Sign Up Rate
                </p>

                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {metrics.signUpConversion}%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Payment Rate
                </p>

                <p className="text-2xl font-bold text-green-600 mt-2">
                  {
                    metrics.paymentConversion
                  }%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Avg Order Value
                </p>

                <p className="text-2xl font-bold text-purple-600 mt-2">
                  $
                  {
                    metrics.averageOrderValue
                  }
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Domain Reg Rate
                </p>

                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {
                    metrics.domainRegistrationRate
                  }%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Methods */}
        {analytics?.signInMethods &&
          Object.keys(
            analytics.signInMethods
          ).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Sign In Methods
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  analytics.signInMethods
                ).map(
                  ([method, count]) => (
                    <div
                      key={method}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="text-sm text-gray-600 capitalize">
                        {method}
                      </p>

                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {count}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Top Domains */}
        {analytics?.topDomains &&
          analytics.topDomains.length >
            0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Most Searched Domains
              </h2>

              <div className="space-y-2">
                {analytics.topDomains.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-900">
                        {item.domain}
                      </span>

                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {item.count} searches
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Page Views Overview */}
        {analytics?.topPages && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Page Views */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Page Views
                  </p>

                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {analytics.topPages.reduce(
                      (sum, page) =>
                        sum + page.count,
                      0
                    )}
                  </p>
                </div>

                <div className="bg-indigo-100 p-3 rounded-full">
                  <Eye className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Unique Pages */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Unique Pages
                  </p>

                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {
                      analytics.topPages
                        .length
                    }
                  </p>
                </div>

                <div className="bg-purple-100 p-3 rounded-full">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Avg Views Per Page */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Avg Views per Page
                  </p>

                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {analytics.topPages
                      .length > 0
                      ? Math.round(
                          analytics.topPages.reduce(
                            (sum, page) =>
                              sum +
                              page.count,
                            0
                          ) /
                            analytics
                              .topPages
                              .length
                        )
                      : 0}
                  </p>
                </div>

                <div className="bg-rose-100 p-3 rounded-full">
                  <TrendingUp className="w-6 h-6 text-rose-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Pages */}
        {analytics?.topPages &&
          analytics.topPages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Most Visited Pages
              </h2>

              <div className="space-y-2">
                {analytics.topPages.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium text-gray-900">
                        {item.page}
                      </span>

                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        {item.count} views
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Recent Sessions */}
        {analytics?.recentSessions &&
          analytics.recentSessions.length >
            0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Recent Activity
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-gray-900">
                        User ID
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-gray-900">
                        Event
                      </th>

                      <th className="px-6 py-3 text-left font-medium text-gray-900">
                        Timestamp
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {analytics.recentSessions
                      .slice(0, 20)
                      .map(
                        (session, index) => (
                          <tr
                            key={index}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="px-6 py-3 text-gray-600 font-mono text-xs">
                              {session.userId.slice(
                                0,
                                12
                              )}
                              ...
                            </td>

                            <td className="px-6 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {
                                  session.event
                                }
                              </span>
                            </td>

                            <td className="px-6 py-3 text-gray-600 text-xs">
                              {new Date(
                                session.timestamp
                              ).toLocaleString()}
                            </td>
                          </tr>
                        )
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        {/* Users by Role */}
        {analytics?.usersByRole &&
          Object.keys(
            analytics.usersByRole
          ).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Users by Role
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(
                  analytics.usersByRole
                ).map(
                  ([role, count]) => (
                    <div
                      key={role}
                      className="p-4 bg-gray-50 rounded-lg"
                    >
                      <p className="text-sm text-gray-600 capitalize">
                        {role}
                      </p>

                      <p className="text-2xl font-bold text-gray-900 mt-2">
                        {count}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
      </div>
    );
  };

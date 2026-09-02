import React, {
  useEffect,
  useState,
} from 'react';

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

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-[#3120ff]">ANALYTICS</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Dashboard
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setDaysBack(7)
              }
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                daysBack === 7
                  ? 'bg-[#3120ff] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              7 Days
            </button>

            <button
              onClick={() =>
                setDaysBack(30)
              }
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                daysBack === 30
                  ? 'bg-[#3120ff] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              30 Days
            </button>

            <button
              onClick={() =>
                setDaysBack(90)
              }
              disabled={loading}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                daysBack === 90
                  ? 'bg-[#3120ff] text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              90 Days
            </button>
          </div>
        </div>

        <div className={`space-y-6 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Total Users */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Total Users
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.totalUsers || 0}
            </p>
          </div>

          {/* Active Users */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Active Users
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.activeUsers || 0}
            </p>
          </div>

          {/* Total Revenue */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Total Revenue
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              $
              {(
                analytics?.totalPaymentAmount ||
                0
              ).toFixed(2)}
            </p>
          </div>

          {/* Payment Count */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Payments
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.paymentCount ||
                0}
            </p>
          </div>
        </div>

        {/* User Activity Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* Sign Ups */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Sign Ups
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.signUps || 0}
            </p>
          </div>

          {/* Sign Ins */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Sign Ins
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.signIns || 0}
            </p>
          </div>

          {/* Sign Outs */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Sign Outs
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.signOuts || 0}
            </p>
          </div>
        </div>

        {/* Domain Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* Domain Searches */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Domain Searches
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.domainSearches ||
                0}
            </p>
          </div>

          {/* Registrations */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Registrations
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {
                analytics?.domainRegistrations ||
                0
              }
            </p>
          </div>

          {/* Transfers */}
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs font-medium text-zinc-500">
              Transfers
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {analytics?.domainTransfers ||
                0}
            </p>
          </div>
        </div>

        {/* Page Views Overview */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* Total Page Views */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500">
                Total Page Views
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {analytics?.topPages?.reduce(
                  (sum, page) =>
                    sum + page.count,
                  0
                ) || 0}
              </p>
            </div>

            {/* Unique Pages */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500">
                Unique Pages
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {analytics?.topPages?.length || 0}
              </p>
            </div>

            {/* Avg Views Per Page */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs font-medium text-zinc-500">
                Avg per Page
              </p>
              <p className="mt-2 text-2xl font-bold text-zinc-950">
                {(analytics?.topPages?.length || 0) > 0
                  ? Math.round(
                      (analytics?.topPages?.reduce(
                        (sum, page) =>
                          sum +
                          page.count,
                        0
                      ) || 0) /
                        (analytics?.topPages?.length || 1)
                    )
                  : 0}
              </p>
            </div>
          </div>

        {/* Conversion Metrics */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
            <h2 className="text-sm font-bold text-zinc-950">
              Conversion Metrics
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Visitors
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {metrics?.totalVisitors || 0}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Sign Up
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {metrics?.signUpConversion || '0'}%
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Payment
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {
                    metrics?.paymentConversion || '0'
                  }%
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Avg Order
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  $
                  {
                    metrics?.averageOrderValue || '0'
                  }
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-zinc-500">
                  Domain Reg
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {
                    metrics?.domainRegistrationRate || '0'
                  }%
                </p>
              </div>
            </div>
          </div>

        {/* Sign In Methods */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-950">
            Sign In Methods
          </h2>
          {analytics?.signInMethods &&
          Object.keys(analytics.signInMethods).length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(analytics.signInMethods).map(([method, count]) => (
                <div key={method} className="flex flex-col">
                  <p className="text-xs font-medium capitalize text-zinc-500">{method}</p>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No sign-in activity recorded for this period yet.</p>
          )}
        </div>

        {/* Top Domains */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-950">Most Searched Domains</h2>
          {analytics?.topDomains && analytics.topDomains.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {analytics.topDomains.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-zinc-900">{item.domain}</span>
                  <span className="text-xs font-medium text-zinc-500">{item.count} searches</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No domain search activity recorded for this period yet.</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-950">Most Visited Pages</h2>
          {analytics?.topPages && analytics.topPages.length > 0 ? (
            <div className="mt-4 divide-y divide-zinc-100">
              {analytics.topPages.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-zinc-900">{item.page}</span>
                  <span className="text-xs font-medium text-zinc-500">{item.count} views</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No page views recorded for this period yet. New views will appear here automatically.</p>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-950">Recent Activity</h2>
          {analytics?.recentSessions && analytics.recentSessions.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100">
                  <tr>
                    <th className="py-2 text-left text-xs font-medium text-zinc-500">User</th>
                    <th className="py-2 text-left text-xs font-medium text-zinc-500">Event</th>
                    <th className="py-2 text-left text-xs font-medium text-zinc-500">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {analytics.recentSessions.slice(0, 20).map((session, index) => (
                    <tr key={index} className="hover:bg-zinc-50">
                      <td className="py-2 font-mono text-xs text-zinc-600">
                        {session.userId === 'anonymous' ? 'anonymous' : session.userId.slice(0, 8)}
                      </td>
                      <td className="py-2 text-xs font-medium text-zinc-700">{session.event}</td>
                      <td className="py-2 text-xs text-zinc-500">{session.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No analytics activity recorded for this period yet.</p>
          )}
        </div>

        {/* Users by Role */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-bold text-zinc-950">Users by Role</h2>
          {analytics?.usersByRole && Object.keys(analytics.usersByRole).length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(analytics.usersByRole).map(([role, count]) => (
                <div key={role} className="flex flex-col">
                  <p className="text-xs font-medium capitalize text-zinc-500">{role.replace('_', ' ')}</p>
                  <p className="mt-1 text-xl font-bold text-zinc-950">{count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No user-role data available.</p>
          )}
        </div>
        </div>
      </div>
    );
  };

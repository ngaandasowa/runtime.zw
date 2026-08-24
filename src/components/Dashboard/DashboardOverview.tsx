import React from 'react';

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe2,
  Plus,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

export const DashboardOverview:
  React.FC = () => {
    const {
      currentUser,
      domains,
      orders,
      payments,
      setDashboardSubView,
      setRegistrationModalOpen,
    } = useStore();

    const userDomains =
      domains.filter(
        (domain) =>
          domain.user_id ===
            currentUser?.id ||
          domain.user_email ===
            currentUser?.email
      );

    const userOrders =
      orders.filter(
        (order) =>
          order.user_id ===
            currentUser?.id ||
          order.user_email ===
            currentUser?.email
      );

    const userPayments =
      payments.filter(
        (payment) =>
          payment.user_id ===
          currentUser?.id
      );

    const activeCount =
      userDomains.filter(
        (domain) =>
          domain.status ===
          'active'
      ).length;

    const awaitingPayment =
      userDomains.filter(
        (domain) =>
          domain.status ===
          'pending_payment'
      ).length;

    const processingCount =
      userDomains.filter(
        (domain) =>
          domain.status ===
            'pending_registration' ||
          domain.status ===
            'pending_transfer' ||
          domain.status ===
            'pending_delete'
      ).length;

    const verifiedPayments =
      userPayments.filter(
        (payment) =>
          payment.status ===
          'verified'
      ).length;

    const recentDomains =
      [...userDomains]
        .sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        )
        .slice(0, 5);

    return (
      <div className="space-y-8">

        {/* WELCOME */}
        <section>
          <p className="text-xs font-semibold text-[#3120ff]">
            Runtime
          </p>

          <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
                Welcome,{' '}
                {currentUser?.name}
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Manage your domains and orders.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setRegistrationModalOpen(
                  true
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Register a domain
            </button>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="border-y border-zinc-200 bg-white sm:rounded-xl sm:border">
          <div className="grid grid-cols-2 divide-x divide-y divide-zinc-100 sm:grid-cols-4 sm:divide-y-0">
            <Metric
              label="Active"
              value={
                activeCount
              }
            />

            <Metric
              label="Awaiting payment"
              value={
                awaitingPayment
              }
            />

            <Metric
              label="Processing"
              value={
                processingCount
              }
            />

            <Metric
              label="Orders"
              value={
                userOrders.length
              }
            />
          </div>
        </section>

        {/* PAYMENT NOTICE */}
        {awaitingPayment >
          0 && (
          <button
            type="button"
            onClick={() =>
              setDashboardSubView(
                'billing'
              )
            }
            className="flex w-full items-center justify-between gap-4 border-y border-[#3120ff]/15 bg-[#3120ff]/5 px-4 py-4 text-left sm:rounded-xl sm:border"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-950">
                Payment required
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {awaitingPayment}{' '}
                domain
                {awaitingPayment ===
                1
                  ? ''
                  : 's'}{' '}
                waiting for payment.
              </p>
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-[#3120ff]" />
          </button>
        )}

        {/* DOMAINS */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                Your domains
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Latest domain records.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setDashboardSubView(
                  'domains'
                )
              }
              className="text-xs font-semibold text-[#3120ff]"
            >
              View all
            </button>
          </div>

          <div className="border-y border-zinc-200 bg-white sm:rounded-xl sm:border">
            {recentDomains.length ===
            0 ? (
              <div className="px-4 py-10 text-center">
                <Globe2 className="mx-auto h-6 w-6 text-zinc-300" />

                <p className="mt-3 text-sm font-semibold text-zinc-900">
                  No domains yet
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Register your first domain to get started.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {recentDomains.map(
                  (domain) => (
                    <button
                      key={
                        domain.id
                      }
                      type="button"
                      onClick={() =>
                        setDashboardSubView(
                          'domains'
                        )
                      }
                      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-bold text-zinc-950">
                          {
                            domain.domain_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {domain.expires_at
                            ? `Renews ${new Date(
                                domain.expires_at
                              ).toLocaleDateString()}`
                            : statusLabel(
                                domain.status
                              )}
                        </p>
                      </div>

                      <DomainStatus
                        status={
                          domain.status
                        }
                      />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* SIMPLE BILLING FOOTNOTE */}
        <p className="text-xs text-zinc-400">
          {verifiedPayments}{' '}
          verified payment
          {verifiedPayments ===
          1
            ? ''
            : 's'}{' '}
          on your account.
        </p>
      </div>
    );
  };

const Metric: React.FC<{
  label: string;
  value: number;
}> = ({
  label,
  value,
}) => (
  <div className="px-4 py-4 sm:px-5">
    <p className="text-[11px] font-medium text-zinc-500">
      {label}
    </p>

    <p className="mt-1 text-xl font-bold text-zinc-950">
      {value}
    </p>
  </div>
);

const statusLabel = (
  status: string
) => {
  switch (status) {
    case 'pending_payment':
      return 'Awaiting payment';

    case 'pending_registration':
      return 'Registration processing';

    case 'active':
      return 'Active';

    case 'pending_transfer':
      return 'Transfer processing';

    case 'pending_delete':
      return 'Cancellation processing';

    case 'expired':
      return 'Expired';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status.replace(
        /_/g,
        ' '
      );
  }
};

const DomainStatus: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  if (
    status === 'active'
  ) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Active
      </span>
    );
  }

  if (
    status ===
    'pending_payment'
  ) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-zinc-500">
        <Clock3 className="h-3.5 w-3.5" />
        Payment
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-[#3120ff]">
      <Clock3 className="h-3.5 w-3.5" />
      Processing
    </span>
  );
};
import React, {
  useEffect,
  useState,
} from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe2,
  Plus,
  WalletCards,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

const isRenewalOrder = (
  order: any
) =>
  String(
    order?.purpose ||
    order?.metadata?.purpose ||
    ''
  ) === 'domain_renewal';

const daysUntil = (
  value?: string
) => {
  if (!value) {
    return null;
  }

  const target =
    new Date(value);

  if (
    Number.isNaN(
      target.getTime()
    )
  ) {
    return null;
  }

  const today =
    new Date();

  const start =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

  const end =
    new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate()
    );

  return Math.round(
    (
      end.getTime() -
      start.getTime()
    ) /
      (24 * 60 * 60 * 1000)
  );
};

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

    const [walletBalance, setWalletBalance] =
      useState(0);

    const [walletLoading, setWalletLoading] =
      useState(true);

    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:4000'
        : 'https://runtime-api-my3q.onrender.com');

    useEffect(() => {
      let cancelled = false;

      const loadWallet = async () => {
        if (!currentUser) {
          setWalletBalance(0);
          setWalletLoading(false);
          return;
        }

        try {
          setWalletLoading(true);

          const authModule =
            await import(
              'firebase/auth'
            );

          const authUser =
            authModule
              .getAuth()
              .currentUser;

          if (!authUser) {
            return;
          }

          const token =
            await authUser
              .getIdToken();

          const response =
            await fetch(
              `${API_BASE_URL}/api/wallet/me`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const body =
            await response.json();

          if (
            !response.ok ||
            !body?.success
          ) {
            throw new Error(
              body?.message ||
              'Unable to load Runtime Credit.'
            );
          }

          if (!cancelled) {
            setWalletBalance(
              Number(
                body.wallet?.balance ||
                0
              )
            );
          }
        } catch (error) {
          console.error(
            'Unable to load Runtime Credit:',
            error
          );
        } finally {
          if (!cancelled) {
            setWalletLoading(false);
          }
        }
      };

      void loadWallet();

      return () => {
        cancelled = true;
      };
    }, [
      currentUser?.id,
      API_BASE_URL,
    ]);

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

    const pendingRenewalOrders =
      userOrders.filter(
        (order) =>
          isRenewalOrder(
            order
          ) &&
          order.status ===
            'pending'
      );

    const expiringSoon =
      userDomains.filter(
        (domain) => {
          const days =
            daysUntil(
              domain.expires_at
            );

          return (
            domain.status ===
              'active' &&
            days !== null &&
            days >= 0 &&
            days <= 60
          );
        }
      );

    const userPayments =
      payments.filter(
        (payment) =>
          payment.user_id ===
          currentUser?.id
      );

    /*
     * A cancelled order must never keep a pending domain
     * looking like it still needs payment.
     *
     * If an admin permanently deletes the order, the
     * orphaned pending-payment domain is also hidden from
     * the overview until backend cleanup removes it.
     */
    const visibleDomains =
      userDomains.filter(
        (domain) => {
          if (
            domain.status !==
            'pending_payment'
          ) {
            return true;
          }

          const orderId =
            (domain as any)
              .order_id as
              | string
              | undefined;

          if (!orderId) {
            return true;
          }

          const linkedOrder =
            userOrders.find(
              (order) =>
                order.id ===
                orderId
            );

          return Boolean(
            linkedOrder &&
            linkedOrder.status !==
              'cancelled'
          );
        }
      );

    const activeCount =
      visibleDomains.filter(
        (domain) =>
          domain.status ===
          'active'
      ).length;

    const linkedOrderForDomain = (
      domain: any
    ) => {
      const orderId =
        domain?.order_id as
          | string
          | undefined;

      if (!orderId) {
        return null;
      }

      return (
        userOrders.find(
          (order) =>
            order.id === orderId
        ) || null
      );
    };

    const isDomainAwaitingPayment = (
      domain: any
    ) => {
      if (
        domain.status !==
        'pending_payment'
      ) {
        return false;
      }

      const linkedOrder =
        linkedOrderForDomain(
          domain
        );

      if (!linkedOrder) {
        return true;
      }

      return ![
        'paid',
        'completed',
      ].includes(
        String(
          linkedOrder.status
        )
      );
    };

    const overviewDomainStatus = (
      domain: any
    ) => {
      if (
        domain.status ===
          'pending_payment'
      ) {
        const linkedOrder =
          linkedOrderForDomain(
            domain
          );

        if (
          linkedOrder &&
          [
            'paid',
            'completed',
          ].includes(
            String(
              linkedOrder.status
            )
          )
        ) {
          return 'pending_registration';
        }
      }

      return domain.status;
    };

    const awaitingPayment =
      visibleDomains.filter(
        isDomainAwaitingPayment
      ).length;

    const processingCount =
      visibleDomains.filter(
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
            'verified' &&
          payment.gateway !==
            'runtime_credit'
      ).length;

    const recentDomains =
      [...visibleDomains]
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

        {/* RUNTIME CREDIT */}
        <section className="flex items-center justify-between gap-4 border-y border-zinc-200 bg-white px-4 py-4 sm:rounded-xl sm:border sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3120ff]/8 text-[#3120ff]">
              <WalletCards className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-medium text-zinc-500">
                Runtime Credit
              </p>

              <p className="mt-0.5 text-xl font-bold text-zinc-950">
                {walletLoading
                  ? '...'
                  : `$${walletBalance.toFixed(2)}`}
              </p>

              <p className="mt-0.5 text-[11px] text-zinc-400">
                Available balance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setDashboardSubView(
                'billing'
              )
            }
            className="shrink-0 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2819d9]"
          >
            Add credit
          </button>
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

        {/* RENEWAL NOTICE */}
        {(pendingRenewalOrders.length >
          0 ||
          expiringSoon.length >
            0) && (
          <button
            type="button"
            onClick={() =>
              setDashboardSubView(
                pendingRenewalOrders.length >
                  0
                  ? 'billing'
                  : 'domains'
              )
            }
            className="flex w-full items-center justify-between gap-4 border-y border-amber-200 bg-amber-50 px-4 py-4 text-left sm:rounded-xl sm:border"
          >
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Domain renewals
              </p>

              <p className="mt-1 text-xs text-amber-800">
                {pendingRenewalOrders.length >
                0
                  ? `${pendingRenewalOrders.length} renewal invoice${
                      pendingRenewalOrders.length ===
                      1
                        ? ''
                        : 's'
                    } awaiting payment.`
                  : `${expiringSoon.length} domain${
                      expiringSoon.length ===
                      1
                        ? ''
                        : 's'
                    } renewing within 60 days.`}
              </p>
            </div>

            <ArrowRight className="h-4 w-4 shrink-0 text-amber-700" />
          </button>
        )}

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
                                overviewDomainStatus(
                                  domain
                                )
                              )}
                        </p>
                      </div>

                      <DomainStatus
                        status={
                          overviewDomainStatus(
                            domain
                          )
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
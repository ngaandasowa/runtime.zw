import React, {
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Receipt,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  Order,
} from '../../types';

export const DashboardBilling:
  React.FC = () => {
    const {
      currentUser,
      orders,
      payments,
      domains,
      renewDomain,
      showNotification,
    } = useStore();

    const [
      selectedReceipt,
      setSelectedReceipt,
    ] = useState<Order | null>(
      null
    );

    const [
      renewingDomainId,
      setRenewingDomainId,
    ] = useState<
      string | null
    >(null);

    const userOrders =
      useMemo(
        () =>
          orders
            .filter(
              (order) =>
                order.user_id ===
                  currentUser?.id ||
                order.user_email ===
                  currentUser?.email
            )
            .sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            ),
        [
          orders,
          currentUser,
        ]
      );

    const userDomains =
      useMemo(
        () =>
          domains.filter(
            (domain) =>
              domain.user_id ===
                currentUser?.id ||
              domain.user_email ===
                currentUser?.email
          ),
        [
          domains,
          currentUser,
        ]
      );

    const paymentForOrder = (
      orderId: string
    ) =>
      payments.find(
        (payment) =>
          payment.order_id ===
          orderId
      );

    const now =
      new Date();

    const domainRenewals =
      userDomains
        .filter(
          (domain) =>
            domain.status ===
              'active' ||
            domain.status ===
              'expired'
        )
        .map((domain) => {
          const expiry =
            domain.expires_at
              ? new Date(
                  domain.expires_at
                )
              : null;

          const daysLeft =
            expiry
              ? Math.ceil(
                  (expiry.getTime() -
                    now.getTime()) /
                    86400000
                )
              : null;

          return {
            ...domain,
            daysLeft,
          };
        })
        .sort(
          (a, b) => {
            if (
              a.daysLeft ===
              null
            ) {
              return 1;
            }

            if (
              b.daysLeft ===
              null
            ) {
              return -1;
            }

            return (
              a.daysLeft -
              b.daysLeft
            );
          }
        );

    const startRenewal =
      async (
        domainId: string
      ) => {
        setRenewingDomainId(
          domainId
        );

        try {
          await renewDomain(
            domainId,
            1,
            'ecocash_usd'
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to create renewal order.',
            'error'
          );
        } finally {
          setRenewingDomainId(
            null
          );
        }
      };

    return (
      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
            Orders & Payments
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            View your orders, payment status and domain renewal dates.
          </p>
        </div>

        {/* RENEWALS */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                Domain renewals
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Active domains and upcoming renewal dates.
              </p>
            </div>

            <CalendarDays className="h-4 w-4 text-[#3120ff]" />
          </div>

          <div className="border-y border-zinc-200 bg-white sm:rounded-xl sm:border">
            {domainRenewals.length ===
            0 ? (
              <p className="px-4 py-8 text-sm text-zinc-500">
                No active domain renewals yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {domainRenewals.map(
                  (domain) => {
                    const urgency =
                      domain.daysLeft !==
                        null &&
                      domain.daysLeft <=
                        30;

                    const expired =
                      domain.daysLeft !==
                        null &&
                      domain.daysLeft <
                        0;

                    return (
                      <div
                        key={
                          domain.id
                        }
                        className="px-4 py-4 sm:px-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-bold text-zinc-950">
                              {
                                domain.domain_name
                              }
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-500">
                              <span>
                                Renewal{' '}
                                <strong className="font-semibold text-zinc-800">
                                  $
                                  {domain.renewal_price.toFixed(
                                    2
                                  )}
                                  /yr
                                </strong>
                              </span>

                              <span>
                                Due{' '}
                                <strong className="font-semibold text-zinc-800">
                                  {domain.expires_at
                                    ? new Date(
                                        domain.expires_at
                                      ).toLocaleDateString()
                                    : 'Not set'}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <StatusText
                              label={
                                expired
                                  ? 'Expired'
                                  : urgency
                                    ? `${Math.max(
                                        domain.daysLeft ||
                                          0,
                                        0
                                      )} days left`
                                    : 'Active'
                              }
                              tone={
                                expired
                                  ? 'danger'
                                  : urgency
                                    ? 'info'
                                    : 'success'
                              }
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            disabled={
                              renewingDomainId ===
                              domain.id
                            }
                            onClick={() =>
                              startRenewal(
                                domain.id
                              )
                            }
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50"
                          >
                            {renewingDomainId ===
                            domain.id
                              ? 'Creating order...'
                              : 'Renew 1 year'}
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* ORDERS */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                Order history
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                Registration and renewal orders.
              </p>
            </div>

            <Receipt className="h-4 w-4 text-[#3120ff]" />
          </div>

          <div className="border-y border-zinc-200 bg-white sm:rounded-xl sm:border">
            {userOrders.length ===
            0 ? (
              <p className="px-4 py-8 text-sm text-zinc-500">
                No orders yet.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {userOrders.map(
                  (order) => {
                    const payment =
                      paymentForOrder(
                        order.id
                      );

                    return (
                      <div
                        key={
                          order.id
                        }
                        className="px-4 py-4 sm:px-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-mono text-xs font-bold text-[#3120ff]">
                              {
                                order.reference
                              }
                            </p>

                            <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-zinc-900">
                              {order.items
                                .map(
                                  (
                                    item
                                  ) =>
                                    item.description
                                )
                                .join(
                                  ', '
                                )}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {new Date(
                                order.created_at
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-zinc-950">
                              $
                              {order.total.toFixed(
                                2
                              )}
                            </p>

                            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                              {
                                order.currency
                              }
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <PaymentStatus
                            status={
                              payment?.status ||
                              order.status
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReceipt(
                                order
                              )
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700"
                          >
                            <FileText className="h-3.5 w-3.5 text-[#3120ff]" />
                            View
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </section>

        {/* RECEIPT / ORDER DETAILS */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/35 sm:items-center sm:justify-center sm:p-4">
            <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl sm:border sm:border-zinc-200 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3120ff]">
                    Order details
                  </p>

                  <p className="mt-1 font-mono text-base font-bold text-zinc-950">
                    {
                      selectedReceipt.reference
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReceipt(
                      null
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="divide-y divide-zinc-100">
                <Detail
                  label="Customer"
                  value={
                    currentUser?.name ||
                    selectedReceipt.user_email
                  }
                />

                <Detail
                  label="Date"
                  value={new Date(
                    selectedReceipt.created_at
                  ).toLocaleString()}
                />

                <Detail
                  label="Status"
                  value={
                    paymentForOrder(
                      selectedReceipt.id
                    )?.status ||
                    selectedReceipt.status
                  }
                />

                <Detail
                  label="EcoCash transaction ID"
                  value={
                    paymentForOrder(
                      selectedReceipt.id
                    )?.transaction_id ||
                    'Not entered'
                  }
                />
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-4">
                <p className="mb-3 text-xs font-semibold text-zinc-500">
                  Items
                </p>

                <div className="space-y-3">
                  {selectedReceipt.items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span className="text-zinc-700">
                          {
                            item.description
                          }
                        </span>

                        <span className="shrink-0 font-semibold text-zinc-950">
                          $
                          {item.total.toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4">
                <span className="text-sm font-semibold text-zinc-700">
                  Total
                </span>

                <span className="text-lg font-bold text-zinc-950">
                  $
                  {selectedReceipt.total.toFixed(
                    2
                  )}{' '}
                  {
                    selectedReceipt.currency
                  }
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

const PaymentStatus: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  if (
    status === 'verified' ||
    status === 'paid'
  ) {
    return (
      <StatusText
        label="Paid"
        tone="success"
      />
    );
  }

  if (
    status === 'rejected' ||
    status === 'failed'
  ) {
    return (
      <StatusText
        label="Payment issue"
        tone="danger"
      />
    );
  }

  if (
    status ===
    'pending_verification'
  ) {
    return (
      <StatusText
        label="Awaiting verification"
        tone="info"
      />
    );
  }

  return (
    <StatusText
      label="Awaiting payment"
      tone="neutral"
    />
  );
};

const StatusText: React.FC<{
  label: string;
  tone:
    | 'success'
    | 'info'
    | 'danger'
    | 'neutral';
}> = ({
  label,
  tone,
}) => {
  const classes =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'info'
        ? 'text-[#3120ff]'
        : tone === 'danger'
          ? 'text-rose-600'
          : 'text-zinc-500';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${classes}`}
    >
      {tone ===
      'success' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Clock3 className="h-3.5 w-3.5" />
      )}

      {label}
    </span>
  );
};

const Detail: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4 py-3 text-sm">
    <span className="text-zinc-500">
      {label}
    </span>

    <span className="max-w-[65%] text-right font-medium text-zinc-900">
      {value}
    </span>
  </div>
);
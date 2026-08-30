import React from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Globe2,
  Users,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

export const AdminDashboard:
  React.FC = () => {
    const {
      users,
      domains,
      orders,
      payments,
      registryRequests,
      setAdminSubView,
    } = useStore();

    const customers =
      users.filter(
        (user) =>
          user.role ===
          'customer'
      ).length;

    const activeDomains =
      domains.filter(
        (domain) =>
          domain.status ===
          'active'
      ).length;

    const awaitingPayment =
      domains.filter(
        (domain) => {
          if (
            domain.status !==
            'pending_payment'
          ) {
            return false;
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
            orders.find(
              (order) =>
                order.id ===
                orderId
            );

          /*
           * Cancelled orders and pending-domain records
           * whose order was permanently deleted are not
           * awaiting payment anymore.
           */
          return Boolean(
            linkedOrder &&
            linkedOrder.status !==
              'cancelled'
          );
        }
      ).length;

    const processingDomains =
      domains.filter(
        (domain) =>
          domain.status ===
            'pending_registration' ||
          domain.status ===
            'pending_transfer' ||
          domain.status ===
            'pending_delete'
      ).length;

    const pendingPayments =
      payments.filter(
        (payment) => {
          const isPending =
            payment.status ===
              'pending' ||
            payment.status ===
              'pending_verification';

          if (!isPending) {
            return false;
          }

          const orderId =
            payment.order_id;

          if (!orderId) {
            return true;
          }

          const linkedOrder =
            orders.find(
              (order) =>
                order.id ===
                orderId
            );

          /*
           * Do not count a pending payment against a
           * cancelled or permanently deleted order.
           */
          return Boolean(
            linkedOrder &&
            linkedOrder.status !==
              'cancelled'
          );
        }
      ).length;

    const verifiedPayments =
      payments.filter(
        (payment) =>
          payment.status ===
            'verified' &&
          payment.gateway !==
            'runtime_credit'
      );

    const now =
      new Date();

    const revenueThisMonth =
      verifiedPayments
        .filter(
          (payment) => {
            const date =
              new Date(
                payment.verified_at ||
                  payment.created_at
              );

            return (
              date.getFullYear() ===
                now.getFullYear() &&
              date.getMonth() ===
                now.getMonth()
            );
          }
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            Number(
              payment.amount || 0
            ),
          0
        );

    const registryReady =
      registryRequests.filter(
        (request) =>
          request.status ===
            'ready' ||
          request.status ===
            'draft'
      ).length;

    const recentOrders =
      [...orders]
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 sm:text-3xl">
            Overview
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Live customer, domain and payment data.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            icon={Users}
            label="Customers"
            value={customers}
          />

          <Metric
            icon={Globe2}
            label="Active Domains"
            value={activeDomains}
          />

          <Metric
            icon={Clock3}
            label="Awaiting Payment"
            value={awaitingPayment}
            onClick={() =>
              setAdminSubView(
                'orders'
              )
            }
          />

          <Metric
            icon={CreditCard}
            label="Pending Payments"
            value={pendingPayments}
            onClick={() =>
              setAdminSubView(
                'orders'
              )
            }
          />

          <Metric
            icon={FileText}
            label="Processing"
            value={processingDomains}
            onClick={() =>
              setAdminSubView(
                'domains'
              )
            }
          />

          <Metric
            icon={
              CheckCircle2
            }
            label="Registry Ready"
            value={registryReady}
            onClick={() =>
              setAdminSubView(
                'registry'
              )
            }
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Verified revenue this month
              </p>

              <p className="mt-1 text-3xl font-bold text-zinc-950">
                $
                {revenueThisMonth.toFixed(
                  2
                )}
              </p>
            </div>

            {pendingPayments >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setAdminSubView(
                    'orders'
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9]"
              >
                <AlertTriangle className="h-4 w-4" />
                Review Payments
              </button>
            )}
          </div>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-950">
              Recent Orders
            </h2>

            <button
              type="button"
              onClick={() =>
                setAdminSubView(
                  'orders'
                )
              }
              className="text-xs font-semibold text-[#3120ff]"
            >
              View All
            </button>
          </div>

          <div className="mt-4 divide-y divide-zinc-100">
            {recentOrders.length ===
            0 ? (
              <p className="py-6 text-sm text-zinc-500">
                No orders yet.
              </p>
            ) : (
              recentOrders.map(
                (order) => {
                  const orderPayments =
                    payments.filter(
                      (item) =>
                        item.order_id ===
                          order.id
                    );

                  const verifiedTotal =
                    orderPayments
                      .filter(
                        (item) =>
                          item.status ===
                            'verified'
                      )
                      .reduce(
                        (
                          total,
                          item
                        ) =>
                          total +
                          Number(
                            item.amount || 0
                          ),
                        0
                      );

                  const latestExternalPayment =
                    orderPayments
                      .filter(
                        (item) =>
                          item.gateway !==
                            'runtime_credit'
                      )
                      .sort(
                        (a, b) =>
                          new Date(
                            b.updated_at ||
                              b.created_at ||
                              0
                          ).getTime() -
                          new Date(
                            a.updated_at ||
                              a.created_at ||
                              0
                          ).getTime()
                      )[0];

                  const effectiveStatus =
                    order.status ===
                      'cancelled'
                      ? 'cancelled'
                      : (
                          order.status ===
                            'paid' ||
                          order.status ===
                            'completed' ||
                          verifiedTotal + 0.0001 >=
                            Number(
                              order.total || 0
                            )
                        )
                        ? 'verified'
                        : latestExternalPayment
                            ?.status ||
                          order.status ||
                          'pending';

                  return (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-zinc-950">
                          {
                            order.reference
                          }
                        </p>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {
                            order.user_email
                          }
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-sm font-bold text-zinc-950">
                          $
                          {order.total.toFixed(
                            2
                          )}
                        </p>

                        <PaymentBadge
                          status={
                            effectiveStatus
                          }
                        />
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>
        </section>
      </div>
    );
  };

const Metric: React.FC<{
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: number;
  onClick?: () => void;
}> = ({
  icon: Icon,
  label,
  value,
  onClick,
}) => {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-zinc-500">
          {label}
        </p>

        <Icon className="h-4 w-4 text-[#3120ff]" />
      </div>

      <p className="mt-3 text-2xl font-bold text-zinc-950">
        {value}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={
          onClick
        }
        className="rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-[#3120ff]/30"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      {content}
    </div>
  );
};

const PaymentBadge: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  const verified =
    status ===
    'verified';

  const rejected =
    status ===
    'rejected';

  const cancelled =
    status ===
    'cancelled';

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${
        verified
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : rejected
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : cancelled
              ? 'border-zinc-200 bg-zinc-100 text-zinc-600'
              : 'border-[#3120ff]/20 bg-[#3120ff]/5 text-[#3120ff]'
      }`}
    >
      {verified
        ? 'Verified'
        : rejected
          ? 'Rejected'
          : cancelled
            ? 'Cancelled'
            : 'Pending'}
    </span>
  );
};
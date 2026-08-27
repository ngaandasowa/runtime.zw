import React, {
  useMemo,
  useState,
} from 'react';

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

export const AdminOrdersPayments:
  React.FC = () => {
    const {
      orders,
      payments,
      domains,
      approveManualPayment,
      rejectManualPayment,
      cancelOrder,
      deleteOrder,
      showNotification,
    } = useStore();

    const [
      search,
      setSearch,
    ] = useState('');

    const [
      statusFilter,
      setStatusFilter,
    ] = useState<
      'ALL' |
      'pending' |
      'verified' |
      'rejected' |
      'cancelled'
    >('ALL');

    const [
      busyPaymentId,
      setBusyPaymentId,
    ] = useState<
      string | null
    >(null);

    const [
      busyOrderId,
      setBusyOrderId,
    ] = useState<
      string | null
    >(null);

    const rows =
      useMemo(() => {
        return [...orders]
          .sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          )
          .map((order) => {
            const payment =
              payments.find(
                (item) =>
                  item.order_id ===
                  order.id
              ) || null;

            const domain =
              domains.find(
                (item) =>
                  (item as any)
                    .order_id ===
                  order.id
              ) || null;

            return {
              order,
              payment,
              domain,
            };
          });
      }, [
        orders,
        payments,
        domains,
      ]);

    const filtered =
      rows.filter(
        ({
          order,
          payment,
          domain,
        }) => {
          const value =
            search
              .trim()
              .toLowerCase();

          if (value) {
            const matches =
              order.reference
                .toLowerCase()
                .includes(value) ||
              order.user_email
                .toLowerCase()
                .includes(value) ||
              domain?.domain_name
                .toLowerCase()
                .includes(value) ||
              payment?.reference
                .toLowerCase()
                .includes(value);

            if (!matches) {
              return false;
            }
          }

          if (
            statusFilter ===
            'ALL'
          ) {
            return true;
          }

          if (
            statusFilter ===
            'cancelled'
          ) {
            return (
              order.status ===
              'cancelled'
            );
          }

          if (
            statusFilter ===
            'pending'
          ) {
            return (
              order.status !==
                'cancelled' &&
              (
                !payment ||
                payment.status ===
                  'pending' ||
                payment.status ===
                  'pending_verification'
              )
            );
          }

          return (
            payment?.status ===
            statusFilter
          );
        }
      );

    const pendingCount =
      payments.filter(
        (payment) =>
          payment.status ===
            'pending' ||
          payment.status ===
            'pending_verification'
      ).length;

    const verifiedCount =
      payments.filter(
        (payment) =>
          payment.status ===
          'verified'
      ).length;

    const cancelledCount =
      orders.filter(
        (order) =>
          order.status ===
          'cancelled'
      ).length;

    const approve = async (
      paymentId: string
    ) => {
      const confirmed =
        window.confirm(
          'Approve this payment only after you have confirmed the EcoCash USD money was received.'
        );

      if (!confirmed) {
        return;
      }

      const transactionId =
        window.prompt(
          'Enter the EcoCash transaction ID. If no message was received, enter a note such as "Cash received".',
          'Cash received'
        );

      if (transactionId === null) {
        return;
      }

      setBusyPaymentId(
        paymentId
      );

      try {
        await approveManualPayment(
          paymentId,
          transactionId.trim() ||
            'Cash received'
        );
      } catch (error) {
        showNotification(
          error instanceof Error
            ? error.message
            : 'Unable to approve payment.',
          'error'
        );
      } finally {
        setBusyPaymentId(
          null
        );
      }
    };

    const reject = async (
      paymentId: string
    ) => {
      const reason =
        window.prompt(
          'Reason for rejecting this payment:',
          'Payment could not be confirmed.'
        );

      if (reason === null) {
        return;
      }

      setBusyPaymentId(
        paymentId
      );

      try {
        await rejectManualPayment(
          paymentId,
          reason.trim() ||
            undefined
        );
      } catch (error) {
        showNotification(
          error instanceof Error
            ? error.message
            : 'Unable to reject payment.',
          'error'
        );
      } finally {
        setBusyPaymentId(
          null
        );
      }
    };

    const canCancelOrder = (
      status: string
    ) =>
      [
        'pending',
        'unpaid',
        'payment_pending',
      ].includes(status);


    const cancelAdminOrder =
      async (
        orderId: string,
        reference: string
      ) => {
        const confirmed =
          window.confirm(
            `Cancel order ${reference}?`
          );

        if (!confirmed) {
          return;
        }

        setBusyOrderId(
          orderId
        );

        try {
          await cancelOrder(
            orderId
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to cancel order.',
            'error'
          );
        } finally {
          setBusyOrderId(
            null
          );
        }
      };


    const deleteAdminOrder =
      async (
        orderId: string,
        reference: string
      ) => {
        const confirmed =
          window.confirm(
            `Permanently delete cancelled order ${reference}? This cannot be undone.`
          );

        if (!confirmed) {
          return;
        }

        setBusyOrderId(
          orderId
        );

        try {
          await deleteOrder(
            orderId
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to delete order.',
            'error'
          );
        } finally {
          setBusyOrderId(
            null
          );
        }
      };


    return (
      <div className="space-y-6">

        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
            Orders & Payments
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Review real customer orders and confirm manual payments.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Orders"
            value={orders.length}
          />

          <Metric
            label="Awaiting Payment"
            value={pendingCount}
          />

          <Metric
            label="Verified"
            value={verifiedCount}
          />

          <Metric
            label="Cancelled"
            value={cancelledCount}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search order, customer or domain"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#3120ff]"
            />
          </div>

          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'ALL'
                  | 'pending'
                  | 'verified'
                  | 'rejected'
                  | 'cancelled'
              )
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none"
          >
            <option value="ALL">
              All payments
            </option>

            <option value="pending">
              Awaiting payment
            </option>

            <option value="verified">
              Verified
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="cancelled">
              Cancelled orders
            </option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {filtered.length ===
          0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              No matching orders.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map(
                ({
                  order,
                  payment,
                  domain,
                }) => {
                  const pending =
                    order.status !==
                      'cancelled' &&
                    (
                      !payment ||
                      payment.status ===
                        'pending' ||
                      payment.status ===
                        'pending_verification'
                    );

                  const cancellable =
                    canCancelOrder(
                      String(
                        order.status
                      )
                    );

                  return (
                    <div
                      key={order.id}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-bold text-zinc-950">
                              {order.reference}
                            </p>

                            <StatusBadge
                              status={
                                order.status ===
                                'cancelled'
                                  ? 'cancelled'
                                  : !payment &&
                                      cancellable
                                    ? 'payment_missing'
                                    : payment?.status ||
                                      order.status ||
                                      'pending'
                              }
                            />
                          </div>

                          <p className="mt-2 text-sm font-semibold text-zinc-900">
                            {domain?.domain_name ||
                              order.items
                                .map(
                                  (item) =>
                                    item.description
                                )
                                .join(', ')}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {order.user_email}
                          </p>

                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                            <Info
                              label="Amount"
                              value={`$${order.total.toFixed(
                                2
                              )} ${
                                order.currency ||
                                'USD'
                              }`}
                            />

                            <Info
                              label="Method"
                              value={
                                payment?.gateway ===
                                'ecocash_usd'
                                  ? 'EcoCash USD'
                                  : payment?.gateway ||
                                    'Payment record missing'
                              }
                            />

                            <Info
                              label="Payment Ref"
                              value={
                                payment?.reference ||
                                '—'
                              }
                              mono
                            />

                            <Info
                              label="Transaction ID"
                              value={
                                payment?.transaction_id ||
                                '—'
                              }
                              mono
                            />
                          </div>

                          <p className="mt-3 text-[11px] text-zinc-400">
                            Ordered{' '}
                            {new Date(
                              order.created_at
                            ).toLocaleString()}
                          </p>

                          {!payment &&
                            cancellable && (
                            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                              This order has no payment record. It cannot be approved or rejected yet. The customer can open the order and choose <strong>Continue payment</strong> to restore the EcoCash payment record, or the order can be cancelled.
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          {payment &&
                            pending && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    busyPaymentId ===
                                    payment.id
                                  }
                                  onClick={() =>
                                    approve(
                                      payment.id
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2819d9] disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve Payment
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    busyPaymentId ===
                                    payment.id
                                  }
                                  onClick={() =>
                                    reject(
                                      payment.id
                                    )
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </>
                            )}

                          {cancellable && (
                            <button
                              type="button"
                              disabled={
                                busyOrderId ===
                                order.id
                              }
                              onClick={() =>
                                cancelAdminOrder(
                                  order.id,
                                  order.reference
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              {busyOrderId ===
                              order.id
                                ? 'Cancelling...'
                                : 'Cancel Order'}
                            </button>
                          )}

                          {order.status ===
                            'cancelled' && (
                            <button
                              type="button"
                              disabled={
                                busyOrderId ===
                                order.id
                              }
                              onClick={() =>
                                deleteAdminOrder(
                                  order.id,
                                  order.reference
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              {busyOrderId ===
                              order.id
                                ? 'Deleting...'
                                : 'Delete Order'}
                            </button>
                          )}

                          {payment?.status ===
                            'verified' && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Verified
                            </div>
                          )}

                          {payment?.status ===
                            'rejected' && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
                              <XCircle className="h-4 w-4" />
                              Rejected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
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
  <div className="rounded-xl border border-zinc-200 bg-white p-4">
    <p className="text-xs text-zinc-500">
      {label}
    </p>

    <p className="mt-1 text-2xl font-bold text-zinc-950">
      {value}
    </p>
  </div>
);

const Info: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
}> = ({
  label,
  value,
  mono = false,
}) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      {label}
    </p>

    <p
      className={`mt-1 font-semibold text-zinc-700 ${
        mono
          ? 'font-mono'
          : ''
      }`}
    >
      {value}
    </p>
  </div>
);

const StatusBadge: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  const verified =
    status === 'verified';

  const rejected =
    status === 'rejected';

  const cancelled =
    status === 'cancelled';

  const paymentMissing =
    status ===
    'payment_missing';

  const label =
    paymentMissing
      ? 'Payment setup required'
      : cancelled
        ? 'Cancelled'
        : verified
        ? 'Verified'
        : rejected
          ? 'Rejected'
          : status ===
              'pending_verification'
            ? 'Awaiting verification'
            : 'Awaiting payment';

  const classes =
    paymentMissing
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : cancelled
        ? 'border-zinc-200 bg-zinc-100 text-zinc-600'
        : verified
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : rejected
          ? 'border-zinc-200 bg-zinc-100 text-zinc-700'
          : 'border-[#3120ff]/20 bg-[#3120ff]/5 text-[#3120ff]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {verified ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Clock3 className="h-3 w-3" />
      )}

      {label}
    </span>
  );
};
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
      users,
      orders,
      payments,
      domains,
      approveManualPayment,
      rejectManualPayment,
      replacePaidDomain,
      replacePaidDomainWithExisting,
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
      'failed' |
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

    const customerForPayment = (
      userId: string
    ) =>
      users.find(
        (user) =>
          user.id ===
          userId
      ) || null;

    const walletTopups =
      useMemo(
        () =>
          payments
            .filter(
              (payment) =>
                payment.purpose ===
                'wallet_topup'
            )
            .sort(
              (a, b) =>
                new Date(
                  b.created_at ||
                    b.updated_at ||
                    0
                ).getTime() -
                new Date(
                  a.created_at ||
                    a.updated_at ||
                    0
                ).getTime()
            ),
        [payments]
      );

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
            /*
             * An order can have multiple payment attempts.
             * Always use the newest attempt for the row/action
             * state. Using payments.find() kept showing the
             * first failed PesePay attempt even after the
             * customer selected another payment method.
             */
            const paymentAttempts =
              payments
                .filter(
                  (item) =>
                    item.order_id ===
                      order.id
                )
                .sort(
                  (a, b) =>
                    new Date(
                      b.created_at ||
                        b.updated_at ||
                        0
                    ).getTime() -
                    new Date(
                      a.created_at ||
                        a.updated_at ||
                        0
                    ).getTime()
                );

            const payment =
              paymentAttempts[0] ||
              null;

            const linkedDomains =
              domains.filter(
                (item) =>
                  (item as any)
                    .order_id ===
                  order.id
              );

            const domain =
              linkedDomains.find(
                (item) =>
                  ![
                    'cancelled',
                    'registry_rejected',
                    'replaced',
                  ].includes(
                    String(
                      item.status
                    )
                  )
              ) ||
              linkedDomains[0] ||
              null;

            return {
              order,
              payment,
              paymentAttempts,
              domain,
              linkedDomains,
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
            'verified' &&
          payment.gateway !==
            'runtime_credit'
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


    const replaceDomain =
      async (
        domainId: string,
        currentDomainName: string
      ) => {
        const replacement =
          window.prompt(
            `Enter the replacement domain for ${currentDomainName}. The customer's existing verified payment will be retained.`
          );

        if (
          !replacement?.trim()
        ) {
          return;
        }

        const reason =
          window.prompt(
            'Why is the original domain being replaced?',
            'Registry rejected the original domain.'
          ) ||
          'Registry rejected the original domain.';

        const replacementName =
          replacement
            .trim()
            .toLowerCase();

        const confirmed =
          window.confirm(
            `Replace ${currentDomainName} with ${replacementName}?\n\nNo new payment will be created. The original verified payment and order history will be retained.`
          );

        if (!confirmed) {
          return;
        }

        setBusyOrderId(
          domainId
        );

        try {
          await replacePaidDomain(
            domainId,
            replacementName,
            reason
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to replace domain.',
            'error'
          );
        } finally {
          setBusyOrderId(
            null
          );
        }
      };


    const useExistingDomainAsReplacement =
      async (
        originalDomainId: string,
        originalDomainName: string
      ) => {
        const originalDomain =
          domains.find(
            (item) =>
              item.id ===
              originalDomainId
          );

        if (!originalDomain) {
          showNotification(
            'Original domain not found.',
            'error'
          );
          return;
        }

        const eligibleDomains =
          domains.filter(
            (item) =>
              item.id !==
                originalDomain.id &&
              item.user_id ===
                originalDomain.user_id &&
              ![
                'cancelled',
                'registry_rejected',
                'replaced',
              ].includes(
                String(
                  item.status
                )
              )
          );

        if (
          eligibleDomains.length ===
          0
        ) {
          showNotification(
            'This customer has no existing domain that can be used as the replacement.',
            'error'
          );
          return;
        }

        const choices =
          eligibleDomains
            .map(
              (item, index) =>
                `${index + 1}. ${item.domain_name} (${String(item.status).replace(/_/g, ' ')})`
            )
            .join('\n');

        const selected =
          window.prompt(
            `Choose the existing domain to use as the replacement for ${originalDomainName}.\n\n${choices}\n\nEnter the number:`
          );

        if (!selected?.trim()) {
          return;
        }

        const index =
          Number(
            selected.trim()
          ) - 1;

        const existingDomain =
          eligibleDomains[
            index
          ];

        if (!existingDomain) {
          showNotification(
            'Choose a valid domain number.',
            'error'
          );
          return;
        }

        const reason =
          window.prompt(
            'Why is the original domain being replaced?',
            'Registry rejected the original domain.'
          ) ||
          'Registry rejected the original domain.';

        const confirmed =
          window.confirm(
            `Use ${existingDomain.domain_name} as the replacement for ${originalDomainName}?\n\nThe existing domain record will be kept and linked to the original paid order and verified payment. No new domain and no new payment will be created.`
          );

        if (!confirmed) {
          return;
        }

        setBusyOrderId(
          originalDomainId
        );

        try {
          await replacePaidDomainWithExisting(
            originalDomainId,
            existingDomain.id,
            reason
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to link the existing replacement domain.',
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
                  | 'failed'
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

            <option value="failed">
              Failed attempts
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="cancelled">
              Cancelled orders
            </option>
          </select>
        </div>

        {/* RUNTIME CREDIT TOP-UPS */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">
                Runtime Credit top-ups
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Review wallet funding separately from customer orders.
              </p>
            </div>

            <span className="rounded-full bg-[#3120ff]/5 px-2.5 py-1 text-[10px] font-bold text-[#3120ff]">
              {walletTopups.length}
            </span>
          </div>

          {walletTopups.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-zinc-500">
              No Runtime Credit top-ups yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {walletTopups.map(
                (payment) => {
                  const actionable =
                    payment.gateway ===
                      'ecocash_usd' &&
                    (
                      payment.status ===
                        'pending' ||
                      payment.status ===
                        'pending_verification'
                    );

                  return (
                    <div
                      key={payment.id}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-sm font-bold text-zinc-950">
                              {payment.reference}
                            </p>

                            <StatusBadge
                              status={
                                payment.status
                              }
                            />

                            <span className="rounded-full border border-[#3120ff]/15 bg-[#3120ff]/5 px-2 py-1 text-[10px] font-bold text-[#3120ff]">
                              Runtime Credit
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-zinc-900">
                            Wallet top-up
                          </p>

                          {(() => {
                            const customer =
                              customerForPayment(
                                payment.user_id
                              );

                            return (
                              <div className="mt-1">
                                <p className="text-xs font-semibold text-zinc-700">
                                  {customer?.name ||
                                    customer?.email ||
                                    'Customer'}
                                </p>

                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {customer?.email ||
                                    `User ${payment.user_id}`}
                                </p>
                              </div>
                            );
                          })()}

                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                            <Info
                              label="Amount"
                              value={`$${Number(
                                payment.amount || 0
                              ).toFixed(2)} ${
                                payment.currency ||
                                'USD'
                              }`}
                            />

                            <Info
                              label="Method"
                              value={
                                payment.gateway ===
                                'ecocash_usd'
                                  ? 'EcoCash USD'
                                  : payment.gateway ===
                                      'pesepay'
                                    ? 'PesePay'
                                    : payment.gateway
                              }
                            />

                            <Info
                              label="Transaction ID"
                              value={
                                payment.transaction_id ||
                                '—'
                              }
                              mono
                            />
                          </div>

                          <p className="mt-3 text-[11px] text-zinc-400">
                            Created{' '}
                            {new Date(
                              payment.created_at
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          {actionable && (
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
                                {busyPaymentId ===
                                payment.id
                                  ? 'Processing...'
                                  : 'Approve Top-up'}
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

                          {payment.status ===
                            'verified' && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Credit added
                            </div>
                          )}

                          {payment.status ===
                            'rejected' && (
                            <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700">
                              <XCircle className="h-4 w-4" />
                              Rejected
                            </div>
                          )}

                          {payment.status ===
                            'failed' && (
                            <div className="max-w-56 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                              This top-up attempt failed.
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
        </section>

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
                  paymentAttempts,
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

                  /*
                   * Approve / Reject are manual verification
                   * actions. A failed PesePay result is provider-
                   * authoritative and must not be manually turned
                   * into a successful PesePay payment. If the
                   * customer retries with manual EcoCash, that new
                   * payment becomes the latest attempt and these
                   * actions appear automatically.
                   */
                  const manualActionable =
                    Boolean(
                      payment &&
                      payment.gateway ===
                        'ecocash_usd' &&
                      (
                        payment.status ===
                          'pending' ||
                        payment.status ===
                          'pending_verification'
                      )
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

                          {paymentAttempts.length > 1 && (
                            <p className="mt-1 text-[11px] text-zinc-400">
                              {paymentAttempts.length}{' '}
                              payment attempts. Showing the latest attempt.
                            </p>
                          )}

                          {!payment &&
                            cancellable && (
                            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
                              This order has no payment record. It cannot be approved or rejected yet. The customer can open the order and choose <strong>Continue payment</strong> to restore the EcoCash payment record, or the order can be cancelled.
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                          {payment?.status ===
                            'failed' && (
                            <div className="max-w-56 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                              This payment attempt failed. The order is still open and the customer can try another payment method.
                            </div>
                          )}

                          {payment &&
                            manualActionable && (
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

                          {domain &&
                            [
                              'cancelled',
                              'registry_rejected',
                              'pending_registration',
                              'pending_delete',
                            ].includes(
                              String(
                                domain.status
                              )
                            ) &&
                            paymentAttempts.some(
                              (attempt) =>
                                attempt.status ===
                                'verified'
                            ) && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  busyOrderId ===
                                  domain.id
                                }
                                onClick={() =>
                                  replaceDomain(
                                    domain.id,
                                    domain.domain_name
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 px-4 py-2.5 text-xs font-bold text-[#3120ff] transition hover:bg-[#3120ff]/10 disabled:opacity-50"
                              >
                                {busyOrderId ===
                                domain.id
                                  ? 'Replacing...'
                                  : 'Replace Domain'}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busyOrderId ===
                                  domain.id
                                }
                                onClick={() =>
                                  useExistingDomainAsReplacement(
                                    domain.id,
                                    domain.domain_name
                                  )
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                              >
                                {busyOrderId ===
                                domain.id
                                  ? 'Linking...'
                                  : 'Use Existing Domain'}
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

  const failed =
    status === 'failed';

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
        : failed
          ? 'Payment failed'
          : rejected
            ? 'Rejected'
            : status ===
              'pending_verification'
            ? 'Awaiting verification'
            : 'Awaiting payment';

  const classes =
    paymentMissing
      ? 'border-zinc-200 bg-zinc-50 text-zinc-700'
      : cancelled
        ? 'border-zinc-200 bg-zinc-100 text-zinc-600'
        : verified
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : failed
          ? 'border-rose-200 bg-rose-50 text-rose-700'
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
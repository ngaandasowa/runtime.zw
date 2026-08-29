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
  XCircle,
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
      cancelOrder,
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

    const [
      cancellingOrderId,
      setCancellingOrderId,
    ] = useState<
      string | null
    >(null);

    const [
      startingPaymentOrderId,
      setStartingPaymentOrderId,
    ] = useState<
      string | null
    >(null);

    type RetryGateway =
      | 'ecocash_usd'
      | 'pesepay';

    type PesePayMethod = {
      code: string;
      name: string;
      description?: string;
      seamless: boolean;
      requiresPhone: boolean;
    };

    const [
      paymentOrder,
      setPaymentOrder,
    ] = useState<Order | null>(
      null
    );

    const [
      retryGateway,
      setRetryGateway,
    ] = useState<RetryGateway>(
      'ecocash_usd'
    );

    const [
      pesePayMethods,
      setPesePayMethods,
    ] = useState<PesePayMethod[]>([]);

    const [
      pesePayMethodCode,
      setPesePayMethodCode,
    ] = useState('');

    const [
      pesePayPhone,
      setPesePayPhone,
    ] = useState(
      currentUser?.phone || ''
    );

    const [
      pesePayMethodsLoading,
      setPesePayMethodsLoading,
    ] = useState(false);

    const [
      paymentModalBusy,
      setPaymentModalBusy,
    ] = useState(false);

    const [
      paymentModalError,
      setPaymentModalError,
    ] = useState<string | null>(
      null
    );

    const [
      paymentModalMessage,
      setPaymentModalMessage,
    ] = useState<string | null>(
      null
    );

    const API_BASE_URL =
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:4000'
        : 'https://runtime-api-my3q.onrender.com');

    const authenticatedRequest =
      async (
        path: string,
        options: RequestInit = {}
      ) => {
        const authModule =
          await import(
            'firebase/auth'
          );

        const authUser =
          authModule
            .getAuth()
            .currentUser;

        if (!authUser) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const token =
          await authUser
            .getIdToken();

        const response =
          await fetch(
            `${API_BASE_URL}${path}`,
            {
              ...options,
              headers: {
                'Content-Type':
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
                ...(options.headers || {}),
              },
            }
          );

        let body: any = null;

        try {
          body =
            await response.json();
        } catch {
          body = null;
        }

        if (!response.ok) {
          throw new Error(
            body?.message ||
              `Payment request failed (${response.status}).`
          );
        }

        return body;
      };

    const loadPesePayMethods =
      async () => {
        setPesePayMethodsLoading(
          true
        );

        setPaymentModalError(
          null
        );

        try {
          const result =
            await authenticatedRequest(
              '/api/payments/pesepay/methods?currencyCode=USD'
            );

          const methods =
            Array.isArray(
              result?.methods
            )
              ? result.methods
              : [];

          setPesePayMethods(
            methods
          );

          setPesePayMethodCode(
            (current) =>
              methods.some(
                (
                  method:
                    PesePayMethod
                ) =>
                  method.code ===
                  current
              )
                ? current
                : methods[0]?.code ||
                  ''
          );
        } catch (error) {
          setPesePayMethods(
            []
          );

          setPesePayMethodCode(
            ''
          );

          setPaymentModalError(
            error instanceof Error
              ? error.message
              : 'Unable to load PesePay payment methods.'
          );
        } finally {
          setPesePayMethodsLoading(
            false
          );
        }
      };

    const openPaymentModal =
      async (
        order: Order
      ) => {
        setPaymentOrder(
          order
        );

        /*
         * Restore the original manual EcoCash experience
         * as the immediately available option.
         * PesePay methods are loaded only if the customer
         * explicitly selects PesePay.
         */
        setRetryGateway(
          'ecocash_usd'
        );

        setPaymentModalError(
          null
        );

        setPaymentModalMessage(
          null
        );

        setPesePayPhone(
          currentUser?.phone || ''
        );

        setPaymentModalBusy(
          false
        );

        setPesePayMethodsLoading(
          false
        );
      };

    const checkPesePayAttempt =
      async (
        paymentId: string
      ) => {
        const maxAttempts = 12;

        for (
          let attempt = 0;
          attempt < maxAttempts;
          attempt += 1
        ) {
          const result =
            await authenticatedRequest(
              '/api/payments/pesepay/verify',
              {
                method: 'POST',
                body:
                  JSON.stringify({
                    paymentId,
                  }),
              }
            );

          if (
            result?.paymentState ===
              'success' ||
            result?.verified
          ) {
            return result;
          }

          if (
            result?.paymentState ===
            'failed'
          ) {
            return result;
          }

          await new Promise(
            (resolve) =>
              window.setTimeout(
                resolve,
                3000
              )
          );
        }

        return {
          paymentState:
            'pending',
          verified: false,
          transactionStatusDescription:
            'Runtime has not received a final payment confirmation yet.',
        };
      };

    const openEcoCashWhatsAppForOrder =
      async () => {
        if (!paymentOrder) {
          return;
        }

        setPaymentModalBusy(
          true
        );

        setPaymentModalError(
          null
        );

        try {
          /*
           * Ensure Runtime has a manual payment record before
           * opening WhatsApp. The payment remains unverified
           * until an admin confirms the screenshot/money.
           */
          await authenticatedRequest(
            '/api/payments/order/ecocash',
            {
              method: 'POST',
              body:
                JSON.stringify({
                  orderId:
                    paymentOrder.id,
                }),
            }
          );

          const itemDescription =
            paymentOrder.items?.[0]
              ?.description ||
            'Runtime order';

          const message =
            encodeURIComponent(
              [
                'Hi Runtime, I have paid for my order using EcoCash USD.',
                '',
                `Order: ${paymentOrder.reference}`,
                `Item: ${itemDescription}`,
                `Amount: $${paymentOrder.total.toFixed(2)} ${paymentOrder.currency || 'USD'}`,
                '',
                'I am attaching my payment screenshot for verification.',
              ].join('\n')
            );

          window.open(
            `https://wa.me/263788350229?text=${message}`,
            '_blank',
            'noopener,noreferrer'
          );

          setPaymentModalMessage(
            'Screenshot submission opened in WhatsApp. Runtime will verify the payment after confirming the money was received.'
          );
        } catch (error) {
          setPaymentModalError(
            error instanceof Error
              ? error.message
              : 'Unable to prepare the EcoCash USD payment.'
          );
        } finally {
          setPaymentModalBusy(
            false
          );
        }
      };

    const submitExistingOrderPayment =
      async () => {
        if (!paymentOrder) {
          return;
        }

        setPaymentModalBusy(
          true
        );

        setPaymentModalError(
          null
        );

        setPaymentModalMessage(
          null
        );

        try {
          const selectedMethod =
            pesePayMethods.find(
              (method) =>
                method.code ===
                pesePayMethodCode
            );

          if (!selectedMethod) {
            throw new Error(
              'Choose a PesePay payment method.'
            );
          }

          if (
            selectedMethod
              .requiresPhone &&
            !pesePayPhone.trim()
          ) {
            throw new Error(
              `Enter the ${selectedMethod.name} phone number.`
            );
          }

          const initiation =
            await authenticatedRequest(
              '/api/payments/pesepay/initiate',
              {
                method: 'POST',
                body:
                  JSON.stringify({
                    orderId:
                      paymentOrder.id,
                    paymentMethodCode:
                      selectedMethod.code,
                    customerPhoneNumber:
                      selectedMethod
                        .requiresPhone
                        ? pesePayPhone.trim()
                        : currentUser?.phone ||
                          '',
                  }),
              }
            );

          const transaction =
            initiation?.transaction ||
            {};

          const paymentId =
            String(
              initiation?.paymentId ||
                ''
            );

          if (!paymentId) {
            throw new Error(
              'Runtime could not create the PesePay transaction.'
            );
          }

          if (
            transaction.flow ===
              'redirect' ||
            transaction
              .redirectRequired
          ) {
            if (
              !transaction
                .redirectUrl
            ) {
              throw new Error(
                'PesePay did not return a checkout URL.'
              );
            }

            window.location.assign(
              String(
                transaction
                  .redirectUrl
              )
            );

            return;
          }

          setPaymentModalMessage(
            'Payment request sent. Complete the prompt on your phone.'
          );

          const result =
            await checkPesePayAttempt(
              paymentId
            );

          if (
            result?.paymentState ===
              'success' ||
            result?.verified
          ) {
            setPaymentModalMessage(
              'Payment confirmed successfully. Your order is now being processed.'
            );

            window.setTimeout(
              () =>
                window.location
                  .reload(),
              800
            );

            return;
          }

          if (
            result?.paymentState ===
            'failed'
          ) {
            setPaymentModalError(
              result
                ?.transactionStatusDescription ||
                'The payment was not completed. Choose a payment method and try again.'
            );

            setPaymentModalMessage(
              null
            );

            return;
          }

          setPaymentModalMessage(
            result
              ?.transactionStatusDescription ||
              'Payment is still awaiting confirmation. You can close this window and try again later.'
          );
        } catch (error) {
          setPaymentModalError(
            error instanceof Error
              ? error.message
              : 'Unable to start payment.'
          );
        } finally {
          setPaymentModalBusy(
            false
          );
        }
      };

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
      payments
        .filter(
          (payment) =>
            payment.order_id ===
            orderId
        )
        .sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        )[0];

    /*
     * An unpaid order remains payable after a failed or
     * rejected attempt. A failed Payment document must not
     * hide the customer's Continue payment action.
     */
    const canContinuePayment = (
      order: Order
    ) => {
      /*
       * Payment availability is based on the ORDER,
       * not on the latest payment attempt.
       *
       * A pending PesePay attempt may never complete
       * (no prompt, abandoned prompt, network issue,
       * insufficient funds, etc.). As long as the
       * order itself is still unpaid, the customer
       * must always be able to start another payment.
       */
      return [
        'pending',
        'unpaid',
        'payment_pending',
      ].includes(
        String(order.status)
      );
    };

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

    const continuePayment =
      async (
        order: Order
      ) => {
        setStartingPaymentOrderId(
          order.id
        );

        try {
          await openPaymentModal(
            order
          );
        } finally {
          setStartingPaymentOrderId(
            null
          );
        }
      };


    const canCancelOrder = (
      order: Order
    ) =>
      [
        'pending',
        'unpaid',
        'payment_pending',
      ].includes(
        String(order.status)
      );


    const cancelCustomerOrder =
      async (
        order: Order
      ) => {
        if (
          !canCancelOrder(order)
        ) {
          return;
        }

        const confirmed =
          window.confirm(
            `Cancel order ${order.reference}? This action cannot be undone from your account.`
          );

        if (!confirmed) {
          return;
        }

        setCancellingOrderId(
          order.id
        );

        try {
          await cancelOrder(
            order.id
          );

          if (
            selectedReceipt?.id ===
            order.id
          ) {
            setSelectedReceipt(
              (previous) =>
                previous
                  ? {
                      ...previous,
                      status:
                        'cancelled' as any,
                      updated_at:
                        new Date()
                          .toISOString(),
                    }
                  : previous
            );
          }
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to cancel this order.',
            'error'
          );
        } finally {
          setCancellingOrderId(
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

                          <div className="flex items-center gap-3">
                            {canContinuePayment(
                              order
                            ) && (
                              <button
                                type="button"
                                disabled={
                                  startingPaymentOrderId ===
                                  order.id
                                }
                                onClick={() =>
                                  continuePayment(
                                    order
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3120ff] transition hover:text-[#2819d9] disabled:opacity-50"
                              >
                                {startingPaymentOrderId ===
                                order.id
                                  ? 'Preparing...'
                                  : payment?.status ===
                                      'failed' ||
                                    payment?.status ===
                                      'rejected'
                                    ? 'Try payment again'
                                    : payment?.status ===
                                        'pending' ||
                                      payment?.status ===
                                        'pending_verification'
                                      ? 'Pay / try another method'
                                      : 'Continue payment'}
                              </button>
                            )}

                            {canCancelOrder(
                              order
                            ) && (
                              <button
                                type="button"
                                disabled={
                                  cancellingOrderId ===
                                  order.id
                                }
                                onClick={() =>
                                  cancelCustomerOrder(
                                    order
                                  )
                                }
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-900 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {cancellingOrderId ===
                                order.id
                                  ? 'Cancelling...'
                                  : 'Cancel'}
                              </button>
                            )}

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
                    selectedReceipt.status ===
                    'cancelled'
                      ? 'cancelled'
                      : !paymentForOrder(
                          selectedReceipt.id
                        ) &&
                        canCancelOrder(
                          selectedReceipt
                        )
                        ? 'payment_setup_required'
                        : paymentForOrder(
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

              {canContinuePayment(
                selectedReceipt
              ) && (
                <button
                  type="button"
                  disabled={
                    startingPaymentOrderId ===
                    selectedReceipt.id
                  }
                  onClick={() =>
                    continuePayment(
                      selectedReceipt
                    )
                  }
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#2819d9] disabled:opacity-50"
                >
                  {startingPaymentOrderId ===
                  selectedReceipt.id
                    ? 'Preparing payment...'
                    : ['failed', 'rejected'].includes(
                        String(
                          paymentForOrder(
                            selectedReceipt.id
                          )?.status ||
                            ''
                        )
                      )
                      ? 'Try payment again'
                      : ['pending', 'pending_verification'].includes(
                          String(
                            paymentForOrder(
                              selectedReceipt.id
                            )?.status ||
                              ''
                          )
                        )
                        ? 'Pay / try another method'
                        : 'Continue to payment'}
                </button>
              )}

              {canCancelOrder(
                selectedReceipt
              ) && (
                <button
                  type="button"
                  disabled={
                    cancellingOrderId ===
                    selectedReceipt.id
                  }
                  onClick={() =>
                    cancelCustomerOrder(
                      selectedReceipt
                    )
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />

                  {cancellingOrderId ===
                  selectedReceipt.id
                    ? 'Cancelling order...'
                    : 'Cancel order'}
                </button>
              )}
            </div>
          </div>
        )}
        {paymentOrder && (
          <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
              <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <h2 className="text-base font-bold text-zinc-950">
                    Pay order
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    {paymentOrder.reference} · ${paymentOrder.total.toFixed(2)} {paymentOrder.currency || 'USD'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPaymentOrder(
                      null
                    )
                  }
                  disabled={
                    paymentModalBusy
                  }
                  className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50"
                  aria-label="Close payment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <p className="mb-2 text-xs font-semibold text-zinc-700">
                    Choose how to pay
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRetryGateway(
                          'pesepay'
                        );

                        setPaymentModalMessage(
                          null
                        );

                        if (
                          pesePayMethods.length ===
                            0 &&
                          !pesePayMethodsLoading
                        ) {
                          void loadPesePayMethods();
                        }
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        retryGateway ===
                        'pesepay'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-zinc-950">
                        PesePay
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                        Pay using an available PesePay method.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRetryGateway(
                          'ecocash_usd'
                        );

                        setPaymentModalMessage(
                          null
                        );

                        setPaymentModalError(
                          null
                        );
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        retryGateway ===
                        'ecocash_usd'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-zinc-950">
                        EcoCash USD
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                        Manual payment with screenshot verification.
                      </p>
                    </button>
                  </div>
                </div>

                {retryGateway ===
                  'pesepay' && (
                  <div className="space-y-3">
                    {pesePayMethods.length ===
                    0 ? (
                      <p className="text-xs text-zinc-500">
                        {pesePayMethodsLoading
                          ? 'Loading PesePay payment methods...'
                          : 'No PesePay methods are available right now.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pesePayMethods.map(
                          (method) => (
                            <button
                              key={
                                method.code
                              }
                              type="button"
                              onClick={() =>
                                setPesePayMethodCode(
                                  method.code
                                )
                              }
                              className={`flex w-full items-start justify-between rounded-xl border p-3 text-left ${
                                pesePayMethodCode ===
                                method.code
                                  ? 'border-[#3120ff] bg-[#3120ff]/5'
                                  : 'border-zinc-200'
                              }`}
                            >
                              <div>
                                <p className="text-sm font-semibold text-zinc-950">
                                  {method.name}
                                </p>
                                {method.description && (
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    {method.description}
                                  </p>
                                )}
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {pesePayMethods.find(
                      (method) =>
                        method.code ===
                        pesePayMethodCode
                    )?.requiresPhone && (
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-zinc-700">
                          EcoCash number
                        </label>
                        <input
                          value={
                            pesePayPhone
                          }
                          onChange={(
                            event
                          ) =>
                            setPesePayPhone(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="07..."
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {retryGateway ===
                  'ecocash_usd' && (
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-xl border border-zinc-200">
                      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          Order
                        </span>
                        <span className="font-mono text-xs font-semibold text-zinc-950">
                          {paymentOrder.reference}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          Send Money to
                        </span>
                        <span className="font-mono text-sm font-bold text-zinc-950">
                          0783827570
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          EcoCash name
                        </span>
                        <span className="text-right text-xs font-semibold text-zinc-950">
                          Ngaavongwe Ndasowampange
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 px-4 py-3">
                        <span className="text-xs text-zinc-500">
                          Status
                        </span>
                        <span className="text-xs font-semibold text-zinc-700">
                          Awaiting verification
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 bg-zinc-50 px-4 py-4">
                        <span className="text-sm font-semibold text-zinc-950">
                          Amount
                        </span>
                        <span className="text-lg font-bold text-[#3120ff]">
                          ${paymentOrder.total.toFixed(2)} {paymentOrder.currency || 'USD'}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-950">
                        After you pay
                      </p>

                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Send your EcoCash payment screenshot to Runtime on WhatsApp. Your order stays unpaid until an admin confirms that the money was received.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        openEcoCashWhatsAppForOrder
                      }
                      disabled={
                        paymentModalBusy
                      }
                      className="flex w-full items-center justify-center rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {paymentModalBusy
                        ? 'Preparing WhatsApp...'
                        : "I've Paid — Send Screenshot on WhatsApp"}
                    </button>
                  </div>
                )}

                {paymentModalError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">
                    {paymentModalError}
                  </div>
                )}

                {paymentModalMessage && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs leading-5 text-zinc-700">
                    {paymentModalMessage}
                  </div>
                )}

                {retryGateway ===
                  'pesepay' && (
                  <button
                    type="button"
                    onClick={
                      submitExistingOrderPayment
                    }
                    disabled={
                      paymentModalBusy ||
                      pesePayMethodsLoading ||
                      !pesePayMethodCode
                    }
                    className="flex w-full items-center justify-center rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pesePayMethodsLoading
                      ? 'Loading PesePay...'
                      : paymentModalBusy
                        ? 'Checking payment...'
                        : 'Pay with PesePay'}
                  </button>
                )}

                {!paymentModalBusy &&
                  paymentModalError && (
                  <p className="text-center text-[11px] text-zinc-500">
                    You can choose another method and try again. A failed attempt does not register the domain.
                  </p>
                )}
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
    status ===
    'payment_setup_required'
  ) {
    return (
      <StatusText
        label="Payment setup required"
        tone="info"
      />
    );
  }

  if (
    status === 'cancelled'
  ) {
    return (
      <StatusText
        label="Cancelled"
        tone="neutral"
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
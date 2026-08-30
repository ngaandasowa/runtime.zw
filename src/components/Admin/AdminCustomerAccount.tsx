import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Globe2,
  WalletCards,
  Mail,
  Phone,
  Plus,
  UserRound,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import type {
  User,
} from '../../types';


const formatDate = (
  value?: string
) => {
  if (!value) {
    return 'Not available';
  }

  return new Date(
    value
  ).toLocaleDateString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
};


const toDateInput = (
  value: Date
) =>
  value
    .toISOString()
    .slice(0, 10);


const renewalLifecycleLabel = (
  domain: any
) => {
  const state =
    domain?.renewal_lifecycle?.state;

  const labels:
    Record<string, string> = {
      invoice_created:
        'Invoice created',
      expired:
        'Expired · grace period',
      grace_period_ended:
        'Grace period ended',
    };

  return state
    ? labels[state] ||
        String(state).replace(/_/g, ' ')
    : null;
};

const isRenewalOrder = (
  order: any
) =>
  String(
    order?.purpose ||
    order?.metadata?.purpose ||
    ''
  ) === 'domain_renewal';

export const AdminCustomerAccount:
  React.FC = () => {
    const {
      users,
      domains,
      orders,
      payments,

      adminCustomerId,
      closeCustomerAccount,
    } = useStore();

    /*
     * IMPORTANT:
     * This state must be inside
     * the React component.
     */
    const [
      assignOpen,
      setAssignOpen,
    ] = useState(false);


    const [
      creditBalance,
      setCreditBalance,
    ] = useState(0);

    const [
      creditLoading,
      setCreditLoading,
    ] = useState(false);

    const [
      creditError,
      setCreditError,
    ] = useState<string | null>(
      null
    );


    const API_BASE_URL =
      import.meta.env
        .VITE_API_BASE_URL ||
      '';

    useEffect(() => {
      let cancelled = false;

      const loadCredit =
        async () => {
          if (!adminCustomerId) {
            setCreditBalance(0);
            return;
          }

          try {
            setCreditLoading(true);
            setCreditError(null);

            const {
              auth,
            } =
              await import(
                '../../firebase/firebase'
              );

            const token =
              await auth.currentUser
                ?.getIdToken();

            if (!token) {
              throw new Error(
                'Authentication required.'
              );
            }

            const response =
              await fetch(
                `${API_BASE_URL}/api/wallet/admin/${encodeURIComponent(
                  adminCustomerId
                )}`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            const result =
              await response.json();

            if (
              !response.ok ||
              result?.success ===
                false
            ) {
              throw new Error(
                result?.message ||
                  'Unable to load Runtime Credit.'
              );
            }

            if (!cancelled) {
              setCreditBalance(
                Number(
                  result?.wallet
                    ?.balance || 0
                )
              );
            }
          } catch (error) {
            if (!cancelled) {
              setCreditBalance(0);
              setCreditError(
                error instanceof Error
                  ? error.message
                  : 'Unable to load Runtime Credit.'
              );
            }
          } finally {
            if (!cancelled) {
              setCreditLoading(false);
            }
          }
        };

      void loadCredit();

      return () => {
        cancelled = true;
      };
    }, [
      adminCustomerId,
      API_BASE_URL,
    ]);


    const customer =
      useMemo(
        () =>
          users.find(
            (user) =>
              user.id ===
              adminCustomerId
          ),
        [
          users,
          adminCustomerId,
        ]
      );


    const customerDomains =
      useMemo(
        () =>
          domains.filter(
            (domain) =>
              domain.user_id ===
                adminCustomerId &&
              ![
                'cancelled',
                'registry_rejected',
                'replaced',
              ].includes(
                String(
                  domain.status
                )
              )
          ),
        [
          domains,
          adminCustomerId,
        ]
      );


    const customerOrders =
      useMemo(
        () =>
          orders.filter(
            (order) =>
              order.user_id ===
              adminCustomerId
          ),
        [
          orders,
          adminCustomerId,
        ]
      );


    const customerRenewalOrders =
      useMemo(
        () =>
          customerOrders.filter(
            (order) =>
              isRenewalOrder(
                order
              )
          ),
        [
          customerOrders,
        ]
      );

    const pendingRenewalOrders =
      customerRenewalOrders.filter(
        (order) =>
          order.status ===
          'pending'
      );


    const customerPayments =
      useMemo(
        () =>
          payments.filter(
            (payment) =>
              payment.user_id ===
              adminCustomerId
          ),
        [
          payments,
          adminCustomerId,
        ]
      );


    if (!adminCustomerId) {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">

          <UserRound className="mx-auto h-8 w-8 text-zinc-400" />

          <h2 className="mt-3 font-semibold text-zinc-950">
            No customer selected
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Return to Customers and select an account.
          </p>

          <button
            type="button"
            onClick={
              closeCustomerAccount
            }
            className="mt-5 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
          >
            Back to customers
          </button>

        </div>
      );
    }


    if (!customer) {
      return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">

          <UserRound className="mx-auto h-8 w-8 text-zinc-400" />

          <h2 className="mt-3 font-semibold text-zinc-950">
            Customer unavailable
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            The selected customer could not be loaded.
          </p>

          <button
            type="button"
            onClick={
              closeCustomerAccount
            }
            className="mt-5 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
          >
            Back to customers
          </button>

        </div>
      );
    }


    const verifiedPayments =
      customerPayments.filter(
        (payment) =>
          payment.status ===
          'verified'
      );


    const totalPaid =
      verifiedPayments.reduce(
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


    return (
      <div className="space-y-6">

        {/* ADMIN ACCESS */}
        <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#3120ff]">
              Admin access
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              You are viewing this customer's Runtime account as an administrator.
            </p>
          </div>

          <button
            type="button"
            onClick={
              closeCustomerAccount
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />

            Exit account
          </button>

        </div>


        {/* CUSTOMER */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

            <div className="flex min-w-0 items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                <UserRound className="h-6 w-6 text-zinc-700" />
              </div>

              <div className="min-w-0">

                <h1 className="truncate text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">
                  {customer.name ||
                    'Customer'}
                </h1>

                <div className="mt-2 space-y-1 text-sm text-zinc-500">

                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />

                    <span className="truncate">
                      {customer.email}
                    </span>
                  </p>

                  {customer.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />

                      <span>
                        {customer.phone}
                      </span>
                    </p>
                  )}

                  {customer.organisation && (
                    <p>
                      {customer.organisation}
                    </p>
                  )}

                </div>

              </div>

            </div>


            <button
              type="button"
              onClick={() =>
                setAssignOpen(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
            >
              <Plus className="h-4 w-4" />

              Assign domain
            </button>

          </div>

        </div>


        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">

          <StatCard
            label="Domains"
            value={
              customerDomains.length
            }
            icon={Globe2}
          />

          <StatCard
            label="Orders"
            value={
              customerOrders.length
            }
            icon={CalendarDays}
          />

          <StatCard
            label="Renewal invoices"
            value={
              pendingRenewalOrders.length
            }
            icon={CalendarDays}
          />

          <StatCard
            label="Payments"
            value={
              customerPayments.length
            }
            icon={CreditCard}
          />

          <StatCard
            label="Paid"
            value={`$${totalPaid.toFixed(
              2
            )}`}
            icon={CreditCard}
          />

          <StatCard
            label="Runtime Credit"
            value={
              creditLoading
                ? '...'
                : `$${creditBalance.toFixed(
                    2
                  )}`
            }
            icon={WalletCards}
          />

        </div>

        {creditError && (
          <p className="text-xs text-rose-600">
            Runtime Credit could not be loaded: {creditError}
          </p>
        )}


        {/* DOMAINS */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <div className="border-b border-zinc-100 p-4 sm:p-5">

            <h2 className="font-semibold text-zinc-950">
              Domains
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Domains assigned to this customer.
            </p>

          </div>


          {customerDomains.length ===
          0 ? (
            <div className="p-8 text-center">

              <Globe2 className="mx-auto h-7 w-7 text-zinc-400" />

              <p className="mt-3 font-medium text-zinc-950">
                No domains yet
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Assign a registered domain to this account.
              </p>

            </div>
          ) : (
            <div>

              {customerDomains.map(
                (domain) => (
                  <div
                    key={
                      domain.id
                    }
                    className="flex flex-col gap-3 border-b border-zinc-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-mono text-sm font-semibold text-zinc-950">
                        {domain.domain_name}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        Registered{' '}
                        {formatDate(
                          domain.registered_at
                        )}
                        {' · '}
                        Renews{' '}
                        {formatDate(
                          domain.expires_at
                        )}
                      </p>

                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {renewalLifecycleLabel(
                        domain as any
                      ) && (
                        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                          {renewalLifecycleLabel(
                            domain as any
                          )}
                        </span>
                      )}

                      {(domain as any)
                        .renewal_lifecycle
                        ?.renewal_order_id && (
                        <span className="font-mono text-[10px] text-zinc-400">
                          {
                            (domain as any)
                              .renewal_lifecycle
                              .renewal_order_id
                          }
                        </span>
                      )}
                    </div>

                    <span className="w-fit rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium capitalize text-zinc-600">
                      {String(
                        domain.status
                      ).replace(
                        /_/g,
                        ' '
                      )}
                    </span>

                  </div>
                )
              )}

            </div>
          )}

        </section>


        {/* ORDERS */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <div className="border-b border-zinc-100 p-4 sm:p-5">
            <h2 className="font-semibold text-zinc-950">
              Recent orders
            </h2>
          </div>


          {customerOrders.length ===
          0 ? (
            <p className="p-6 text-sm text-zinc-500">
              No orders recorded for this customer.
            </p>
          ) : (
            customerOrders
              .slice(0, 5)
              .map(
                (order) => (
                  <div
                    key={
                      order.id
                    }
                    className="flex items-center justify-between gap-4 border-b border-zinc-100 p-4 last:border-b-0"
                  >

                    <div className="min-w-0">

                      <p className="truncate font-mono text-xs font-semibold text-[#3120ff]">
                        {order.reference}
                      </p>

                      {isRenewalOrder(
                        order
                      ) && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          Domain renewal invoice
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(
                          order.created_at
                        )}
                      </p>

                    </div>

                    <div className="text-right">

                      <p className="text-sm font-semibold text-zinc-950">
                        $
                        {Number(
                          order.total || 0
                        ).toFixed(2)}
                      </p>

                      <p className="text-xs capitalize text-zinc-500">
                        {order.status}
                      </p>

                    </div>

                  </div>
                )
              )
          )}

        </section>


        {/* PAYMENTS */}
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <div className="border-b border-zinc-100 p-4 sm:p-5">
            <h2 className="font-semibold text-zinc-950">
              Payments
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Payment references and verification records for this customer.
            </p>
          </div>

          {customerPayments.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              No payments recorded for this customer.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {customerPayments.slice(0, 10).map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-zinc-950">
                      {payment.reference}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {payment.gateway === 'ecocash_usd'
                        ? 'EcoCash USD'
                        : payment.gateway}
                      {' · '}
                      {formatDate(payment.created_at)}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Transaction ID:{' '}
                      <span className="font-mono font-semibold text-zinc-900">
                        {payment.transaction_id || 'Not entered'}
                      </span>
                    </p>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-sm font-semibold text-zinc-950">
                      ${Number(payment.amount || 0).toFixed(2)} {payment.currency}
                    </p>

                    <p className="text-xs capitalize text-zinc-500">
                      {payment.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>


        {/* ASSIGN DOMAIN MODAL */}
        {assignOpen && (
          <AssignDomainModal
            customer={customer}
            onClose={() =>
              setAssignOpen(false)
            }
          />
        )}

      </div>
    );
  };


const AssignDomainModal = ({
  customer,
  onClose,
}: {
  customer: User;
  onClose: () => void;
}) => {
  const {
    assignDomainToCustomer,
    settings,
  } = useStore();


  const today =
    new Date();

  const nextYear =
    new Date(today);

  nextYear.setFullYear(
    nextYear.getFullYear() + 1
  );


  const [
    domainName,
    setDomainName,
  ] = useState('');


  const [
    registrationPrice,
    setRegistrationPrice,
  ] = useState('3');


  const [
    renewalPrice,
    setRenewalPrice,
  ] = useState('3');


  const [
    registeredAt,
    setRegisteredAt,
  ] = useState(
    toDateInput(today)
  );


  const [
    expiresAt,
    setExpiresAt,
  ] = useState(
    toDateInput(nextYear)
  );


  const [
    ns1,
    setNs1,
  ] = useState(
    settings
      .default_nameservers?.[0] ||
      ''
  );


  const [
    ns2,
    setNs2,
  ] = useState(
    settings
      .default_nameservers?.[1] ||
      ''
  );

  const [
    ns1Ip,
    setNs1Ip,
  ] = useState(
    '148.163.100.131'
  );

  const [
    ns2Ip,
    setNs2Ip,
  ] = useState(
    '148.163.100.132'
  );


  const [
    fullName,
    setFullName,
  ] = useState(
    customer.name || ''
  );


  const [
    organisation,
    setOrganisation,
  ] = useState(
    customer.organisation || ''
  );


  const [
    phone,
    setPhone,
  ] = useState(
    customer.phone || ''
  );


  const [
    email,
    setEmail,
  ] = useState(
    customer.email || ''
  );


  const [
    address,
    setAddress,
  ] = useState('');


  const [
    postalAddress,
    setPostalAddress,
  ] = useState('');

  const [
    postalSameAsPhysical,
    setPostalSameAsPhysical,
  ] = useState(false);


  const [
    city,
    setCity,
  ] = useState('');


  const [
    country,
    setCountry,
  ] = useState(
    'Zimbabwe'
  );


  const [
    orgDescription,
    setOrgDescription,
  ] = useState('');


  const [
    proposedUsage,
    setProposedUsage,
  ] = useState('');


  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  const detectPrice = (
    value: string
  ) => {
    const normalized =
      value
        .trim()
        .toLowerCase();

    if (
      normalized.endsWith(
        '.co.zw'
      )
    ) {
      return 2;
    }

    if (
      normalized.endsWith(
        '.org.zw'
      ) ||
      normalized.endsWith(
        '.ac.zw'
      )
    ) {
      return 3;
    }

    return undefined;
  };


  const handleDomainChange = (
    value: string
  ) => {
    const normalized =
      value
        .trim()
        .toLowerCase()
        .replace(
          /^https?:\/\//,
          ''
        )
        .replace(
          /^www\./,
          ''
        );


    setDomainName(
      normalized
    );


    const price =
      detectPrice(
        normalized
      );


    if (
      price !== undefined
    ) {
      setRegistrationPrice(
        String(price)
      );

      setRenewalPrice(
        String(price)
      );
    }
  };


  const submit = async (
    event:
      React.FormEvent
  ) => {
    event.preventDefault();

    setError(null);


    const normalized =
      domainName
        .trim()
        .toLowerCase()
        .replace(
          /^https?:\/\//,
          ''
        )
        .replace(
          /^www\./,
          ''
        );


    if (
      !normalized ||
      !normalized.includes('.')
    ) {
      setError(
        'Enter a valid domain name.'
      );

      return;
    }


    if (!fullName.trim()) {
      setError(
        'Registrant name is required.'
      );

      return;
    }


    if (!email.trim()) {
      setError(
        'Registrant email is required.'
      );

      return;
    }


    if (
      !ns1.trim() ||
      !ns2.trim()
    ) {
      setError(
        'Two nameservers are required.'
      );

      return;
    }

    if (
      !ns1Ip.trim() ||
      !ns2Ip.trim()
    ) {
      setError(
        'The first two nameservers require IP addresses.'
      );

      return;
    }

    if (
      !organisation.trim()
    ) {
      setError(
        'Organisation name is required. Use "Individual" for a personal registration.'
      );

      return;
    }

    if (
      !address.trim() ||
      !postalAddress.trim() ||
      !city.trim()
    ) {
      setError(
        'Physical address, postal address and city are required.'
      );

      return;
    }

    if (
      !orgDescription.trim() ||
      !proposedUsage.trim()
    ) {
      setError(
        'Organisation description and proposed domain usage are required.'
      );

      return;
    }

    if (
      orgDescription
        .trim()
        .toLowerCase() ===
      proposedUsage
        .trim()
        .toLowerCase()
    ) {
      setError(
        'Organisation description and proposed domain usage must be different.'
      );

      return;
    }


    if (
      !registeredAt ||
      !expiresAt
    ) {
      setError(
        'Registration and expiry dates are required.'
      );

      return;
    }


    const regPrice =
      Number(
        registrationPrice
      );

    const renewPrice =
      Number(
        renewalPrice
      );


    if (
      Number.isNaN(
        regPrice
      ) ||
      regPrice < 0 ||
      Number.isNaN(
        renewPrice
      ) ||
      renewPrice < 0
    ) {
      setError(
        'Enter valid pricing.'
      );

      return;
    }


    try {
      setSubmitting(true);


      await assignDomainToCustomer({
        customer,

        domainName:
          normalized,

        registrationPrice:
          regPrice,

        renewalPrice:
          renewPrice,

        registeredAt:
          new Date(
            `${registeredAt}T00:00:00`
          ).toISOString(),

        expiresAt:
          new Date(
            `${expiresAt}T00:00:00`
          ).toISOString(),

        nameservers: [
          ns1.trim(),
          ns2.trim(),
        ],

        nameserverIps: [
          ns1Ip.trim(),
          ns2Ip.trim(),
        ],

        ownerDetails: {
          full_name:
            fullName.trim(),

          org_name:
            organisation.trim(),

          physical_address:
            address.trim(),

          postal_address:
            postalAddress.trim(),

          city:
            city.trim(),

          country:
            country.trim() ||
            'Zimbabwe',

          phone:
            phone.trim(),

          email:
            email.trim(),

          org_description:
            orgDescription.trim(),

          proposed_usage:
            proposedUsage.trim(),
        },
      });


      onClose();

    } catch (err) {

      console.error(
        'Domain assignment failed:',
        err
      );


      setError(
        err instanceof Error
          ? err.message
          : 'Unable to assign domain.'
      );

    } finally {
      setSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">

      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-2xl sm:rounded-2xl">

        {/* MODAL HEADER */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">

          <div>

            <h2 className="text-lg font-bold text-zinc-950">
              Assign domain
            </h2>

            <p className="mt-0.5 text-xs text-zinc-500">
              Add an already registered domain to this customer.
            </p>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={
              submitting
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>

        </div>


        <form
          onSubmit={submit}
          className="space-y-6 p-5"
        >

          {/* CUSTOMER */}
          <div className="rounded-xl bg-zinc-50 p-4">

            <p className="text-xs font-medium text-zinc-500">
              Assigning to
            </p>

            <p className="mt-1 font-semibold text-zinc-950">
              {customer.name ||
                'Customer'}
            </p>

            <p className="text-sm text-zinc-500">
              {customer.email}
            </p>

          </div>


          {/* DOMAIN */}
          <div>

            <h3 className="text-sm font-semibold text-zinc-950">
              Domain
            </h3>

            <div className="mt-3 grid gap-4 sm:grid-cols-2">

              <Field
                label="Domain name"
                value={domainName}
                onChange={
                  handleDomainChange
                }
                placeholder="example.org.zw"
                required
                className="sm:col-span-2"
              />

              <Field
                label="Registration price"
                value={
                  registrationPrice
                }
                onChange={
                  setRegistrationPrice
                }
                type="number"
                step="0.01"
                required
              />

              <Field
                label="Renewal price"
                value={
                  renewalPrice
                }
                onChange={
                  setRenewalPrice
                }
                type="number"
                step="0.01"
                required
              />

              <Field
                label="Registered date"
                value={
                  registeredAt
                }
                onChange={
                  setRegisteredAt
                }
                type="date"
                required
              />

              <Field
                label="Expiry date"
                value={
                  expiresAt
                }
                onChange={
                  setExpiresAt
                }
                type="date"
                required
              />

            </div>

          </div>


          {/* NAMESERVERS */}
          <div>

            <h3 className="text-sm font-semibold text-zinc-950">
              Nameservers
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              Enter the authoritative nameservers currently assigned to the domain.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <Field
                label="Primary nameserver"
                value={ns1}
                onChange={setNs1}
                placeholder="ns1.example.com"
                required
              />

              <Field
                label="Secondary nameserver"
                value={ns2}
                onChange={setNs2}
                placeholder="ns2.example.com"
                required
              />

              <Field
                label="Primary nameserver IP"
                value={ns1Ip}
                onChange={setNs1Ip}
                placeholder="148.163.100.131"
                required
              />

              <Field
                label="Secondary nameserver IP"
                value={ns2Ip}
                onChange={setNs2Ip}
                placeholder="148.163.100.132"
                required
              />

            </div>

          </div>


          {/* REGISTRANT */}
          <div>

            <h3 className="text-sm font-semibold text-zinc-950">
              Registrant details
            </h3>

            <p className="mt-1 text-xs text-zinc-500">
              These details will be stored as the domain owner information.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <Field
                label="Full name"
                value={fullName}
                onChange={
                  setFullName
                }
                required
              />

              <Field
                label="Organisation"
                required
                value={
                  organisation
                }
                onChange={
                  setOrganisation
                }
              />

              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                required
              />

              <Field
                label="Phone"
                value={phone}
                onChange={setPhone}
              />

              <Field
                label="Physical address"
                value={address}
                onChange={(value) => {
                  setAddress(
                    value
                  );

                  if (
                    postalSameAsPhysical
                  ) {
                    setPostalAddress(
                      value
                    );
                  }
                }}
                required
                className="sm:col-span-2"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Postal address"
                  value={
                    postalSameAsPhysical
                      ? address
                      : postalAddress
                  }
                  onChange={
                    setPostalAddress
                  }
                  required
                  disabled={
                    postalSameAsPhysical
                  }
                />

                <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={
                      postalSameAsPhysical
                    }
                    onChange={(event) => {
                      const checked =
                        event.target.checked;

                      setPostalSameAsPhysical(
                        checked
                      );

                      if (checked) {
                        setPostalAddress(
                          address
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-zinc-300 accent-[#3120ff]"
                  />
                  Postal address is the same as physical address
                </label>
              </div>

              <Field
                label="City"
                value={city}
                onChange={setCity}
              />

              <Field
                label="Country"
                value={country}
                onChange={
                  setCountry
                }
              />

              <Field
                label="Organisation / activity description"
                value={
                  orgDescription
                }
                onChange={
                  setOrgDescription
                }
                placeholder="e.g. Clothing retailer, school, software company"
                required
                className="sm:col-span-2"
              />

              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Proposed domain usage *
                </span>

                <select
                  value={
                    proposedUsage
                  }
                  onChange={(event) =>
                    setProposedUsage(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-[#3120ff]"
                >
                  <option value="">
                    Select how the domain will be used
                  </option>
                  <option value="Website">
                    Website
                  </option>
                  <option value="Web application">
                    Web application
                  </option>
                  <option value="Online store">
                    Online store
                  </option>
                  <option value="Email services">
                    Email services
                  </option>
                  <option value="API / developer service">
                    API / developer service
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </label>

            </div>

          </div>


          {/* ERROR */}
          {error && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
              {error}
            </div>
          )}


          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={onClose}
              disabled={
                submitting
              }
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting
              }
              className="rounded-xl bg-[#3120ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Assigning...'
                : 'Assign domain'}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};


const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  step,
  required = false,
  disabled = false,
  className = '',
}: {
  label: string;
  value: string;

  onChange:
    (value: string) =>
      void;

  type?: string;
  placeholder?: string;
  step?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) => {
  return (
    <label
      className={`block ${className}`}
    >

      <span className="mb-1.5 block text-xs font-medium text-zinc-600">
        {label}

        {required && (
          <span className="ml-0.5">
            *
          </span>
        )}
      </span>

      <input
        type={type}
        step={step}
        value={value}
        placeholder={
          placeholder
        }
        required={
          required
        }
        disabled={
          disabled
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#3120ff] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500"
      />

    </label>
  );
};


const StatCard = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;

  value:
    string | number;

  icon:
    React.ComponentType<{
      className?: string;
    }>;
}) => {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">

      <div className="flex items-center justify-between gap-2">

        <p className="text-xs font-medium text-zinc-500">
          {label}
        </p>

        <Icon className="h-4 w-4 text-[#3120ff]" />

      </div>

      <p className="mt-2 text-xl font-bold text-zinc-950">
        {value}
      </p>

    </div>
  );
};
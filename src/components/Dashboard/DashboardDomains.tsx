import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit3,
  Globe2,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import { useStore } from '../../context/StoreContext';
import {
  Domain,
  RegistrantDetails,
} from '../../types';
import { nameserverService } from '../../services/NameserverService';
import { getAuth } from 'firebase/auth';

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://runtime-api-my3q.onrender.com');

type ModalMode =
  | 'details'
  | 'nameservers'
  | 'owner'
  | 'cancel'
  | 'activity'
  | 'renew'
  | null;

const formatDate = (
  value?: string
) => {
  if (!value) return 'Not available yet';

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

const statusLabel = (
  status: string
) => {
  const labels: Record<
    string,
    string
  > = {
    active: 'Active',
    pending_payment:
      'Awaiting payment',
    pending_registration:
      'Registration processing',
    pending_transfer:
      'Transfer processing',
    pending_delete:
      'Cancellation requested',
    pending:
      'Processing',
    cancelled:
      'Cancelled',
    registry_rejected:
      'Registry rejected',
    replaced:
      'Replaced',
    expired:
      'Expired',
  };

  return (
    labels[status] ||
    status.replace(/_/g, ' ')
  );
};

const activityLabel = (
  action: string
) => {
  const labels: Record<
    string,
    string
  > = {
    NEW: 'Registration',
    MODIFY: 'Account update',
    DELETE: 'Cancellation',
    TRANSFER: 'Transfer',
    RENEWAL: 'Renewal',
    STATUS_CHANGE:
      'Status update',
  };

  return (
    labels[action] ||
    'Account update'
  );
};

const isRenewalOrder = (
  order: any
) =>
  String(
    order?.purpose ||
    order?.metadata?.purpose ||
    ''
  ) === 'domain_renewal';

const renewalLifecycleLabel = (
  domain: any
) => {
  const state =
    domain?.renewal_lifecycle?.state;

  const labels:
    Record<string, string> = {
      invoice_created:
        'Renewal invoice ready',
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

export const DashboardDomains: React.FC =
  () => {
    const {
      currentUser,
      domains,
      orders,
      setDashboardSubView,
      setRegistrationModalOpen,
      updateDomainNameservers,
      requestDomainModify,
      requestDomainDelete,
      requestDomainTransfer,
      renewDomain,
      showNotification,
    } = useStore();

    const [
      activeTab,
      setActiveTab,
    ] = useState<
      'domains' | 'transfer'
    >('domains');

    const [
      search,
      setSearch,
    ] = useState('');

    const [
      selectedDomain,
      setSelectedDomain,
    ] =
      useState<Domain | null>(
        null
      );

    const [
      modalMode,
      setModalMode,
    ] =
      useState<ModalMode>(
        null
      );

    const [
      editNameservers,
      setEditNameservers,
    ] = useState<string[]>([]);

    const [
      nameserverError,
      setNameserverError,
    ] =
      useState<string | null>(
        null
      );

    const [
      editNameserverIps,
      setEditNameserverIps,
    ] = useState<string[]>(
      ['', '', '', '']
    );

    const [
      savingNameservers,
      setSavingNameservers,
    ] = useState(false);

    const [
      editOwner,
      setEditOwner,
    ] =
      useState<RegistrantDetails | null>(
        null
      );

    const [
      savingOwner,
      setSavingOwner,
    ] = useState(false);

    const [
      cancelConfirm,
      setCancelConfirm,
    ] = useState('');

    const [
      cancellingDomain,
      setCancellingDomain,
    ] = useState(false);

    const [
      transferDomain,
      setTransferDomain,
    ] = useState('');

    const [
      transferAuthCode,
      setTransferAuthCode,
    ] = useState('');

    const [
      renewalYears,
      setRenewalYears,
    ] = useState(1);

    const [
      renewalGateway,
      setRenewalGateway,
    ] = useState<
      'ecocash_usd' |
      'pesepay'
    >('ecocash_usd');

    const [
      renewing,
      setRenewing,
    ] = useState(false);

    const userDomains =
      useMemo(
        () =>
          domains
            .filter(
              (domain) =>
                domain.user_id ===
                  currentUser?.id ||
                domain.user_email ===
                  currentUser?.email
            )
            .filter(
              (domain) => {
                if (
                  [
                    'cancelled',
                    'registry_rejected',
                    'replaced',
                  ].includes(
                    String(
                      domain.status
                    )
                  )
                ) {
                  return false;
                }

                if (
                  domain.status ===
                  'pending_payment'
                ) {
                  const linkedOrderId =
                    (domain as any)
                      .order_id;

                  const linkedOrder =
                    linkedOrderId
                      ? orders.find(
                          (order) =>
                            order.id ===
                            linkedOrderId
                        )
                      : null;

                  if (
                    linkedOrder &&
                    String(
                      linkedOrder.status
                    ) === 'cancelled'
                  ) {
                    return false;
                  }
                }

                return true;
              }
            )
            .filter(
              (domain) =>
                !search.trim() ||
                domain.domain_name
                  .toLowerCase()
                  .includes(
                    search
                      .trim()
                      .toLowerCase()
                  )
            ),
        [
          domains,
          orders,
          currentUser,
          search,
        ]
      );

    const pendingRenewalOrders =
      orders.filter(
        (order) =>
          isRenewalOrder(
            order
          ) &&
          (
            order.user_id ===
              currentUser?.id ||
            order.user_email ===
              currentUser?.email
          ) &&
          order.status ===
            'pending'
      );

    const renewalOrderForDomain =
      (domainId: string) =>
        pendingRenewalOrders.find(
          (order: any) =>
            String(
              order.domain_id ||
              order.metadata?.domain_id ||
              ''
            ) === domainId
        );

    const canModifyRegisteredDomain = (
      domain: Domain
    ) =>
      domain.status === 'active' ||
      domain.status === 'expired';

    const registrationPendingMessage =
      'Available after domain registration.';

    const openDetails = (
      domain: Domain
    ) => {
      setSelectedDomain(
        domain
      );
      setModalMode(
        'details'
      );
    };

    const openNameservers = (
      domain: Domain
    ) => {
      if (
        !canModifyRegisteredDomain(
          domain
        )
      ) {
        showNotification(
          'Nameservers can be changed after your domain is registered.',
          'info'
        );
        return;
      }

      const next = [
        ...domain.nameservers,
      ];

      while (
        next.length < 4
      ) {
        next.push('');
      }

      setSelectedDomain(
        domain
      );
      setEditNameservers(
        next
      );

      const nextIps = [
        ...(
          domain.nameserver_ips ||
          []
        ),
      ];

      while (
        nextIps.length < 4
      ) {
        nextIps.push('');
      }

      setEditNameserverIps(
        nextIps
      );

      setNameserverError(
        null
      );
      setModalMode(
        'nameservers'
      );
    };

    const saveNameservers =
      async () => {
        if (
          !selectedDomain ||
          savingNameservers
        ) {
          return;
        }

        if (
          !canModifyRegisteredDomain(
            selectedDomain
          )
        ) {
          setNameserverError(
            'Nameservers can be changed after your domain is registered.'
          );
          return;
        }

        const active =
          editNameservers
            .map((item) =>
              item
                .trim()
                .replace(/\.$/, '')
                .toLowerCase()
            )
            .filter(Boolean);

        const validation =
          nameserverService
            .validateNameservers(
              active
            );

        if (
          !validation.valid
        ) {
          setNameserverError(
            validation.error ||
              'Please check the nameservers.'
          );
          return;
        }

        try {
          setSavingNameservers(true);
          setNameserverError(null);

          const needsRegistryIps =
            selectedDomain
              .processing_type ===
              'zispa' ||
            selectedDomain
              .domain_name
              .toLowerCase()
              .endsWith('.co.zw');

          let resolvedIps:
            string[] = [];

          if (needsRegistryIps) {
            const authUser =
              getAuth()
                .currentUser;

            if (!authUser) {
              throw new Error(
                'Authentication required.'
              );
            }

            const token =
              await authUser
                .getIdToken();

            const response =
              await fetch(
                `${API_BASE_URL}/api/nameservers/resolve`,
                {
                  method:
                    'POST',
                  headers: {
                    'Content-Type':
                      'application/json',
                    Authorization:
                      `Bearer ${token}`,
                  },
                  body:
                    JSON.stringify({
                      nameservers:
                        active,
                    }),
                }
              );

            const body =
              await response
                .json()
                .catch(
                  () => ({})
                );

            if (
              !response.ok ||
              body?.success ===
                false
            ) {
              throw new Error(
                body?.message ||
                  'Unable to resolve the nameserver IP addresses.'
              );
            }

            const results =
              Array.isArray(
                body?.results
              )
                ? body.results
                : [];

            resolvedIps =
              active.map(
                (hostname) => {
                  const match =
                    results.find(
                      (
                        item: any
                      ) =>
                        String(
                          item?.hostname ||
                          ''
                        )
                          .toLowerCase() ===
                        hostname
                          .toLowerCase()
                    );

                  return String(
                    match?.ip ||
                    ''
                  ).trim();
                }
              );

            const missingIndex =
              resolvedIps.findIndex(
                (ip) =>
                  !ip
              );

            if (
              missingIndex !== -1
            ) {
              throw new Error(
                `Runtime could not resolve an IP address for ${active[missingIndex]}. Make sure the nameserver hostname has a public A or AAAA record, then try again.`
              );
            }

            setEditNameserverIps([
              ...resolvedIps,
              ...Array(
                Math.max(
                  0,
                  4 -
                    resolvedIps.length
                )
              ).fill(''),
            ]);
          }

          await updateDomainNameservers(
            selectedDomain.id,
            active,
            resolvedIps
          );

          setModalMode(
            null
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : '';

          const technicalPermissionError =
            /missing or insufficient permissions|permission[- ]denied|firebase/i.test(
              message
            );

          setNameserverError(
            technicalPermissionError
              ? canModifyRegisteredDomain(
                  selectedDomain
                )
                ? 'We could not save your nameserver change. Please try again.'
                : 'Nameservers can be changed after your domain is registered.'
              : message ||
                  'Unable to save the nameserver change.'
          );
        } finally {
          setSavingNameservers(
            false
          );
        }
      };

    const openOwner = (
      domain: Domain
    ) => {
      if (
        !canModifyRegisteredDomain(
          domain
        )
      ) {
        showNotification(
          'Owner details can be changed after your domain is registered.',
          'info'
        );
        return;
      }

      setSelectedDomain(
        domain
      );

      setEditOwner({
        ...domain.owner_details,
      });

      setModalMode(
        'owner'
      );
    };

    const saveOwner =
      async () => {
        if (
          !selectedDomain ||
          !editOwner ||
          savingOwner
        ) {
          return;
        }

        try {
          setSavingOwner(true);

          await requestDomainModify(
            selectedDomain.id,
            editOwner,
            selectedDomain.nameservers
          );

          setModalMode(
            null
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : '';

          showNotification(
            /missing or insufficient permissions|permission[- ]denied|firebase/i.test(
              message
            )
              ? 'We could not save the owner details. Please try again.'
              : message ||
                  'Unable to save the owner details.',
            'error'
          );
        } finally {
          setSavingOwner(false);
        }
      };

    const openCancel = (
      domain: Domain
    ) => {
      if (
        !canModifyRegisteredDomain(
          domain
        )
      ) {
        showNotification(
          'Domain cancellation is available after registration. Cancel the order instead if registration has not completed.',
          'info'
        );
        return;
      }

      setSelectedDomain(
        domain
      );
      setCancelConfirm(
        ''
      );
      setModalMode(
        'cancel'
      );
    };

    const confirmCancel =
      async () => {
        if (
          !selectedDomain ||
          cancellingDomain
        ) {
          return;
        }

        try {
          setCancellingDomain(
            true
          );

          await requestDomainDelete(
            selectedDomain.id,
            cancelConfirm
          );

          setModalMode(
            null
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : '';

          showNotification(
            /missing or insufficient permissions|permission[- ]denied|firebase/i.test(
              message
            )
              ? 'We could not submit the cancellation request. Please try again.'
              : message ||
                  'Unable to submit the cancellation request.',
            'error'
          );
        } finally {
          setCancellingDomain(
            false
          );
        }
      };

    const openRenewal = (
      domain: Domain
    ) => {
      if (
        domain.status ===
        'pending_registration'
      ) {
        showNotification(
          'This domain is still being registered.',
          'info'
        );
        return;
      }

      setSelectedDomain(
        domain
      );
      setRenewalYears(
        1
      );
      setRenewalGateway(
        'ecocash_usd'
      );
      setModalMode(
        'renew'
      );
    };

    const projectedExpiry =
      useMemo(() => {
        if (
          !selectedDomain
        ) {
          return null;
        }

        const now =
          new Date();

        const current =
          selectedDomain.expires_at
            ? new Date(
                selectedDomain.expires_at
              )
            : null;

        const base =
          current &&
          current.getTime() >
            now.getTime()
            ? new Date(
                current
              )
            : now;

        const next =
          new Date(base);

        next.setFullYear(
          next.getFullYear() +
            renewalYears
        );

        return next;
      }, [
        selectedDomain,
        renewalYears,
      ]);

    const renewalTotal =
      selectedDomain
        ? selectedDomain.renewal_price *
          renewalYears
        : 0;

    const completeRenewal =
      async () => {
        if (
          !selectedDomain
        ) {
          return;
        }

        if (
          renewalGateway ===
          'pesepay'
        ) {
          showNotification(
            'PesePay is not enabled yet.',
            'info'
          );
          return;
        }

        try {
          setRenewing(
            true
          );

          await renewDomain(
            selectedDomain.id,
            renewalYears,
            'ecocash_usd'
          );

          showNotification(
            'Renewal order created. Complete the EcoCash USD payment and send your screenshot to Runtime on WhatsApp.',
            'success'
          );

          setModalMode(
            null
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to renew this domain.',
            'error'
          );
        } finally {
          setRenewing(
            false
          );
        }
      };

    const submitTransfer =
      async (
        event: React.FormEvent
      ) => {
        event.preventDefault();

        if (
          !transferDomain.trim()
        ) {
          return;
        }

        try {
          await requestDomainTransfer(
            transferDomain.trim(),
            transferAuthCode.trim()
          );

          setTransferDomain(
            ''
          );
          setTransferAuthCode(
            ''
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to submit the transfer request.',
            'error'
          );
        }
      };

    return (
      <div className="space-y-6">

        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
              <Globe2 className="h-6 w-6 text-[#3120ff]" />
              My Domains
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Register, renew and manage your domain names.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setRegistrationModalOpen(
                true
              )
            }
            className="rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2819d9]"
          >
            Register New Domain
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveTab(
                'domains'
              )
            }
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              activeTab ===
              'domains'
                ? 'bg-[#3120ff] text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200'
            }`}
          >
            My Domains
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                'transfer'
              )
            }
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              activeTab ===
              'transfer'
                ? 'bg-[#3120ff] text-white'
                : 'bg-white text-zinc-600 ring-1 ring-zinc-200'
            }`}
          >
            Transfer a Domain
          </button>
        </div>

        {activeTab ===
        'domains' ? (
          <>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search your domains"
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#3120ff]"
              />
            </div>

            {pendingRenewalOrders.length >
              0 && (
              <button
                type="button"
                onClick={() =>
                  setDashboardSubView(
                    'billing'
                  )
                }
                className="mb-4 flex w-full items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left"
              >
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Renewal payment required
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    {pendingRenewalOrders.length}{' '}
                    renewal invoice
                    {pendingRenewalOrders.length ===
                    1
                      ? ''
                      : 's'}{' '}
                    awaiting payment.
                  </p>
                </div>

                <span className="text-xs font-bold text-[#3120ff]">
                  View billing
                </span>
              </button>
            )}

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {userDomains.length ===
              0 ? (
                <div className="px-6 py-14 text-center">
                  <Globe2 className="mx-auto h-7 w-7 text-zinc-300" />

                  <p className="mt-3 text-sm font-semibold text-zinc-950">
                    No domains found
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Your registered domains will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200">
                  {userDomains.map(
                    (domain) => (
                      <div
                        key={
                          domain.id
                        }
                        className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-5"
                      >
                        <div className="min-w-0">
                          <p className="break-all font-mono text-sm font-bold text-zinc-950">
                            {
                              domain.domain_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Registered:{' '}
                            {
                              formatDate(
                                domain.registered_at
                              )
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            Status
                          </p>

                          <p className="mt-1 text-xs font-semibold text-zinc-800">
                            {
                              statusLabel(
                                domain.status
                              )
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                            Renewal
                          </p>

                          <p className="mt-1 text-xs font-semibold text-zinc-800">
                            {
                              domain.expires_at
                                ? formatDate(
                                    domain.expires_at
                                  )
                                : 'Starts when active'
                            }
                          </p>

                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            $
                            {domain.renewal_price.toFixed(
                              2
                            )}
                            /year
                          </p>

                          {renewalLifecycleLabel(
                            domain as any
                          ) && (
                            <p className="mt-1 text-[10px] font-semibold text-amber-700">
                              {renewalLifecycleLabel(
                                domain as any
                              )}
                            </p>
                          )}

                          {renewalOrderForDomain(
                            domain.id
                          ) && (
                            <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                              {
                                renewalOrderForDomain(
                                  domain.id
                                )?.reference
                              }
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          {renewalOrderForDomain(
                            domain.id
                          ) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDashboardSubView(
                                  'billing'
                                )
                              }
                              className="rounded-lg bg-[#3120ff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2819d9]"
                            >
                              Pay renewal
                            </button>
                          ) : (
                            (domain.status ===
                              'active' ||
                              domain.status ===
                                'expired') && (
                              <button
                                type="button"
                                onClick={() =>
                                  openRenewal(
                                    domain
                                  )
                                }
                                className="rounded-lg bg-[#3120ff] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2819d9]"
                              >
                                Renew
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openDetails(
                                domain
                              )
                            }
                            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="max-w-xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <ArrowLeftRight className="mt-0.5 h-5 w-5 text-[#3120ff]" />

              <div>
                <h2 className="text-sm font-bold text-zinc-950">
                  Transfer a domain to Runtime
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Enter the domain and transfer code supplied by your current provider.
                </p>
              </div>
            </div>

            <form
              onSubmit={
                submitTransfer
              }
              className="mt-5 space-y-4"
            >
              <Field
                label="Domain name"
                value={
                  transferDomain
                }
                placeholder="example.com"
                onChange={
                  setTransferDomain
                }
              />

              <Field
                label="Transfer code"
                value={
                  transferAuthCode
                }
                placeholder="Authorization code"
                onChange={
                  setTransferAuthCode
                }
              />

              <button
                type="submit"
                className="rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9]"
              >
                Start Transfer
              </button>
            </form>
          </div>
        )}

        {modalMode ===
          'details' &&
          selectedDomain && (
            <Modal
              title={
                selectedDomain.domain_name
              }
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Info
                  label="Status"
                  value={statusLabel(
                    selectedDomain.status
                  )}
                />

                <Info
                  label="Registered"
                  value={formatDate(
                    selectedDomain.registered_at
                  )}
                />

                <Info
                  label="Renews"
                  value={
                    selectedDomain.expires_at
                      ? formatDate(
                          selectedDomain.expires_at
                        )
                      : 'Starts when registration is completed'
                  }
                />

                <Info
                  label="Renewal price"
                  value={`$${selectedDomain.renewal_price.toFixed(
                    2
                  )} / year`}
                />
              </div>

              <div className="mt-5 rounded-xl border border-zinc-200 p-4">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-[#3120ff]" />
                  <p className="text-xs font-bold text-zinc-950">
                    Nameservers
                  </p>
                </div>

                <div className="mt-3 space-y-1">
                  {selectedDomain.nameservers.map(
                    (
                      item
                    ) => (
                      <p
                        key={
                          item
                        }
                        className="break-all font-mono text-xs text-zinc-600"
                      >
                        {
                          item
                        }
                      </p>
                    )
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {(selectedDomain.status ===
                  'active' ||
                  selectedDomain.status ===
                    'expired') && (
                  <ActionButton
                    icon={
                      RefreshCw
                    }
                    label="Renew Domain"
                    onClick={() =>
                      openRenewal(
                        selectedDomain
                      )
                    }
                  />
                )}

                {canModifyRegisteredDomain(
                  selectedDomain
                ) ? (
                  <ActionButton
                    icon={
                      Server
                    }
                    label="Change Nameservers"
                    onClick={() =>
                      openNameservers(
                        selectedDomain
                      )
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-zinc-500">
                    <Server className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-700">
                        Change Nameservers
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">
                        {registrationPendingMessage}
                      </p>
                    </div>
                  </div>
                )}

                <ActionButton
                  icon={
                    UserRound
                  }
                  label="Update Owner Details"
                  onClick={() =>
                    openOwner(
                      selectedDomain
                    )
                  }
                />

                <ActionButton
                  icon={
                    Clock3
                  }
                  label="Activity"
                  onClick={() =>
                    setModalMode(
                      'activity'
                    )
                  }
                />

                {canModifyRegisteredDomain(
                  selectedDomain
                ) ? (
                  <ActionButton
                    icon={
                      Trash2
                    }
                    label="Request Cancellation"
                    danger
                    onClick={() =>
                      openCancel(
                        selectedDomain
                      )
                    }
                  />
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left text-xs text-zinc-500">
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold text-zinc-700">
                        Request Cancellation
                      </p>
                      <p className="mt-0.5 text-[10px] leading-4 text-zinc-500">
                        Available after domain registration. Cancel the order instead while registration is pending.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Modal>
          )}

        {modalMode ===
          'renew' &&
          selectedDomain && (
            <Modal
              title={`Renew ${selectedDomain.domain_name}`}
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Info
                  label="Current renewal date"
                  value={
                    selectedDomain.expires_at
                      ? formatDate(
                          selectedDomain.expires_at
                        )
                      : 'Not available'
                  }
                />

                <Info
                  label="Renewal rate"
                  value={`$${selectedDomain.renewal_price.toFixed(
                    2
                  )} / year`}
                />
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Number of years
                </label>

                <select
                  value={
                    renewalYears
                  }
                  onChange={(
                    event
                  ) =>
                    setRenewalYears(
                      Number(
                        event.target.value
                      )
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                >
                  {[
                    1, 2, 3, 4, 5,
                  ].map(
                    (
                      years
                    ) => (
                      <option
                        key={
                          years
                        }
                        value={
                          years
                        }
                      >
                        {
                          years
                        }{' '}
                        {years ===
                        1
                          ? 'year'
                          : 'years'}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
                <Summary
                  label="New renewal date"
                  value={
                    projectedExpiry
                      ? projectedExpiry.toLocaleDateString()
                      : '—'
                  }
                />

                <Summary
                  label="Total"
                  value={`$${renewalTotal.toFixed(
                    2
                  )} USD`}
                  strong
                />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-zinc-700">
                  Payment method
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRenewalGateway(
                        'ecocash_usd'
                      )
                    }
                    className={`rounded-xl border p-3 text-left transition ${
                      renewalGateway ===
                      'ecocash_usd'
                        ? 'border-[#3120ff] bg-[#3120ff]/5'
                        : 'border-zinc-200 bg-white'
                    }`}
                  >
                    <p className="text-xs font-semibold text-zinc-950">
                      EcoCash USD
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                      Manual payment. Payment is verified by Runtime before your renewal date changes.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-left opacity-50"
                  >
                    <p className="text-xs font-semibold text-zinc-950">
                      PesePay
                    </p>

                    <p className="mt-1 text-[11px] leading-4 text-zinc-500">
                      Online payment coming shortly.
                    </p>
                  </button>
                </div>

                {renewalGateway ===
                  'ecocash_usd' && (
                  <div className="mt-3 rounded-xl border border-[#3120ff]/15 bg-[#3120ff]/5 p-3">
                    <p className="text-xs font-semibold text-zinc-950">
                      EcoCash USD
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                      After creating the renewal order, send the exact amount to 0783827570, Ngaavongwe Ndasowampange, then send your screenshot to Runtime on WhatsApp. The renewal will only be applied after payment is confirmed.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={
                    completeRenewal
                  }
                  disabled={
                    renewing
                  }
                  className="rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] disabled:opacity-50"
                >
                  {renewing
                    ? 'Creating order...'
                    : `Create Renewal Order · $${renewalTotal.toFixed(
                        2
                      )}`}
                </button>
              </div>
            </Modal>
          )}

        {modalMode ===
          'nameservers' &&
          selectedDomain && (
            <Modal
              title="Change Nameservers"
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              <div className="space-y-3">
                {editNameservers.map(
                  (
                    value,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                    >
                      <Field
                        label={`Nameserver ${index + 1}${index < 2 ? ' *' : ''}`}
                        value={
                          value
                        }
                        placeholder={`ns${index + 1}.example.com`}
                        onChange={(
                          next
                        ) => {
                          const copy = [
                            ...editNameservers,
                          ];

                          copy[
                            index
                          ] =
                            next;

                          setEditNameservers(
                            copy
                          );
                        }}
                      />
                    </div>
                  )
                )}

                {(selectedDomain.processing_type ===
                  'zispa' ||
                  selectedDomain.domain_name
                    .toLowerCase()
                    .endsWith('.co.zw')) && (
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] leading-5 text-zinc-500">
                    Runtime will automatically resolve the IP address for every nameserver when you save. You only need to enter the nameserver hostnames.
                  </p>
                )}

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-amber-900">
                    DNS propagation
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-amber-800">
                    After saving, nameserver changes may take up to 24 hours to fully propagate and become active.
                  </p>
                </div>
              </div>

              {nameserverError && (
                <div className="mt-4 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {
                    nameserverError
                  }
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={
                    saveNameservers
                  }
                  disabled={
                    savingNameservers
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingNameservers && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}

                  {savingNameservers
                    ? 'Resolving & saving...'
                    : 'Save Changes'}
                </button>
              </div>
            </Modal>
          )}

        {modalMode ===
          'owner' &&
          selectedDomain &&
          editOwner && (
            <Modal
              title="Update Owner Details"
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  [
                    'Full name',
                    'full_name',
                  ],
                  [
                    'Organisation',
                    'org_name',
                  ],
                  [
                    'Physical address',
                    'physical_address',
                  ],
                  [
                    'Postal address',
                    'postal_address',
                  ],
                  [
                    'Town / City',
                    'city',
                  ],
                  [
                    'Country',
                    'country',
                  ],
                  [
                    'Phone',
                    'phone',
                  ],
                  [
                    'Email',
                    'email',
                  ],
                  [
                    'Organisation / activity',
                    'org_description',
                  ],
                  [
                    'Proposed use',
                    'proposed_usage',
                  ],
                ].map(
                  ([
                    label,
                    key,
                  ]) => (
                    <Field
                      key={
                        key
                      }
                      label={
                        label
                      }
                      value={
                        String(
                          editOwner[
                            key as keyof RegistrantDetails
                          ] ||
                            ''
                        )
                      }
                      onChange={(
                        value
                      ) =>
                        setEditOwner(
                          {
                            ...editOwner,
                            [key]:
                              value,
                          }
                        )
                      }
                    />
                  )
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={
                    saveOwner
                  }
                  disabled={
                    savingOwner
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingOwner && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}

                  {savingOwner
                    ? 'Saving...'
                    : 'Submit Update'}
                </button>
              </div>
            </Modal>
          )}

        {modalMode ===
          'cancel' &&
          selectedDomain && (
            <Modal
              title="Request Domain Cancellation"
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <div className="flex gap-2">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600" />

                  <p className="text-xs leading-5 text-rose-800">
                    This can make the domain stop working. Type the domain name below to confirm your request.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <Field
                  label="Domain name"
                  value={
                    cancelConfirm
                  }
                  placeholder={
                    selectedDomain.domain_name
                  }
                  onChange={
                    setCancelConfirm
                  }
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={
                    cancellingDomain ||
                    cancelConfirm
                      .trim()
                      .toLowerCase() !==
                    selectedDomain.domain_name.toLowerCase()
                  }
                  onClick={
                    confirmCancel
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cancellingDomain && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}

                  {cancellingDomain
                    ? 'Submitting...'
                    : 'Request Cancellation'}
                </button>
              </div>
            </Modal>
          )}

        {modalMode ===
          'activity' &&
          selectedDomain && (
            <Modal
              title="Domain Activity"
              onClose={() =>
                setModalMode(
                  null
                )
              }
            >
              {selectedDomain.history.length ===
              0 ? (
                <p className="text-xs text-zinc-500">
                  No activity recorded yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {[...selectedDomain.history]
                    .reverse()
                    .map(
                      (
                        item
                      ) => (
                        <div
                          key={
                            item.id
                          }
                          className="rounded-xl border border-zinc-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold text-zinc-950">
                              {
                                activityLabel(
                                  item.action
                                )
                              }
                            </p>

                            <p className="text-[10px] text-zinc-400">
                              {new Date(
                                item.created_at
                              ).toLocaleString()}
                            </p>
                          </div>

                          <p className="mt-2 text-xs leading-5 text-zinc-600">
                            {
                              item.description
                                .replace(
                                  /\bN\/M\/D\/T\b/gi,
                                  'domain update'
                                )
                                .replace(
                                  /\bAction\s+[NMDT]\b/gi,
                                  'Domain update'
                                )
                                .replace(
                                  /\bZISPA\b/gi,
                                  'registration service'
                                )
                            }
                          </p>
                        </div>
                      )
                    )}
                </div>
              )}
            </Modal>
          )}
      </div>
    );
  };

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:p-4">
    <div className="flex h-full items-end justify-center sm:items-center">
      <div className="flex max-h-dvh w-full flex-col overflow-hidden bg-white sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
          <h3 className="min-w-0 truncate text-base font-bold text-zinc-950">
            {title}
          </h3>

          <button
            type="button"
            onClick={
              onClose
            }
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const Field: React.FC<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({
  label,
  value,
  placeholder,
  onChange,
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
      {label}
    </label>

    <input
      value={
        value
      }
      onChange={(
        event
      ) =>
        onChange(
          event.target.value
        )
      }
      placeholder={
        placeholder
      }
      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
    />
  </div>
);

const Info: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => (
  <div className="rounded-xl border border-zinc-200 p-4">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
      {label}
    </p>

    <p className="mt-1 text-sm font-semibold text-zinc-950">
      {value}
    </p>
  </div>
);

const Summary: React.FC<{
  label: string;
  value: string;
  strong?: boolean;
}> = ({
  label,
  value,
  strong,
}) => (
  <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-3 last:border-0">
    <span className="text-xs text-zinc-500">
      {label}
    </span>

    <span
      className={`text-right ${
        strong
          ? 'text-base font-bold text-[#3120ff]'
          : 'text-xs font-semibold text-zinc-950'
      }`}
    >
      {value}
    </span>
  </div>
);

const ActionButton: React.FC<{
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({
  icon: Icon,
  label,
  onClick,
  danger,
}) => (
  <button
    type="button"
    onClick={
      onClick
    }
    className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition ${
      danger
        ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);
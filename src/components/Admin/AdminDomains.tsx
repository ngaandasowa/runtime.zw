import React, {
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  Clock3,
  Globe2,
  Network,
  Play,
  RefreshCw,
  Search,
  Pencil,
  Save,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  DomainStatus,
} from '../../types';

import { AdminRuntimeDnsManager } from './AdminRuntimeDnsManager';
import { RuntimeDnsMigration } from '../dns/RuntimeDnsMigration';

const STATUS_LABELS:
  Record<string, string> = {
    pending_payment:
      'Awaiting payment',
    pending_registration:
      'Registration processing',
    pending_transfer:
      'Transfer processing',
    pending_delete:
      'Cancellation processing',
    active:
      'Active',
    cancelled:
      'Cancelled',
    registry_rejected:
      'Registry rejected',
    replaced:
      'Replaced',
    expired:
      'Expired',
  };

const lifecycleLabel = (
  domain: any
) => {
  const state =
    domain?.renewal_lifecycle?.state;

  const labels:
    Record<string, string> = {
      invoice_created:
        'Renewal invoice created',
      expired:
        'Expired · grace period',
      grace_period_ended:
        'Grace period ended',
    };

  return state
    ? labels[state] ||
        String(state).replace(/_/g, ' ')
    : 'No lifecycle action yet';
};

export const AdminDomains:
  React.FC = () => {
    const {
      domains,
      updateDomainStatus,
      showNotification,
      setAdminSubView,
    } = useStore();

    const [
      search,
      setSearch,
    ] = useState('');

    const [
      statusFilter,
      setStatusFilter,
    ] = useState('ALL');

    const [
      simulatedDate,
      setSimulatedDate,
    ] = useState(
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    const [
      lifecycleRunning,
      setLifecycleRunning,
    ] = useState(false);

    const [
      lifecycleResult,
      setLifecycleResult,
    ] = useState<any>(null);

    const [
      editingDomain,
      setEditingDomain,
    ] = useState<any | null>(
      null
    );

    const [
      editSaving,
      setEditSaving,
    ] = useState(false);

    const [
      editError,
      setEditError,
    ] = useState('');

    const [dnsDomain, setDnsDomain] = useState<any | null>(null);
    const [dnsMigrationDomain, setDnsMigrationDomain] = useState<any | null>(null);
    const [reconcilingDnsId, setReconcilingDnsId] = useState<string | null>(null);

    const [
      editOwner,
      setEditOwner,
    ] = useState<any>({});

    const [
      editNameservers,
      setEditNameservers,
    ] = useState<string[]>([
      '',
      '',
      '',
      '',
    ]);

    const [
      editNameserverIps,
      setEditNameserverIps,
    ] = useState<string[]>([
      '',
      '',
      '',
      '',
    ]);

    const [
      editRegistrantType,
      setEditRegistrantType,
    ] = useState<
      'myself' | 'client'
    >('myself');

    const [
      editRenewalPrice,
      setEditRenewalPrice,
    ] = useState('');

    const [
      editRegisteredAt,
      setEditRegisteredAt,
    ] = useState('');

    const [
      editExpiresAt,
      setEditExpiresAt,
    ] = useState('');

    const [
      editAutoRenew,
      setEditAutoRenew,
    ] = useState(true);

    const isRuntimeDns = (domain: any) =>
      String(domain?.dns_provider || '').toLowerCase() === 'cloudflare' &&
      Boolean(domain?.cloudflare?.zone_id);

    const dnsProviderLabel = (domain: any) => {
      if (isRuntimeDns(domain)) return 'Runtime DNS';
      const nameservers = Array.isArray(domain?.nameservers) ? domain.nameservers.map((item: any) => String(item).toLowerCase()) : [];
      return nameservers.length ? 'Custom DNS' : 'Not configured';
    };

    const canMoveToRuntimeDns = (domain: any) =>
      ['active', 'expired'].includes(String(domain?.status || '')) &&
      !isRuntimeDns(domain);

    /*
     * Recovery is intentionally offered only for domains Runtime currently
     * considers external/custom. The backend performs the real safety checks:
     * existing Runtime Cloudflare zone + Active + public NS exact match.
     */
    const canReconcileRuntimeDns = (domain: any) =>
      ['active', 'expired'].includes(
        String(domain?.status || '')
      ) &&
      !isRuntimeDns(domain);

    const reconcileRuntimeDns =
      async (domain: any) => {
        if (reconcilingDnsId) return;

        const confirmed =
          window.confirm(
            `Reconcile Runtime DNS for ${domain.domain_name}?\n\nRuntime will verify Cloudflare is Active and independently verify the domain's public authoritative nameservers. No registry or nameserver change will be made.`
          );

        if (!confirmed) return;

        try {
          setReconcilingDnsId(domain.id);

          const { getAuth } =
            await import('firebase/auth');
          const user =
            getAuth().currentUser;

          if (!user) {
            throw new Error(
              'Authentication required.'
            );
          }

          const token =
            await user.getIdToken();

          const apiBase =
            import.meta.env
              .VITE_API_BASE_URL ||
            (import.meta.env.DEV
              ? 'http://localhost:4000'
              : 'https://api.runtime.co.zw');

          const response =
            await fetch(
              `${apiBase}/api/dns/cloudflare/reconcile`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                  Authorization:
                    `Bearer ${token}`,
                },
                body: JSON.stringify({
                  domainId: domain.id,
                }),
              }
            );

          const body =
            await response
              .json()
              .catch(() => ({}));

          if (
            !response.ok ||
            body?.success === false
          ) {
            throw new Error(
              body?.message ||
                'Unable to reconcile Runtime DNS.'
            );
          }

          showNotification(
            `${domain.domain_name} is now correctly recognised as Runtime DNS. Refreshing domain state…`,
            'success'
          );

          /*
           * Domain data is supplied by StoreContext listeners/loading.
           * Reload once after a successful admin recovery so both admin
           * and all derived UI state are rebuilt from Firestore.
           */
          window.setTimeout(
            () =>
              window.location.reload(),
            650
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to reconcile Runtime DNS.',
            'error'
          );
        } finally {
          setReconcilingDnsId(null);
        }
      };

    const openDomainEditor =
      (domain: any) => {
        setEditingDomain(
          domain
        );

        setEditOwner({
          full_name:
            domain
              .owner_details
              ?.full_name ||
            '',
          org_name:
            domain
              .owner_details
              ?.org_name ||
            '',
          physical_address:
            domain
              .owner_details
              ?.physical_address ||
            '',
          postal_address:
            domain
              .owner_details
              ?.postal_address ||
            '',
          city:
            domain
              .owner_details
              ?.city ||
            '',
          country:
            domain
              .owner_details
              ?.country ||
            'Zimbabwe',
          phone:
            domain
              .owner_details
              ?.phone ||
            '',
          email:
            domain
              .owner_details
              ?.email ||
            domain.user_email ||
            '',
          org_description:
            domain
              .owner_details
              ?.org_description ||
            '',
          proposed_usage:
            domain
              .owner_details
              ?.proposed_usage ||
            '',
        });

        const ns = [
          ...(domain
            .nameservers ||
          []),
        ];

        while (
          ns.length < 4
        ) {
          ns.push('');
        }

        setEditNameservers(
          ns.slice(0, 4)
        );

        const ips = [
          ...(domain
            .nameserver_ips ||
          []),
        ];

        while (
          ips.length < 4
        ) {
          ips.push('');
        }

        setEditNameserverIps(
          ips.slice(0, 4)
        );

        setEditRegistrantType(
          domain
            .registrant_type ===
          'client'
            ? 'client'
            : 'myself'
        );

        setEditRenewalPrice(
          String(
            domain
              .renewal_price ??
            ''
          )
        );

        setEditRegisteredAt(
          domain
            .registered_at
            ? String(
                domain
                  .registered_at
              ).slice(
                0,
                10
              )
            : ''
        );

        setEditExpiresAt(
          domain
            .expires_at
            ? String(
                domain
                  .expires_at
              ).slice(
                0,
                10
              )
            : ''
        );

        setEditAutoRenew(
          domain.auto_renew !==
          false
        );

        setEditError('');
      };

    const saveDomainEditor =
      async () => {
        if (
          !editingDomain ||
          editSaving
        ) {
          return;
        }

        try {
          setEditSaving(true);
          setEditError('');

          const { getAuth } =
            await import(
              'firebase/auth'
            );

          const user =
            getAuth()
              .currentUser;

          if (!user) {
            throw new Error(
              'Authentication required.'
            );
          }

          const token =
            await user
              .getIdToken();

          const response =
            await fetch(
              `${API_BASE_URL}/api/transfers/admin/domain-details`,
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
                    domainId:
                      editingDomain.id,
                    ownerDetails:
                      editOwner,
                    registrantType:
                      editRegistrantType,
                    nameservers:
                      editNameservers
                        .map(
                          (item) =>
                            item
                              .trim()
                              .toLowerCase()
                        )
                        .filter(Boolean),
                    nameserverIps:
                      editNameserverIps
                        .slice(
                          0,
                          editNameservers
                            .filter(
                              (item) =>
                                item
                                  .trim()
                            )
                            .length
                        ),
                    renewalPrice:
                      editRenewalPrice,
                    registeredAt:
                      editRegisteredAt
                        ? new Date(
                            `${editRegisteredAt}T00:00:00.000Z`
                          )
                            .toISOString()
                        : null,
                    expiresAt:
                      editExpiresAt
                        ? new Date(
                            `${editExpiresAt}T00:00:00.000Z`
                          )
                            .toISOString()
                        : null,
                    autoRenew:
                      editAutoRenew,
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
              'Unable to update the domain.'
            );
          }

          showNotification(
            `${editingDomain.domain_name} updated successfully.`,
            'success'
          );

          setEditingDomain(
            null
          );

          window.setTimeout(
            () =>
              window.location
                .reload(),
            300
          );
        } catch (error) {
          setEditError(
            error instanceof Error
              ? error.message
              : 'Unable to update the domain.'
          );
        } finally {
          setEditSaving(false);
        }
      };

    const API_BASE_URL =
      import.meta.env
        .VITE_API_BASE_URL ||
      (import.meta.env.DEV
        ? 'http://localhost:4000'
        : '');

    const runRenewalLifecycle =
      async () => {
        try {
          setLifecycleRunning(true);
          setLifecycleResult(null);

          const { getAuth } =
            await import(
              'firebase/auth'
            );

          const user =
            getAuth().currentUser;

          if (!user) {
            throw new Error(
              'Authentication required.'
            );
          }

          const token =
            await user.getIdToken();

          const response =
            await fetch(
              `${API_BASE_URL}/api/renewals/admin/run`,
              {
                method: 'POST',
                headers: {
                  'Content-Type':
                    'application/json',
                  Authorization:
                    `Bearer ${token}`,
                },
                body:
                  JSON.stringify({
                    simulatedDate,
                  }),
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
              'Unable to run renewal lifecycle.'
            );
          }

          setLifecycleResult(body);

          showNotification(
            `Renewal lifecycle test completed for ${simulatedDate}.`,
            'success'
          );
        } catch (error) {
          showNotification(
            error instanceof Error
              ? error.message
              : 'Unable to run renewal lifecycle.',
            'error'
          );
        } finally {
          setLifecycleRunning(false);
        }
      };

    const filtered =
      useMemo(
        () =>
          domains.filter(
            (domain) => {
              const archived =
                [
                  'cancelled',
                  'registry_rejected',
                  'replaced',
                ].includes(
                  String(
                    domain.status
                  )
                );

              if (
                statusFilter ===
                  'ALL' &&
                archived
              ) {
                return false;
              }

              if (
                statusFilter ===
                  'ARCHIVED' &&
                !archived
              ) {
                return false;
              }

              if (
                statusFilter !==
                  'ALL' &&
                statusFilter !==
                  'ARCHIVED' &&
                domain.status !==
                  statusFilter
              ) {
                return false;
              }

              const value =
                search
                  .trim()
                  .toLowerCase();

              if (!value) {
                return true;
              }

              return (
                domain.domain_name
                  .toLowerCase()
                  .includes(value) ||
                domain.user_email
                  .toLowerCase()
                  .includes(value)
              );
            }
          ),
        [
          domains,
          search,
          statusFilter,
        ]
      );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
            Domains
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            All customer domains and their current processing state.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-amber-700" />
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  Renewal lifecycle test
                </p>
              </div>

              <p className="mt-2 text-xs leading-5 text-amber-900/80">
                Production renewals are scheduled automatically. This panel remains available only for controlled lifecycle simulation and testing.
              </p>

              <p className="mt-1 text-[11px] leading-5 text-amber-800/70">
                Milestones: D-60, D-30, D-14 invoice, D-7 unpaid reminder, D0 expiry, D+7 grace-period end. Re-running an already completed milestone will not create another renewal order or send the same reminder again.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
              <input
                type="date"
                value={simulatedDate}
                onChange={(event) =>
                  setSimulatedDate(
                    event.target.value
                  )
                }
                className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-800 outline-none focus:border-amber-500"
              />

              <button
                type="button"
                onClick={
                  runRenewalLifecycle
                }
                disabled={
                  lifecycleRunning ||
                  !simulatedDate
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lifecycleRunning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {lifecycleRunning
                  ? 'Running...'
                  : 'Run test'}
              </button>
            </div>
          </div>

          {lifecycleResult && (
            <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-amber-100 px-4 py-3 text-[11px] text-zinc-600">
                <span>
                  Scanned: <strong className="text-zinc-950">{lifecycleResult.scanned}</strong>
                </span>
                <span>
                  Matched: <strong className="text-zinc-950">{lifecycleResult.matched}</strong>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    window.location.reload()
                  }
                  className="ml-auto font-bold text-[#3120ff]"
                >
                  Reload domain data
                </button>
              </div>

              {lifecycleResult.results?.length ? (
                <div className="divide-y divide-zinc-100">
                  {lifecycleResult.results.map(
                    (item: any) => (
                      <div
                        key={`${item.domainId}-${item.milestone}-${item.action}`}
                        className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)] sm:items-center"
                      >
                        <span className="font-mono font-bold text-zinc-950">
                          {item.domainName}
                        </span>
                        <span className="font-semibold uppercase text-zinc-500">
                          {item.milestone || '-'}
                        </span>
                        <span className="text-zinc-600">
                          {String(item.action).replace(/_/g, ' ')}
                        </span>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="px-4 py-4 text-xs text-zinc-500">
                  No domains matched a lifecycle milestone on this simulated date.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <select
            value={
              statusFilter
            }
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none"
          >
            <option value="ALL">
              Current domains
            </option>

            <option value="ARCHIVED">
              Archived / rejected / cancelled
            </option>

            <option value="pending_payment">
              Awaiting payment
            </option>

            <option value="pending_registration">
              Registration processing
            </option>

            <option value="active">
              Active
            </option>

            <option value="pending_transfer">
              Transfer processing
            </option>

            <option value="pending_delete">
              Cancellation processing
            </option>

            <option value="cancelled">
              Cancelled
            </option>

            <option value="registry_rejected">
              Registry rejected
            </option>

            <option value="replaced">
              Replaced
            </option>

            <option value="expired">
              Expired
            </option>
          </select>

          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search domain or customer"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#3120ff]"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {filtered.length ===
          0 ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">
              No matching domains.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map(
                (domain) => {
                  const waitingForPayment =
                    domain.status ===
                    'pending_payment';

                  return (
                    <div
                      key={
                        domain.id
                      }
                      className="p-5"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-mono text-sm font-bold text-zinc-950">
                              {
                                domain.domain_name
                              }
                            </p>

                            <DomainBadge
                              status={
                                domain.status
                              }
                            />
                          </div>

                          <p className="mt-1 text-xs text-zinc-500">
                            {
                              domain.user_email
                            }
                          </p>

                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                            <Info
                              label="Nameservers"
                              value={
                                domain.nameservers
                                  .slice(
                                    0,
                                    2
                                  )
                                  .join(
                                    ', '
                                  ) ||
                                'Not set'
                              }
                              mono
                            />

                            <Info
                              label="Registered"
                              value={
                                domain.registered_at
                                  ? new Date(
                                      domain.registered_at
                                    ).toLocaleDateString()
                                  : 'Not yet'
                              }
                            />

                            <Info
                              label="Renewal"
                              value={
                                domain.expires_at
                                  ? new Date(
                                      domain.expires_at
                                    ).toLocaleDateString()
                                  : 'Not yet'
                              }
                            />

                            <Info
                              label="DNS provider"
                              value={dnsProviderLabel(domain as any)}
                            />

                            <Info
                              label="DNS status"
                              value={isRuntimeDns(domain) ? String((domain as any).dns_status || (domain as any).cloudflare?.status || 'pending').replace(/_/g, ' ') : 'External'}
                            />

                            <Info
                              label="Renewal lifecycle"
                              value={
                                lifecycleLabel(
                                  domain as any
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {isRuntimeDns(domain) && (
                            <button
                              type="button"
                              onClick={() => setDnsDomain(domain)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 px-3 py-2.5 text-xs font-bold text-[#3120ff] hover:bg-[#3120ff]/10"
                            >
                              <Network className="h-4 w-4" />
                              Manage DNS
                            </button>
                          )}

                          {canMoveToRuntimeDns(domain) && (
                            <button type="button" onClick={() => setDnsMigrationDomain(domain)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
                              <Network className="h-4 w-4" />
                              Move to Runtime DNS
                            </button>
                          )}

                          {canReconcileRuntimeDns(domain) && (
                            <button
                              type="button"
                              disabled={reconcilingDnsId === domain.id}
                              onClick={() => void reconcileRuntimeDns(domain)}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Verify Cloudflare and the public delegation, then repair stale Runtime DNS state"
                            >
                              <RefreshCw
                                className={
                                  reconcilingDnsId === domain.id
                                    ? 'h-4 w-4 animate-spin'
                                    : 'h-4 w-4'
                                }
                              />
                              {reconcilingDnsId === domain.id
                                ? 'Checking DNS…'
                                : 'Reconcile Runtime DNS'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openDomainEditor(
                                domain
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit domain
                          </button>

                          {waitingForPayment ? (
                            <button
                              type="button"
                              onClick={() =>
                                setAdminSubView(
                                  'orders'
                                )
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 px-4 py-2.5 text-xs font-bold text-[#3120ff]"
                            >
                              <Clock3 className="h-4 w-4" />
                              Review Payment
                            </button>
                          ) : (
                          <select
                            value={
                              domain.status
                            }
                            onChange={async (event) => {
                              const status =
                                event.target.value as
                                  DomainStatus;

                              try {
                                await updateDomainStatus(
                                  domain.id,
                                  status
                                );
                              } catch (error) {
                                showNotification(
                                  error instanceof Error
                                    ? error.message
                                    : 'Unable to save the domain status.',
                                  'error'
                                );
                              }
                            }}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold outline-none"
                          >
                            <option value="pending_registration">
                              Registration processing
                            </option>

                            <option value="active">
                              Active
                            </option>

                            <option value="pending_transfer">
                              Transfer processing
                            </option>

                            <option value="pending_delete">
                              Cancellation processing
                            </option>

                            <option value="cancelled">
                              Cancelled
                            </option>

                            <option value="registry_rejected">
                              Registry rejected
                            </option>

                            <option value="expired">
                              Expired
                            </option>
                          </select>
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

        {dnsMigrationDomain && (
          <RuntimeDnsMigration
            domain={dnsMigrationDomain}
            actor="admin"
            onClose={() => setDnsMigrationDomain(null)}
          />
        )}

        {dnsDomain && (
          <AdminRuntimeDnsManager
            domain={dnsDomain}
            onClose={() => setDnsDomain(null)}
          />
        )}

        {editingDomain && (
          <div className="fixed inset-0 z-50 bg-black/40 p-4">
            <div className="mx-auto flex max-h-[94vh] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <p className="text-xs font-bold text-[#3120ff]">
                    Registrar correction
                  </p>
                  <h2 className="mt-1 font-mono text-base font-bold text-zinc-950">
                    {editingDomain.domain_name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingDomain(
                      null
                    )
                  }
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold text-amber-950">
                    ZISPA data correction
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-800">
                    Use this editor to correct the legal/current domain owner information and nameservers before a registry submission. For client registrations, the owner details should describe the client, not necessarily the Runtime account holder.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ['Full applicant name', 'full_name'],
                    ['Organisation name', 'org_name'],
                    ['Full physical address', 'physical_address'],
                    ['Postal address', 'postal_address'],
                    ['Town / City', 'city'],
                    ['Country', 'country'],
                    ['Phone', 'phone'],
                    ['Email', 'email'],
                    ['Organisation / activity', 'org_description'],
                    ['Proposed domain use', 'proposed_usage'],
                  ].map(
                    ([
                      label,
                      key,
                    ]) => (
                      <label
                        key={key}
                        className="block"
                      >
                        <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                          {label}
                        </span>

                        <input
                          value={
                            String(
                              editOwner[
                                key
                              ] ||
                              ''
                            )
                          }
                          onChange={(event) =>
                            setEditOwner(
                              {
                                ...editOwner,
                                [key]:
                                  event
                                    .target
                                    .value,
                              }
                            )
                          }
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </label>
                    )
                  )}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-xs font-bold text-zinc-950">
                    Registrant type
                  </p>

                  <select
                    value={
                      editRegistrantType
                    }
                    onChange={(event) =>
                      setEditRegistrantType(
                        event.target
                          .value ===
                        'client'
                          ? 'client'
                          : 'myself'
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                  >
                    <option value="myself">
                      Account holder / self
                    </option>
                    <option value="client">
                      Registered for a client
                    </option>
                  </select>
                </div>

                <div className="mt-6">
                  <p className="text-xs font-bold text-zinc-950">
                    Nameservers
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {editNameservers.map(
                      (
                        value,
                        index
                      ) => (
                        <div
                          key={
                            index
                          }
                          className="rounded-xl border border-zinc-200 p-3"
                        >
                          <label className="block text-[11px] font-semibold text-zinc-600">
                            Nameserver {index + 1}
                          </label>

                          <input
                            value={
                              value
                            }
                            onChange={(event) => {
                              const copy = [
                                ...editNameservers,
                              ];

                              copy[
                                index
                              ] =
                                event
                                  .target
                                  .value;

                              setEditNameservers(
                                copy
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#3120ff]"
                          />

                          <label className="mt-2 block text-[11px] font-semibold text-zinc-600">
                            IP address
                          </label>

                          <input
                            value={
                              editNameserverIps[
                                index
                              ] ||
                              ''
                            }
                            onChange={(event) => {
                              const copy = [
                                ...editNameserverIps,
                              ];

                              copy[
                                index
                              ] =
                                event
                                  .target
                                  .value;

                              setEditNameserverIps(
                                copy
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs outline-none focus:border-[#3120ff]"
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      Renewal price
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        editRenewalPrice
                      }
                      onChange={(event) =>
                        setEditRenewalPrice(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      Registered date
                    </span>
                    <input
                      type="date"
                      value={
                        editRegisteredAt
                      }
                      onChange={(event) =>
                        setEditRegisteredAt(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-zinc-700">
                      Expiry date
                    </span>
                    <input
                      type="date"
                      value={
                        editExpiresAt
                      }
                      onChange={(event) =>
                        setEditExpiresAt(
                          event.target
                            .value
                        )
                      }
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                    />
                  </label>
                </div>

                <label className="mt-4 flex items-center gap-2 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    checked={
                      editAutoRenew
                    }
                    onChange={(event) =>
                      setEditAutoRenew(
                        event.target
                          .checked
                      )
                    }
                    className="h-4 w-4 accent-[#3120ff]"
                  />
                  Auto-renew enabled
                </label>

                {editError && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                    {editError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() =>
                    setEditingDomain(
                      null
                    )
                  }
                  className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveDomainEditor
                  }
                  disabled={
                    editSaving
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  {editSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {editSaving
                    ? 'Saving...'
                    : 'Save domain details'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
      className={`mt-1 wrap-break-word font-semibold text-zinc-700 ${
        mono
          ? 'font-mono text-[11px]'
          : ''
      }`}
    >
      {value}
    </p>
  </div>
);

const DomainBadge: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  const label =
    STATUS_LABELS[
      status
    ] ||
    status.replace(
      /_/g,
      ' '
    );

  const classes =
    status === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status ===
          'pending_payment'
        ? 'border-[#3120ff]/20 bg-[#3120ff]/5 text-[#3120ff]'
        : status.startsWith(
              'pending_'
            )
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-zinc-200 bg-zinc-100 text-zinc-600';

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {label}
    </span>
  );
};
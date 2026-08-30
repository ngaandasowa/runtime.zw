import React, {
  useMemo,
  useState,
} from 'react';

import {
  CalendarDays,
  Clock3,
  Globe2,
  Play,
  RefreshCw,
  Search,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  DomainStatus,
} from '../../types';

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
                Temporary Phase 1 panel. Choose a simulated date and run the renewal processor manually. No scheduled execution is connected here.
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
                              label="Renewal lifecycle"
                              value={
                                lifecycleLabel(
                                  domain as any
                                )
                              }
                            />
                          </div>
                        </div>

                        {waitingForPayment ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminSubView(
                                'orders'
                              )
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 px-4 py-2.5 text-xs font-bold text-[#3120ff]"
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
                  );
                }
              )}
            </div>
          )}
        </div>
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
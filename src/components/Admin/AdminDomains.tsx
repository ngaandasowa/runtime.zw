import React, {
  useMemo,
  useState,
} from 'react';

import {
  Clock3,
  Globe2,
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
    expired:
      'Expired',
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

    const filtered =
      useMemo(
        () =>
          domains.filter(
            (domain) => {
              if (
                statusFilter !==
                  'ALL' &&
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
              All statuses
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

                          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
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
                            onChange={(event) => {
                              const status =
                                event.target.value as
                                  DomainStatus;

                              updateDomainStatus(
                                domain.id,
                                status
                              );

                              showNotification(
                                `${domain.domain_name} status updated.`,
                                'info'
                              );
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
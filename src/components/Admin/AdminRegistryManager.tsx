import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';

import { useStore } from '../../context/StoreContext';

import {
  RegistryAction,
  RegistryRequest,
} from '../../types';

import {
  registryTemplateService,
} from '../../services/RegistryTemplateService';

const ACTION_LABELS: Record<
  RegistryAction,
  string
> = {
  N: 'New',
  M: 'Modify',
  D: 'Delete',
  T: 'Transfer',
};

const STATUS_LABELS: Record<
  string,
  string
> = {
  draft: 'Draft',
  ready: 'Ready',
  submitted: 'Submitted',
  awaiting_confirmation:
    'Awaiting confirmation',
  confirmed: 'Confirmed',
  failed: 'Failed',
};

export const AdminRegistryManager: React.FC =
  () => {
    const {
      registryRequests,
      domains,
      submitRegistryRequest,
      confirmRegistryRequest,
      createManualRegistryRequest,
      settings,
      showNotification,
    } = useStore();

    const [
      search,
      setSearch,
    ] = useState('');

    const [
      actionFilter,
      setActionFilter,
    ] = useState<
      'ALL' | RegistryAction
    >('ALL');

    const [
      selectedRequest,
      setSelectedRequest,
    ] =
      useState<RegistryRequest | null>(
        null
      );

    const [
      manualOpen,
      setManualOpen,
    ] = useState(false);

    const [
      manualDomainId,
      setManualDomainId,
    ] = useState('');

    const [
      manualAction,
      setManualAction,
    ] =
      useState<RegistryAction>(
        'N'
      );

    const filtered =
      useMemo(
        () =>
          registryRequests.filter(
            (request) => {
              if (
                actionFilter !==
                  'ALL' &&
                request.action !==
                  actionFilter
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
                request.domain_name
                  .toLowerCase()
                  .includes(
                    value
                  ) ||
                request.customer_email
                  .toLowerCase()
                  .includes(
                    value
                  )
              );
            }
          ),
        [
          registryRequests,
          search,
          actionFilter,
        ]
      );

    const counts =
      useMemo(
        () => ({
          ready:
            registryRequests.filter(
              (item) =>
                item.status ===
                  'ready' ||
                item.status ===
                  'draft'
            ).length,

          submitted:
            registryRequests.filter(
              (item) =>
                item.status ===
                  'submitted' ||
                item.status ===
                  'awaiting_confirmation'
            ).length,

          confirmed:
            registryRequests.filter(
              (item) =>
                item.status ===
                'confirmed'
            ).length,
        }),
        [
          registryRequests,
        ]
      );

    const selectedDomain =
      selectedRequest
        ? domains.find(
            (item) =>
              item.id ===
                selectedRequest.domain_id ||
              item.domain_name ===
                selectedRequest.domain_name
          ) || null
        : null;

    const missingFields =
      selectedDomain
        ? registryTemplateService.validateTemplateData(
            selectedDomain
          )
        : [];

    const downloadTemplate = (
      request: RegistryRequest
    ) => {
      const filename =
        registryTemplateService.getFilename(
          request.domain_name,
          request.action
        );

      /*
       * ZISPA requires plain ASCII.
       * Strip non-ASCII characters from the generated attachment.
       */
      const ascii =
        request.generated_template
          .normalize('NFKD')
          .replace(
            /[^\x00-\x7F]/g,
            ''
          );

      const blob =
        new Blob(
          [ascii],
          {
            type: 'text/plain;charset=us-ascii',
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );

      showNotification(
        `${filename} downloaded.`,
        'success'
      );
    };

    const createManual = (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (
        !manualDomainId
      ) {
        return;
      }

      createManualRegistryRequest(
        manualDomainId,
        manualAction
      );

      setManualDomainId(
        ''
      );
      setManualAction(
        'N'
      );
      setManualOpen(
        false
      );
    };

    return (
      <div className="space-y-6">

        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#3120ff]">
              <FileText className="h-4 w-4" />
              ADMIN ONLY
            </div>

            <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
              ZISPA Registry
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Prepare, download and track Zimbabwe registry applications.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setManualOpen(
                true
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9]"
          >
            <Plus className="h-4 w-4" />
            New Request
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label="Ready"
            value={
              counts.ready
            }
          />

          <Metric
            label="Submitted"
            value={
              counts.submitted
            }
          />

          <Metric
            label="Confirmed"
            value={
              counts.confirmed
            }
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-600">
          <p className="font-semibold text-zinc-950">
            Manual submission workflow
          </p>

          <p className="mt-1 leading-5">
            Download one plain-text application per domain and email it to{' '}
            <span className="font-mono">
              {settings.registry_email_to}
            </span>
            . Use the full domain name as the email subject.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
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
              placeholder="Search domain or customer"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#3120ff]"
            />
          </div>

          <select
            value={
              actionFilter
            }
            onChange={(
              event
            ) =>
              setActionFilter(
                event.target.value as
                  | 'ALL'
                  | RegistryAction
              )
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs outline-none"
          >
            <option value="ALL">
              All actions
            </option>

            <option value="N">
              N · New
            </option>

            <option value="M">
              M · Modify
            </option>

            <option value="T">
              T · Transfer
            </option>

            <option value="D">
              D · Delete
            </option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          {filtered.length ===
          0 ? (
            <div className="px-6 py-14 text-center">
              <FileText className="mx-auto h-7 w-7 text-zinc-300" />

              <p className="mt-3 text-sm font-semibold text-zinc-950">
                No registry requests
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                New .co.zw, .org.zw and .ac.zw requests will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                    <th className="px-4 py-3">
                      Domain
                    </th>

                    <th className="px-4 py-3">
                      Action
                    </th>

                    <th className="px-4 py-3">
                      Customer
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Created
                    </th>

                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-200">
                  {filtered.map(
                    (
                      request
                    ) => (
                      <tr
                        key={
                          request.id
                        }
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-950">
                          {
                            request.domain_name
                          }
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono font-bold text-zinc-800">
                            {
                              request.action
                            }
                          </span>

                          <span className="ml-2 text-zinc-500">
                            {
                              ACTION_LABELS[
                                request.action
                              ]
                            }
                          </span>
                        </td>

                        <td className="px-4 py-3 text-zinc-600">
                          {
                            request.customer_email
                          }
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            status={
                              request.status
                            }
                          />
                        </td>

                        <td className="px-4 py-3 text-zinc-500">
                          {new Date(
                            request.created_at
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedRequest(
                                  request
                                )
                              }
                              title="Preview"
                              className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200"
                            >
                              <Eye className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                downloadTemplate(
                                  request
                                )
                              }
                              title="Download"
                              className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            {(request.status ===
                              'ready' ||
                              request.status ===
                                'draft') && (
                              <button
                                type="button"
                                onClick={() =>
                                  submitRegistryRequest(
                                    request.id
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-[#3120ff] px-3 py-2 font-semibold text-white"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Mark Submitted
                              </button>
                            )}

                            {(request.status ===
                              'submitted' ||
                              request.status ===
                                'awaiting_confirmation') && (
                              <button
                                type="button"
                                onClick={() =>
                                  confirmRegistryRequest(
                                    request.id
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Confirm
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:p-4">
            <div className="flex h-full items-end justify-center sm:items-center">
              <div className="flex max-h-dvh w-full flex-col overflow-hidden bg-white sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
                  <div>
                    <h3 className="font-bold text-zinc-950">
                      {
                        selectedRequest.domain_name
                      }
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      {selectedRequest.action} ·{' '}
                      {
                        ACTION_LABELS[
                          selectedRequest.action
                        ]
                      }
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRequest(
                        null
                      )
                    }
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-600 sm:grid-cols-2">
                    <p>
                      From:{' '}
                      {
                        settings.registry_email_from
                      }
                    </p>

                    <p>
                      To:{' '}
                      {
                        settings.registry_email_to
                      }
                    </p>

                    <p>
                      Subject:{' '}
                      {
                        selectedRequest.email_subject
                      }
                    </p>

                    <p>
                      Attachment:{' '}
                      {registryTemplateService.getFilename(
                        selectedRequest.domain_name,
                        selectedRequest.action
                      )}
                    </p>
                  </div>

                  {missingFields.length >
                    0 && (
                    <div className="mt-4 flex gap-3 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

                      <div>
                        <p className="text-xs font-bold text-amber-900">
                          Required information is missing
                        </p>

                        <p className="mt-1 text-xs leading-5 text-amber-800">
                          {
                            missingFields.join(
                              ', '
                            )
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <pre className="mt-4 overflow-x-auto whitespace-pre rounded-xl bg-zinc-950 p-4 font-mono text-[11px] leading-5 text-zinc-100">
                    {
                      selectedRequest.generated_template
                    }
                  </pre>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3 sm:px-6">
                  <button
                    type="button"
                    onClick={() =>
                      downloadTemplate(
                        selectedRequest
                      )
                    }
                    disabled={
                      missingFields.length >
                      0
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Download .txt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {manualOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <form
              onSubmit={
                createManual
              }
              className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-950">
                  New Registry Request
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setManualOpen(
                      false
                    )
                  }
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Domain
                  </label>

                  <select
                    value={
                      manualDomainId
                    }
                    onChange={(
                      event
                    ) =>
                      setManualDomainId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    <option value="">
                      Select a domain
                    </option>

                    {domains
                      .filter(
                        (domain) =>
                          ['.co.zw', '.org.zw', '.ac.zw'].some(
                            (tld) =>
                              domain.domain_name
                                .toLowerCase()
                                .endsWith(
                                  tld
                                )
                          )
                      )
                      .map(
                        (
                          domain
                        ) => (
                          <option
                            key={
                              domain.id
                            }
                            value={
                              domain.id
                            }
                          >
                            {
                              domain.domain_name
                            }
                          </option>
                        )
                      )}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                    Action
                  </label>

                  <select
                    value={
                      manualAction
                    }
                    onChange={(
                      event
                    ) =>
                      setManualAction(
                        event.target.value as RegistryAction
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"
                  >
                    <option value="N">
                      N · New
                    </option>

                    <option value="M">
                      M · Modify
                    </option>

                    <option value="T">
                      T · Transfer
                    </option>

                    <option value="D">
                      D · Delete
                    </option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white"
                >
                  Create Request
                </button>
              </div>
            </form>
          </div>
        )}
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
    <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
      {label}
    </p>

    <p className="mt-1 text-2xl font-extrabold text-zinc-950">
      {value}
    </p>
  </div>
);

const StatusBadge: React.FC<{
  status: string;
}> = ({
  status,
}) => {
  const confirmed =
    status ===
    'confirmed';

  const submitted =
    status ===
      'submitted' ||
    status ===
      'awaiting_confirmation';

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${
        confirmed
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : submitted
            ? 'border-[#3120ff]/20 bg-[#3120ff]/5 text-[#3120ff]'
            : 'border-zinc-200 bg-zinc-50 text-zinc-600'
      }`}
    >
      {STATUS_LABELS[
        status
      ] || status}
    </span>
  );
};
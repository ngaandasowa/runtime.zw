import React, {
  useState,
} from 'react';

import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  RegistryAction,
  RegistryRequest,
} from '../../types';

import {
  registryTemplateService,
} from '../../services/RegistryTemplateService';

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
      selectedRequest,
      setSelectedRequest,
    ] =
      useState<RegistryRequest | null>(
        null
      );

    const [
      modalMode,
      setModalMode,
    ] = useState<
      | 'preview'
      | 'manual_create'
      | null
    >(null);

    const [
      filterAction,
      setFilterAction,
    ] =
      useState<string>('ALL');

    const [
      searchQuery,
      setSearchQuery,
    ] =
      useState<string>('');

    /*
     * ----------------------------------------------------------
     * MANUAL REQUEST
     * ----------------------------------------------------------
     */

    const [
      manualDomainId,
      setManualDomainId,
    ] =
      useState<string>('');

    const [
      manualAction,
      setManualAction,
    ] =
      useState<RegistryAction>(
        'N'
      );

    /*
     * ----------------------------------------------------------
     * STATS
     * ----------------------------------------------------------
     */

    const pendingN =
      registryRequests.filter(
        (request) =>
          request.action === 'N' &&
          (
            request.status === 'ready' ||
            request.status === 'draft'
          )
      ).length;

    const pendingM =
      registryRequests.filter(
        (request) =>
          request.action === 'M' &&
          (
            request.status === 'ready' ||
            request.status === 'draft'
          )
      ).length;

    const pendingT =
      registryRequests.filter(
        (request) =>
          request.action === 'T' &&
          (
            request.status === 'ready' ||
            request.status === 'draft'
          )
      ).length;

    const pendingD =
      registryRequests.filter(
        (request) =>
          request.action === 'D' &&
          (
            request.status === 'ready' ||
            request.status === 'draft'
          )
      ).length;

    const awaitingRegistry =
      registryRequests.filter(
        (request) =>
          request.status ===
            'submitted' ||
          request.status ===
            'awaiting_confirmation'
      ).length;

    const confirmedRequests =
      registryRequests.filter(
        (request) =>
          request.status ===
          'confirmed'
      ).length;

    /*
     * ----------------------------------------------------------
     * FILTERING
     * ----------------------------------------------------------
     */

    const filteredRequests =
      registryRequests.filter(
        (request) => {
          if (
            filterAction !==
              'ALL' &&
            request.action !==
              filterAction
          ) {
            return false;
          }

          const query =
            searchQuery
              .trim()
              .toLowerCase();

          if (!query) {
            return true;
          }

          return (
            request.domain_name
              .toLowerCase()
              .includes(query) ||
            request.customer_email
              .toLowerCase()
              .includes(query)
          );
        }
      );

    /*
     * ----------------------------------------------------------
     * DOWNLOAD TEMPLATE
     * ----------------------------------------------------------
     */

    const handleDownloadTxt = (
      request: RegistryRequest
    ) => {
      const filename =
        registryTemplateService.getFilename(
          request.domain_name,
          request.action
        );

      const blob =
        new Blob(
          [
            request.generated_template,
          ],
          {
            type: 'text/plain;charset=utf-8',
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
        `Downloaded ${filename}`,
        'info'
      );
    };

    /*
     * ----------------------------------------------------------
     * MANUAL REQUEST CREATION
     * ----------------------------------------------------------
     */

    const handleCreateManual = (
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

      setModalMode(
        null
      );
    };

    return (
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center space-x-2 text-xs font-bold text-[#FF2D20]">
              <span>
                REGISTRAR PROTOCOL
              </span>

              <span>
                •
              </span>

              <span>
                REGISTRY ENGINE
              </span>
            </div>

            <h1 className="flex items-center space-x-2 text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
              <FileText className="h-6 w-6 text-[#FF2D20]" />

              <span>
                Registry Management
              </span>
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Prepare, review and manage domain registry requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (
                domains.length >
                0
              ) {
                setManualDomainId(
                  domains[0].id
                );

                setModalMode(
                  'manual_create'
                );
              } else {
                showNotification(
                  'No domains are available for a manual registry request.',
                  'info'
                );
              }
            }}
            className="inline-flex items-center justify-center space-x-2 rounded-xl bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#E0241A]"
          >
            <Plus className="h-4 w-4" />

            <span>
              Create Registry Request
            </span>
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Pending Reg
            </div>

            <div className="mt-1 text-xl font-extrabold text-[#FF2D20]">
              {pendingN}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Pending Modify
            </div>

            <div className="mt-1 text-xl font-extrabold text-zinc-950">
              {pendingM}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Pending Transfer
            </div>

            <div className="mt-1 text-xl font-extrabold text-zinc-950">
              {pendingT}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Pending Delete
            </div>

            <div className="mt-1 text-xl font-extrabold text-zinc-950">
              {pendingD}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Awaiting Registry
            </div>

            <div className="mt-1 text-xl font-extrabold text-[#FF2D20]">
              {awaitingRegistry}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Confirmed
            </div>

            <div className="mt-1 text-xl font-extrabold text-emerald-600">
              {
                confirmedRequests
              }
            </div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-zinc-500">
              Action:
            </span>

            <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-bold">
              {[
                'ALL',
                'N',
                'M',
                'T',
                'D',
              ].map(
                (
                  action
                ) => (
                  <button
                    key={
                      action
                    }
                    type="button"
                    onClick={() =>
                      setFilterAction(
                        action
                      )
                    }
                    className={`rounded-md px-2.5 py-1 transition ${
                      filterAction ===
                      action
                        ? 'bg-white text-zinc-950 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {action}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />

            <input
              type="text"
              placeholder="Search domain or customer..."
              value={
                searchQuery
              }
              onChange={(
                event
              ) =>
                setSearchQuery(
                  event
                    .target
                    .value
                )
              }
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-4 text-xs text-zinc-900 outline-none focus:border-[#FF2D20] focus:bg-white sm:w-64"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-xs">

              <thead>
                <tr className="border-b border-zinc-200 font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="pb-3">
                    Domain
                  </th>

                  <th className="pb-3">
                    Action
                  </th>

                  <th className="pb-3">
                    Customer
                  </th>

                  <th className="pb-3">
                    Payment
                  </th>

                  <th className="pb-3">
                    Status
                  </th>

                  <th className="pb-3">
                    Submitted
                  </th>

                  <th className="pb-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 text-zinc-700">

                {filteredRequests.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        7
                      }
                      className="py-10 text-center text-zinc-500"
                    >
                      No registry requests found.
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(
                    (
                      request
                    ) => (
                      <tr
                        key={
                          request.id
                        }
                        className="transition hover:bg-zinc-50"
                      >

                        <td className="py-3.5 font-mono font-bold text-zinc-950">
                          {
                            request.domain_name
                          }
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-bold ${
                              request.action ===
                              'N'
                                ? 'border-red-200 bg-red-50 text-[#FF2D20]'
                                : 'border-zinc-200 bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {
                              request.action
                            }
                          </span>
                        </td>

                        <td
                          className="max-w-40 truncate py-3.5 text-zinc-600"
                          title={
                            request.customer_email
                          }
                        >
                          {
                            request.customer_email
                          }
                        </td>

                        <td className="py-3.5">
                          <span className="font-mono font-semibold text-zinc-900">
                            {request.payment_reference ||
                              '—'}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              request.status ===
                              'confirmed'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : request.status ===
                                    'submitted'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : request.status ===
                                      'ready'
                                    ? 'border-zinc-300 bg-zinc-100 text-zinc-800'
                                    : 'border-zinc-200 bg-zinc-50 text-zinc-500'
                            }`}
                          >
                            {
                              request.status
                            }
                          </span>
                        </td>

                        <td className="py-3.5 text-zinc-500">
                          {request.submitted_at
                            ? new Date(
                                request.submitted_at
                              ).toLocaleDateString()
                            : '—'}
                        </td>

                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">

                            {/* PREVIEW */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(
                                  request
                                );

                                setModalMode(
                                  'preview'
                                );
                              }}
                              title="Preview registry template"
                              className="rounded-lg bg-zinc-100 p-1.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-950"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* DOWNLOAD */}
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadTxt(
                                  request
                                )
                              }
                              title="Download template"
                              className="rounded-lg bg-zinc-100 p-1.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-950"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>

                            {/* SUBMIT */}
                            {request.status !==
                              'confirmed' &&
                              request.status !==
                                'submitted' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    submitRegistryRequest(
                                      request.id
                                    )
                                  }
                                  className="inline-flex items-center space-x-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 font-bold text-[#FF2D20] transition hover:bg-red-100"
                                >
                                  <Send className="h-3 w-3" />

                                  <span>
                                    Submit
                                  </span>
                                </button>
                              )}

                            {/* CONFIRM */}
                            {request.status ===
                              'submitted' && (
                              <button
                                type="button"
                                onClick={() =>
                                  confirmRegistryRequest(
                                    request.id
                                  )
                                }
                                className="inline-flex items-center space-x-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-bold text-emerald-700 transition hover:bg-emerald-100"
                              >
                                <CheckCircle2 className="h-3 w-3" />

                                <span>
                                  Confirm
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PREVIEW MODAL */}
        {modalMode ===
          'preview' &&
          selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">

              <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">

                <div className="mb-4 flex items-start justify-between border-b border-zinc-200 pb-4">

                  <div>
                    <div className="flex flex-wrap items-center gap-2">

                      <span className="font-mono text-sm font-bold text-zinc-950">
                        {registryTemplateService.getFilename(
                          selectedRequest.domain_name,
                          selectedRequest.action
                        )}
                      </span>

                      <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold text-[#FF2D20]">
                        Plain Text
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-zinc-500">
                      Subject:{' '}
                      <code className="font-mono text-zinc-950">
                        {
                          selectedRequest.email_subject
                        }
                      </code>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setModalMode(
                        null
                      )
                    }
                    className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* METADATA */}
                <div className="mb-4 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-600">

                  <div>
                    <span className="text-zinc-400">
                      From:
                    </span>{' '}
                    {
                      settings.registry_email_from
                    }
                  </div>

                  <div>
                    <span className="text-zinc-400">
                      To:
                    </span>{' '}
                    {
                      settings.registry_email_to
                    }
                  </div>

                  <div>
                    <span className="text-zinc-400">
                      Attachment:
                    </span>{' '}
                    {registryTemplateService.getFilename(
                      selectedRequest.domain_name,
                      selectedRequest.action
                    )}
                  </div>
                </div>

                {/* TEMPLATE */}
                <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 font-mono text-xs leading-relaxed text-zinc-100">
                  {
                    selectedRequest.generated_template
                  }
                </pre>

                {/* FOOTER */}
                <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:items-center sm:justify-between">

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadTxt(
                        selectedRequest
                      )
                    }
                    className="inline-flex items-center justify-center space-x-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                  >
                    <Download className="h-3.5 w-3.5 text-[#FF2D20]" />

                    <span>
                      Download .txt
                    </span>
                  </button>

                  <div className="flex items-center justify-end space-x-2">

                    <button
                      type="button"
                      onClick={() =>
                        setModalMode(
                          null
                        )
                      }
                      className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-900"
                    >
                      Close
                    </button>

                    {selectedRequest.status !==
                      'confirmed' &&
                      selectedRequest.status !==
                        'submitted' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await submitRegistryRequest(
                              selectedRequest.id
                            );

                            setModalMode(
                              null
                            );
                          }}
                          className="inline-flex items-center space-x-1.5 rounded-xl bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#E0241A]"
                        >
                          <Send className="h-3.5 w-3.5" />

                          <span>
                            Submit Request
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* MANUAL CREATE MODAL */}
        {modalMode ===
          'manual_create' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">

            <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">

              <div className="mb-4 flex items-start justify-between">

                <div>
                  <h3 className="text-base font-bold text-zinc-950">
                    Create Registry Request
                  </h3>

                  <p className="mt-1 text-xs text-zinc-500">
                    Generate a request for an existing domain.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setModalMode(
                      null
                    )
                  }
                  className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateManual
                }
                className="space-y-4 text-xs"
              >

                {/* DOMAIN */}
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700">
                    Select Domain
                  </label>

                  <select
                    value={
                      manualDomainId
                    }
                    onChange={(
                      event
                    ) =>
                      setManualDomainId(
                        event
                          .target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-zinc-900 outline-none focus:border-[#FF2D20] focus:bg-white"
                  >
                    {domains.map(
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
                          }{' '}
                          (
                          {
                            domain.status
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* ACTION */}
                <div>
                  <label className="mb-1 block font-semibold text-zinc-700">
                    Action Type
                  </label>

                  <div className="grid grid-cols-4 gap-2 font-mono">
                    {(
                      [
                        'N',
                        'M',
                        'D',
                        'T',
                      ] as RegistryAction[]
                    ).map(
                      (
                        action
                      ) => (
                        <button
                          key={
                            action
                          }
                          type="button"
                          onClick={() =>
                            setManualAction(
                              action
                            )
                          }
                          className={`rounded-xl border p-2 text-center font-bold transition ${
                            manualAction ===
                            action
                              ? 'border-red-300 bg-red-50 text-[#FF2D20]'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {
                            action
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-500">
                    N = New · M = Modify · D = Delete · T = Transfer
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end space-x-2 border-t border-zinc-200 pt-4">

                  <button
                    type="button"
                    onClick={() =>
                      setModalMode(
                        null
                      )
                    }
                    className="px-3 py-2 font-bold text-zinc-500 hover:text-zinc-900"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="rounded-xl bg-[#FF2D20] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#E0241A]"
                  >
                    Generate Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };
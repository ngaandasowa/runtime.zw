import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  FlaskConical,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react';

import {
  getAuth,
} from 'firebase/auth';

import {
  useStore,
} from '../../context/StoreContext';

type CloudflareStatus = {
  success: boolean;
  configured?: boolean;
  provider?: string;
  tokenStatus?: string;
  message?: string;
};

type ProvisionResult = {
  success: boolean;
  testMode?: boolean;
  registryChanged?: boolean;
  domainName?: string;
  zoneId?: string;
  zoneStatus?: string;
  nameservers?: string[];
  runtimeDomainUpdated?: boolean;
  protectedLegacyDomain?: boolean;
  currentNameservers?: string[];
  message?: string;
};

const API_BASE =
  (
    import.meta.env.VITE_API_URL ||
    'https://api.runtime.co.zw'
  ).replace(/\/$/, '');

export const AdminNameservers:
  React.FC = () => {
    const {
      settings,
      domains,
    } = useStore();

    const [
      status,
      setStatus,
    ] =
      useState<
        CloudflareStatus | null
      >(null);

    const [
      loading,
      setLoading,
    ] =
      useState(false);

    const [
      error,
      setError,
    ] =
      useState<string | null>(
        null
      );

    const [
      selectedDomainId,
      setSelectedDomainId,
    ] =
      useState('');

    const [
      provisioning,
      setProvisioning,
    ] =
      useState(false);

    const [
      provisionError,
      setProvisionError,
    ] =
      useState<string | null>(
        null
      );

    const [
      provisionResult,
      setProvisionResult,
    ] =
      useState<
        ProvisionResult | null
      >(null);

    const getToken =
      useCallback(
        async () => {
          const user =
            getAuth()
              .currentUser;

          if (!user) {
            throw new Error(
              'Sign in again before using Runtime DNS.'
            );
          }

          return user
            .getIdToken();
        },
        []
      );

    const testConnection =
      useCallback(
        async () => {
          setLoading(true);
          setError(null);

          try {
            const token =
              await getToken();

            const response =
              await fetch(
                `${API_BASE}/api/dns/cloudflare/status`,
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                    Accept:
                      'application/json',
                  },
                }
              );

            const body =
              await response
                .json() as
                CloudflareStatus;

            if (
              !response.ok ||
              !body?.success
            ) {
              throw new Error(
                body?.message ||
                `Cloudflare test failed (${response.status}).`
              );
            }

            setStatus(body);
          } catch (
            caught
          ) {
            setStatus(null);
            setError(
              caught instanceof Error
                ? caught.message
                : 'Unable to test Cloudflare.'
            );
          } finally {
            setLoading(false);
          }
        },
        [
          getToken,
        ]
      );

    useEffect(
      () => {
        void testConnection();
      },
      [
        testConnection,
      ]
    );

    const connected =
      status?.success ===
        true &&
      status?.configured ===
        true &&
      status?.tokenStatus ===
        'active';

    const legacyNameservers =
      Array.isArray(
        settings
          .default_nameservers
      )
        ? settings
            .default_nameservers
            .filter(Boolean)
        : [];

    /*
     * The backend is still the authority and will reject an
     * active legacy domain. This frontend filter simply keeps
     * obviously unsafe domains out of the test selector.
     *
     * pending_registration is the best real-world test because
     * it represents a paid/new registration that has not yet
     * become active at the registry.
     */
    const eligibleDomains =
      useMemo(
        () =>
          domains
            .filter(
              (domain: any) => {
                const status =
                  String(
                    domain.status ||
                    ''
                  );

                const provider =
                  String(
                    domain.dns_provider ||
                    ''
                  );

                if (
                  provider ===
                  'cloudflare'
                ) {
                  return true;
                }

                return [
                  'pending',
                  'pending_payment',
                  'pending_registration',
                  'registry_rejected',
                  'replaced',
                ].includes(
                  status
                );
              }
            )
            .sort(
              (a: any, b: any) =>
                String(
                  a.domain_name
                ).localeCompare(
                  String(
                    b.domain_name
                  )
                )
            ),
        [
          domains,
        ]
      );

    const selectedDomain =
      eligibleDomains.find(
        (domain: any) =>
          domain.id ===
          selectedDomainId
      ) as any;

    const provisionTest =
      async () => {
        if (
          !selectedDomainId
        ) {
          setProvisionError(
            'Select a test domain first.'
          );
          return;
        }

        setProvisioning(true);
        setProvisionError(
          null
        );
        setProvisionResult(
          null
        );

        try {
          const token =
            await getToken();

          const response =
            await fetch(
              `${API_BASE}/api/dns/cloudflare/provision-test`,
              {
                method: 'POST',
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                  'Content-Type':
                    'application/json',
                  Accept:
                    'application/json',
                },
                body:
                  JSON.stringify({
                    domainId:
                      selectedDomainId,
                  }),
              }
            );

          const body =
            await response
              .json() as
              ProvisionResult;

          if (
            !response.ok ||
            !body?.success
          ) {
            throw new Error(
              body?.message ||
              `Provisioning failed (${response.status}).`
            );
          }

          setProvisionResult(
            body
          );
        } catch (
          caught
        ) {
          setProvisionError(
            caught instanceof Error
              ? caught.message
              : 'Unable to provision the test domain.'
          );
        } finally {
          setProvisioning(
            false
          );
        }
      };

    return (
      <div className="max-w-4xl space-y-6">
        <div className="border-b border-zinc-200 pb-4">
          <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#3120ff]">
            <Cloud className="h-4 w-4" />
            <span>RUNTIME DNS</span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
            DNS Infrastructure
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Cloudflare DNS for new Runtime-managed domains, with legacy DNS preserved for existing domains.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-[#3120ff]" />
                <h2 className="text-sm font-bold text-zinc-950">
                  Cloudflare DNS
                </h2>
              </div>

              <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                Runtime connects to Cloudflare from the backend. API credentials are never exposed in this dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void testConnection()
              }
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2819d9] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {loading
                ? 'Testing...'
                : 'Test Connection'}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatusCard
              label="Connection"
              value={
                loading
                  ? 'Checking'
                  : connected
                    ? 'Connected'
                    : 'Not connected'
              }
              ready={connected}
              loading={loading}
            />

            <StatusCard
              label="API Token"
              value={
                loading
                  ? 'Checking'
                  : status
                      ?.tokenStatus ===
                    'active'
                    ? 'Active'
                    : 'Unavailable'
              }
              ready={
                status
                  ?.tokenStatus ===
                'active'
              }
              loading={loading}
            />

            <StatusCard
              label="DNS Provisioning"
              value={
                loading
                  ? 'Checking'
                  : connected
                    ? 'Ready'
                    : 'Not ready'
              }
              ready={connected}
              loading={loading}
            />
          </div>

          {connected && (
            <div className="mt-4 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-xs font-bold text-emerald-900">
                  Cloudflare connection is ready
                </p>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Runtime can authenticate with Cloudflare. Live automatic registration provisioning is still disabled.
                </p>
              </div>
            </div>
          )}

          {error && (
            <ErrorBox
              title="Cloudflare connection failed"
              message={error}
            />
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-zinc-950">
                Provision Test Domain
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Create or reuse a Cloudflare zone and save its assigned nameservers to an eligible Runtime domain. This test does not change the domain at the registry.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={
                    selectedDomainId
                  }
                  onChange={(
                    event
                  ) => {
                    setSelectedDomainId(
                      event.target
                        .value
                    );
                    setProvisionError(
                      null
                    );
                    setProvisionResult(
                      null
                    );
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-[#3120ff]"
                >
                  <option value="">
                    Select an eligible domain
                  </option>

                  {eligibleDomains.map(
                    (domain: any) => (
                      <option
                        key={
                          domain.id
                        }
                        value={
                          domain.id
                        }
                      >
                        {domain.domain_name} · {String(domain.status).replace(/_/g, ' ')}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={() =>
                    void provisionTest()
                  }
                  disabled={
                    !connected ||
                    !selectedDomainId ||
                    provisioning
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {provisioning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}

                  {provisioning
                    ? 'Provisioning...'
                    : 'Provision Test Zone'}
                </button>
              </div>

              {selectedDomain && (
                <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs">
                  <p className="font-semibold text-zinc-950">
                    {selectedDomain.domain_name}
                  </p>
                  <p className="mt-1 text-zinc-500">
                    Current status: {String(selectedDomain.status).replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              {provisionError && (
                <ErrorBox
                  title="Provisioning failed"
                  message={
                    provisionError
                  }
                />
              )}

              {provisionResult && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-900">
                        Cloudflare zone provisioned
                      </p>

                      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                        <Result
                          label="Domain"
                          value={
                            provisionResult
                              .domainName ||
                            ''
                          }
                        />
                        <Result
                          label="Zone Status"
                          value={
                            provisionResult
                              .zoneStatus ||
                            'pending'
                          }
                        />
                        <Result
                          label="Zone ID"
                          value={
                            provisionResult
                              .zoneId ||
                            ''
                          }
                        />
                        <Result
                          label="Registry Changed"
                          value={
                            provisionResult
                              .registryChanged
                              ? 'Yes'
                              : 'No'
                          }
                        />
                      </div>

                      <div className="mt-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          Assigned Nameservers
                        </p>

                        <div className="mt-2 space-y-2">
                          {(provisionResult
                            .nameservers ||
                            []
                          ).map(
                            (
                              nameserver,
                              index
                            ) => (
                              <div
                                key={
                                  nameserver
                                }
                                className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-zinc-800"
                              >
                                NS{index + 1} · {nameserver}
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <p className="mt-4 text-xs leading-5 text-emerald-800">
                        The registry was not changed. Do not manually switch this domain yet; the next phase will resolve the nameserver IPs and connect them to the registration workflow.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {eligibleDomains.length ===
                0 && (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-600">
                  There are currently no safe test candidates in Runtime. Active legacy domains are intentionally excluded.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" />

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-zinc-950">
                Legacy DNS
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Existing domains using Runtime's previous DNS remain untouched.
              </p>

              <div className="mt-4 space-y-2">
                {legacyNameservers.length >
                0 ? (
                  legacyNameservers.map(
                    (
                      nameserver,
                      index
                    ) => (
                      <div
                        key={`${nameserver}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <span className="w-8 shrink-0 text-[10px] font-bold uppercase text-zinc-400">
                          NS{index + 1}
                        </span>

                        <span className="break-all font-mono text-xs font-semibold text-zinc-800">
                          {nameserver}
                        </span>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
                    No legacy nameservers are currently stored.
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <p className="text-xs leading-5 text-amber-900">
                  Existing active domains must stay on their current nameservers unless their DNS records are migrated and the nameserver change is explicitly approved.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  };

const StatusCard:
  React.FC<{
    label: string;
    value: string;
    ready: boolean;
    loading: boolean;
  }> = ({
    label,
    value,
    ready,
    loading,
  }) => (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
        ) : ready ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-zinc-400" />
        )}
        <p className={ready ? 'text-sm font-bold text-emerald-700' : 'text-sm font-bold text-zinc-700'}>
          {value}
        </p>
      </div>
    </div>
  );

const Result:
  React.FC<{
    label: string;
    value: string;
  }> = ({
    label,
    value,
  }) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        {label}
      </p>
      <p className="mt-1 break-all font-mono text-xs font-semibold text-zinc-800">
        {value}
      </p>
    </div>
  );

const ErrorBox:
  React.FC<{
    title: string;
    message: string;
  }> = ({
    title,
    message,
  }) => (
    <div className="mt-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
      <div>
        <p className="text-xs font-bold text-rose-900">
          {title}
        </p>
        <p className="mt-1 wrap-break-words text-xs leading-5 text-rose-800">
          {message}
        </p>
      </div>
    </div>
  );

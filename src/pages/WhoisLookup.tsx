import React, { useState } from 'react';

import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Globe2,
  Search,
  Server,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react';

import { useStore } from '../context/StoreContext';

import {
  domainService,
  DomainAvailabilityResult,
  WhoisContact,
} from '../services/DomainService';

type DetailRowProps = {
  label: string;
  value?: React.ReactNode;
};

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
}) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return (
    <div className="grid gap-1 border-b border-zinc-100 py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-6">
      <dt className="text-xs font-medium text-zinc-500">
        {label}
      </dt>

      <dd className="wrap-break-word text-sm text-zinc-800">
        {value}
      </dd>
    </div>
  );
};

type InfoCardProps = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  icon,
  children,
  className = '',
}) => {
  return (
    <section
      className={`rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 ${className}`}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[#3120ff]">
          {icon}
        </span>

        <h2 className="font-semibold text-zinc-950">
          {title}
        </h2>
      </div>

      <dl>{children}</dl>
    </section>
  );
};

const ContactDetails = ({
  contact,
}: {
  contact?: WhoisContact;
}) => {
  if (!contact) {
    return (
      <p className="text-sm text-zinc-500">
        No public contact information is available.
      </p>
    );
  }

  return (
    <dl>
      <DetailRow
        label="Name"
        value={contact.name}
      />

      <DetailRow
        label="Organisation"
        value={contact.organization}
      />

      <DetailRow
        label="Email"
        value={contact.email}
      />

      <DetailRow
        label="Phone"
        value={contact.phone}
      />

      <DetailRow
        label="Address"
        value={contact.street}
      />

      <DetailRow
        label="City"
        value={contact.city}
      />

      <DetailRow
        label="State / Province"
        value={contact.state}
      />

      <DetailRow
        label="Postal Code"
        value={contact.postalCode}
      />

      <DetailRow
        label="Country"
        value={contact.country}
      />
    </dl>
  );
};

const formatDate = (
  value?: string
) => {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  ).format(date);
};

export const WhoisLookup: React.FC = () => {
  const {
    setPendingRegisterDomain,
    setRegistrationModalOpen,
  } = useStore();

  const [query, setQuery] =
    useState('');

  const [result, setResult] =
    useState<DomainAvailabilityResult | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const lookup = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const domain =
      domainService.cleanDomain(
        query
      );

    if (
      !domain ||
      !domain.includes('.')
    ) {
      setError(
        'Enter a complete domain name, for example runtime.co.zw.'
      );

      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const whois =
        await domainService.checkAvailability(
          domain
        );

      setResult(whois);
    } catch (error) {
      console.error(error);

      setError(
        'Unable to complete the WHOIS lookup right now.'
      );
    } finally {
      setLoading(false);
    }
  };

  const register = (
    domain: string
  ) => {
    setPendingRegisterDomain(
      domain
    );

    setRegistrationModalOpen(
      true
    );
  };

  const transfer = (
    domain: string
  ) => {
    domainService.transferDomain(
      domain
    );
  };

  const whois =
    result?.whois;

  return (
    <main className="min-h-screen bg-white">

      {/* HERO */}
      <section className="border-b border-zinc-200 bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">

          <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
            WHOIS domain lookup.
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-500 sm:text-base">
            Search a domain to view its registration and WHOIS information.
          </p>

          <form
            onSubmit={lookup}
            className="mx-auto mt-8 flex max-w-2xl items-center rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 sm:px-4">
              <Search className="h-5 w-5 shrink-0 text-zinc-400" />

              <input
                value={query}
                onChange={(event) => {
                  setQuery(
                    event.target.value
                      .toLowerCase()
                      .replace(/\s/g, '')
                  );

                  if (result) {
                    setResult(null);
                  }

                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="example.co.zw"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent py-3 text-base text-zinc-950 outline-none placeholder:text-zinc-400"
              />
            </div>

            <button
              disabled={
                loading ||
                !query.trim()
              }
              className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            >
              <span className="hidden sm:inline">
                {loading
                  ? 'Searching...'
                  : 'Search'}
              </span>

              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Search className="h-5 w-5 sm:h-4 sm:w-4" />
              )}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-zinc-500">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* RESULTS */}
      {result && (
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">

            {/* RESULT HEADER */}
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <p className="text-sm font-semibold text-[#3120ff]">
                  WHOIS lookup
                </p>

                <h2 className="mt-1 break-all text-2xl font-bold text-zinc-950">
                  {result.domain}
                </h2>
              </div>

              {!result.checkingFailed && (
                result.isAvailable ? (
                  <button
                    type="button"
                    onClick={() =>
                      register(
                        result.domain
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2819d9]"
                  >
                    Register domain

                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      transfer(
                        result.domain
                      )
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2819d9]"
                  >
                    Transfer domain

                    <ArrowRight className="h-4 w-4" />
                  </button>
                )
              )}
            </div>

            {/* AVAILABLE DOMAIN */}
            {result.isAvailable &&
              !result.checkingFailed && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />

                  <h2 className="mt-4 text-xl font-semibold text-zinc-950">
                    {result.domain} is available
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                    This domain does not currently have a registered WHOIS record and can be registered.
                  </p>

                  {result.price !==
                    undefined && (
                    <p className="mt-4 text-lg font-semibold text-zinc-950">
                      $
                      {result.price.toFixed(
                        2
                      )}
                      <span className="ml-1 text-sm font-normal text-zinc-500">
                        / year
                      </span>
                    </p>
                  )}
                </div>
              )}

            {/* REGISTERED DOMAIN INFORMATION */}
            {!result.isAvailable &&
              !result.checkingFailed && (
                <div className="grid gap-4 md:grid-cols-2">

                  {/* DOMAIN */}
                  <InfoCard
                    title="Domain information"
                    icon={
                      <Globe2 className="h-5 w-5" />
                    }
                  >
                    <DetailRow
                      label="Domain"
                      value={
                        whois?.domain ??
                        result.domain
                      }
                    />

                    <DetailRow
                      label="Status"
                      value={
                        whois?.status?.length
                          ? whois.status.join(
                              ', '
                            )
                          : 'Registered'
                      }
                    />

                    <DetailRow
                      label="DNSSEC"
                      value={
                        whois?.dnssec
                      }
                    />
                  </InfoCard>

                  {/* REGISTRAR */}
                  <InfoCard
                    title="Registrar information"
                    icon={
                      <Building2 className="h-5 w-5" />
                    }
                  >
                    <DetailRow
                      label="Registrar"
                      value={
                        whois?.registrar
                      }
                    />

                    <DetailRow
                      label="IANA ID"
                      value={
                        whois?.registrarIanaId
                      }
                    />

                    <DetailRow
                      label="WHOIS server"
                      value={
                        whois?.registrarWhoisServer
                      }
                    />

                    <DetailRow
                      label="Registrar URL"
                      value={
                        whois?.registrarUrl ? (
                          <a
                            href={
                              whois.registrarUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#3120ff] hover:underline"
                          >
                            {
                              whois.registrarUrl
                            }
                          </a>
                        ) : undefined
                      }
                    />
                  </InfoCard>

                  {/* DATES */}
                  <InfoCard
                    title="Dates"
                    icon={
                      <CalendarDays className="h-5 w-5" />
                    }
                  >
                    <DetailRow
                      label="Registered"
                      value={formatDate(
                        whois?.createdDate
                      )}
                    />

                    <DetailRow
                      label="Updated"
                      value={formatDate(
                        whois?.updatedDate
                      )}
                    />

                    <DetailRow
                      label="Expires"
                      value={formatDate(
                        whois?.expiryDate
                      )}
                    />
                  </InfoCard>

                  {/* NAMESERVERS */}
                  <InfoCard
                    title="Nameservers"
                    icon={
                      <Server className="h-5 w-5" />
                    }
                  >
                    {whois?.nameservers?.length ? (
                      <div className="space-y-2">
                        {whois.nameservers.map(
                          (nameserver) => (
                            <div
                              key={
                                nameserver
                              }
                              className="rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700"
                            >
                              {
                                nameserver
                              }
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-500">
                        No nameserver information is available.
                      </p>
                    )}
                  </InfoCard>

                  {/* REGISTRANT */}
                  <InfoCard
                    title="Registrant contact"
                    icon={
                      <UserRound className="h-5 w-5" />
                    }
                    className="md:col-span-2"
                  >
                    <ContactDetails
                      contact={
                        whois?.registrant
                      }
                    />
                  </InfoCard>

                  {/* ADMIN */}
                  {whois?.administrative && (
                    <InfoCard
                      title="Administrative contact"
                      icon={
                        <UserRound className="h-5 w-5" />
                      }
                    >
                      <ContactDetails
                        contact={
                          whois.administrative
                        }
                      />
                    </InfoCard>
                  )}

                  {/* TECH */}
                  <InfoCard
                    title="Technical contact"
                    icon={
                      <Server className="h-5 w-5" />
                    }
                    className={
                      whois?.administrative
                        ? ''
                        : 'md:col-span-2'
                    }
                  >
                    <ContactDetails
                      contact={
                        whois?.technical
                      }
                    />
                  </InfoCard>
                </div>
              )}

            {result.checkingFailed && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
                <XCircle className="mx-auto h-8 w-8 text-zinc-400" />

                <h2 className="mt-4 font-semibold text-zinc-950">
                  WHOIS information unavailable
                </h2>

                <p className="mt-2 text-sm text-zinc-500">
                  {result.reason}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* UNDERSTANDING WHOIS */}
      <section className="border-t border-zinc-200 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">

          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Understanding WHOIS
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500">
              WHOIS provides publicly available information about domain registrations.
            </p>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2">

            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <Globe2 className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                What is WHOIS?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                WHOIS is a service used to look up registration information associated with a domain name.
              </p>
            </div>

            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <Search className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                Why look up a domain?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                A WHOIS lookup can help you determine whether a domain is registered and view available registrar and registration information.
              </p>
            </div>

            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <Server className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                What information is shown?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Depending on the registry, WHOIS may contain registrar details, registration dates, domain status and nameservers.
              </p>
            </div>

            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                Why are some details hidden?
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Registries, registrars and privacy services may redact personal contact information from public WHOIS records.
              </p>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
};
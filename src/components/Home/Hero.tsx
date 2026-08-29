import React, {
  useEffect,
  useState,
} from 'react';

import {
  ArrowRight,
  CheckCircle2,
  MoveRight,
  Search,
  XCircle,
} from 'lucide-react';
import {
  FaWhatsapp,
} from 'react-icons/fa';

import { useStore } from '../../context/StoreContext';

import {
  domainService,
  DomainAvailabilityResult,
  POPULAR_EXTENSIONS,
} from '../../services/DomainService';

type SearchMode =
  | 'register'
  | 'transfer';

export const Hero: React.FC = () => {
  const {
    setPendingRegisterDomain,
    setRegistrationModalOpen,
  } = useStore();

  const [mode, setMode] =
    useState<SearchMode>('register');

  const [query, setQuery] =
    useState('');

  const [results, setResults] =
    useState<
      DomainAvailabilityResult[]
    >([]);

  const [loading, setLoading] =
    useState(false);

  const [prices, setPrices] =
    useState<
      Record<string, number>
    >({});

  const [searchError, setSearchError] =
    useState<string | null>(null);

  /*
   * Load popular extension prices
   */
  useEffect(() => {
  const loadPrices = async () => {
    try {
      const pricing =
        await domainService.getPricing();

      const map: Record<
        string,
        number
      > = {};

      /*
       * Load normal upstream pricing.
       */
      pricing.forEach((item) => {
        if (
          item.register !==
          undefined
        ) {
          map[item.tld] =
            item.register;
        }
      });

      /*
       * Runtime Zimbabwe pricing.
       *
       * These prices always override
       * the upstream Ngaatec prices.
       */
      map['.co.zw'] = 2;
      map['.org.zw'] = 3;
      map['.ac.zw'] = 3;

      setPrices(map);
    } catch (error) {
      console.error(
        'Unable to load domain pricing:',
        error
      );

      /*
       * Even when upstream pricing fails,
       * our Zimbabwe pricing still works.
       */
      setPrices({
        '.co.zw': 2,
        '.org.zw': 3,
        '.ac.zw': 3,
      });
    }
  };

  loadPrices();
}, []);

  /*
   * Search
   */
  const search = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setSearchError(null);

    try {
      const searchResults =
        await domainService.searchDomains(
          query
        );

      /*
       * REGISTER MODE:
       * available first
       *
       * TRANSFER MODE:
       * registered first
       */

      const sorted =
        searchResults
          .map(
            (
              result,
              originalPosition
            ) => ({
              ...result,
              originalPosition,
            })
          )
          .sort((a, b) => {
            /*
             * Failed checks always last.
             */
            if (
              a.checkingFailed &&
              !b.checkingFailed
            ) {
              return 1;
            }

            if (
              !a.checkingFailed &&
              b.checkingFailed
            ) {
              return -1;
            }

            if (
              a.isAvailable !==
              b.isAvailable
            ) {
              if (
                mode === 'register'
              ) {
                return a.isAvailable
                  ? -1
                  : 1;
              }

              return a.isAvailable
                ? 1
                : -1;
            }

            return (
              a.originalPosition -
              b.originalPosition
            );
          })
          .map(
            ({
              originalPosition,
              ...result
            }) => result
          );

      setResults(sorted);
    } catch (error) {
      console.error(error);

      setSearchError(
        'We could not complete the domain search. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Register
   */
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

  /*
 * Assisted Zimbabwe registrations
 *
 * .org.zw and .ac.zw require additional
 * supporting documents, so these are
 * handled directly with Runtime.
 */
const requiresAssistedRegistration = (
  domain: string
) => {
  const value =
    domain.toLowerCase();

  return (
    value.endsWith('.org.zw') ||
    value.endsWith('.ac.zw')
  );
};

const whatsappRegistration = (
  domain: string
) => {
  const message =
    encodeURIComponent(
      `Hi Runtime, I would like to register ${domain}. Please assist me with the registration requirements and supporting documents.`
    );

  window.open(
    `https://wa.me/263788350229?text=${message}`,
    '_blank',
    'noopener,noreferrer'
  );
};

  /*
   * Transfer
   */
  const transfer = (
    domain: string
  ) => {
    domainService.transferDomain(
      domain
    );
  };

  const changeMode = (
    newMode: SearchMode
  ) => {
    setMode(newMode);
    setResults([]);
    setSearchError(null);
  };

  return (
    <section
  className="
    relative
    flex
    min-h-[calc(100vh-4rem)]
    items-center
    overflow-hidden
    border-b
    border-zinc-200
    bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)]
    px-4
    sm:px-6
    lg:px-8
  "
>
  <div
    className="
      relative
      mx-auto
      flex
      w-full
      max-w-5xl
      flex-col
      items-center
      justify-center
      py-12
      text-center
      sm:py-14
      lg:py-16
    "
  >

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl lg:text-7xl">
          Find your place online.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
          Runtime is a technology platform for domains, cloud infrastructure
          and developer services. Register and manage domains today, with more
          tools launching soon.
        </p>

        <div className="mt-8 flex items-center rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              changeMode('register')
            }
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              mode === 'register'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-500 hover:text-zinc-950'
            }`}
          >
            Register
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode('transfer')
            }
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              mode === 'transfer'
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-500 hover:text-zinc-950'
            }`}
          >
            Transfer
          </button>
        </div>

        <form
          id="domain-search"
          onSubmit={search}
          className="mx-auto mt-7 flex w-full max-w-3xl items-center rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg"
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

                if (results.length) {
                  setResults([]);
                }

                if (searchError) {
                  setSearchError(
                    null
                  );
                }
              }}
              placeholder={
                mode === 'register'
                  ? 'Search for a domain name...'
                  : 'Search for a domain to transfer...'
              }
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-3 text-base text-zinc-950 outline-none placeholder:text-zinc-400 sm:py-4"
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
                ? 'Checking...'
                : mode ===
                    'register'
                  ? 'Search'
                  : 'Check'}
            </span>

            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : mode ===
              'register' ? (
              <Search className="h-5 w-5 sm:h-4 sm:w-4" />
            ) : (
              <MoveRight className="h-5 w-5 sm:h-4 sm:w-4" />
            )}
          </button>
        </form>

        {!results.length &&
          !loading && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {POPULAR_EXTENSIONS.map(
                (extension) => (
                  <div
                    key={extension}
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm"
                  >
                    <span className="font-semibold text-zinc-950">
                      {extension}
                    </span>

                    {prices[
                      extension
                    ] !==
                      undefined && (
                      <span className="ml-2 text-zinc-500">
                        $
                        {prices[
                          extension
                        ].toFixed(
                          2
                        )}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}

        {searchError && (
          <div className="mt-5 w-full max-w-3xl rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
            {searchError}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-lg">
            {results.map(
              (
                result,
                index
              ) => (
                <div
                  key={
                    result.domain
                  }
                  className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between ${
                    index !==
                    results.length -
                      1
                      ? 'border-b border-zinc-200'
                      : ''
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    {result.isAvailable && result.registrationEligible !== false ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                    )}

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-950">
                        {
                          result.domain
                        }
                      </p>

                      <p
                        className={`mt-1 text-sm ${
                          result.isAvailable && result.registrationEligible !== false
                            ? 'text-emerald-600'
                            : 'text-zinc-500'
                        }`}
                      >
                        {result.checkingFailed
                          ? result.reason
                          : result.isAvailable && result.registrationEligible === false
                            ? result.eligibilityReason || 'Not eligible for registration'
                            : result.isAvailable
                            ? result.registryApprovalRequired
                              ? 'Available to apply for registration'
                              : 'Available for registration'
                            : 'Already registered. If you own this domain, you can transfer it to us.'}
                      </p>
                      {result.isAvailable &&
                        result.registrationEligible !== false &&
                        requiresAssistedRegistration(
                          result.domain
                        ) && (
                          <p className="mt-1.5 max-w-md text-xs leading-5 text-zinc-500">
                            Additional documents are required,
                            including a stamped domain registration
                            request letter from the organisation.
                            Contact us and we’ll assist you.
                          </p>
                        )}
                    </div>
                  </div>

                  {!result.checkingFailed && (
                    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      {result.isAvailable &&
                        result.registrationEligible !== false &&
                        result.price !==
                          undefined && (
                          <div className="text-right">
                            <p className="font-semibold text-zinc-950">
                              $
                              {result.price.toFixed(
                                2
                              )}
                            </p>

                            <p className="text-xs text-zinc-500">
                              / year
                            </p>
                          </div>
                        )}

                      {result.isAvailable && result.registrationEligible !== false ? (
                        requiresAssistedRegistration(
                          result.domain
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              whatsappRegistration(
                                result.domain
                              )
                            }
                            className="flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9]"
                          >
                            <FaWhatsapp className="h-4 w-4" />
                            WhatsApp Us
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              register(
                                result.domain
                              )
                            }
                            className="flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9]"
                          >
                            Register
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )
                      ) : result.isAvailable ? (
                        <span className="text-xs font-medium text-zinc-500">Not registerable</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            transfer(
                              result.domain
                            )
                          }
                          className="flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9]"
                        >
                          Transfer
                          <MoveRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
};
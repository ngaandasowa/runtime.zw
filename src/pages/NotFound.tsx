import React, { useState } from 'react';

import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Globe2,
  MoveRight,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import {
  domainService,
  DomainAvailabilityResult,
} from '../services/DomainService';

import { useStore } from '../context/StoreContext';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const {
    setPendingRegisterDomain,
    setRegistrationModalOpen,
  } = useStore();

  /*
   * Keep the user's ORIGINAL input here.
   *
   * We do not modify this value when searching.
   */
  const [query, setQuery] = useState('');

  const [results, setResults] = useState<
    DomainAvailabilityResult[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /*
   * ------------------------------------------------------------
   * DOMAIN SEARCH
   * ------------------------------------------------------------
   */

  const search = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!query.trim()) return;

    setLoading(true);
    setResults([]);
    setError(null);

    try {
      /*
       * IMPORTANT:
       *
       * We pass the value to DomainService for cleaning/searching,
       * but we DO NOT call setQuery() here.
       *
       * Therefore the user's visible search input stays unchanged.
       */
      const searchResults =
        await domainService.searchDomains(query);

      const sorted = searchResults
        .map((result, index) => ({
          ...result,
          originalPosition: index,
        }))
        .sort((a, b) => {
          /*
           * Failed checks last.
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

          /*
           * Available domains first.
           */
          if (
            a.isAvailable !==
            b.isAvailable
          ) {
            return a.isAvailable
              ? -1
              : 1;
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
      console.error(
        '404 domain search error:',
        error
      );

      setError(
        'We could not complete the domain search. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * REGISTER
   * ------------------------------------------------------------
   */

  const registerDomain = (
    domain: string
  ) => {
    setPendingRegisterDomain(domain);
    setRegistrationModalOpen(true);
  };

  /*
   * ------------------------------------------------------------
   * TRANSFER
   * ------------------------------------------------------------
   */

  const transferDomain = (
    domain: string
  ) => {
    /*
     * This keeps your existing custom-transfer architecture.
     * Change DomainService's transfer route later when your
     * ordering system is completed.
     */
    domainService.transferDomain(domain);
  };

  return (
    <div className="bg-white">

      {/* ====================================================== */}
      {/* 404 HERO */}
      {/* ====================================================== */}

      <section
        className="
          relative
          overflow-hidden
          border-b
          border-zinc-200
          bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)]
          px-4
          sm:px-6
          lg:px-8
        "
      >
        {/* Decorative background */}
        <div
          aria-hidden="true"
          className="
            absolute
            left-1/2
            top-0
            h-130
            w-190
            -translate-x-1/2
            translate-y-[42%]
            rounded-full
            bg-[#3120ff]/10
            blur-3xl
          "
        />

        <div
          className="
            relative
            mx-auto
            flex
            min-h-120
            max-w-5xl
            flex-col
            items-center
            justify-center
            py-16
            text-center
            sm:min-h-130
          "
        >
          <p className="text-sm font-semibold text-[#3120ff]">
            404
          </p>

          <h1
            className="
              mt-3
              max-w-3xl
              text-4xl
              font-bold
              tracking-tight
              text-zinc-950
              sm:text-5xl
              lg:text-6xl
            "
          >
            Oops! We could not find the page
            you were looking for.
          </h1>

          <p
            className="
              mx-auto
              mt-5
              max-w-xl
              text-sm
              leading-6
              text-zinc-500
              sm:text-base
            "
          >
            The page may have moved or no longer exists.
            You can search for a domain or explore Runtime below.
          </p>

          {/* DOMAIN SEARCH */}
          <form
            onSubmit={search}
            className="
              mx-auto
              mt-8
              flex
              w-full
              max-w-3xl
              items-center
              rounded-2xl
              border
              border-zinc-200
              bg-white
              p-2
              shadow-lg
            "
          >
            <div
              className="
                flex
                min-w-0
                flex-1
                items-center
                gap-3
                px-3
                sm:px-4
              "
            >
              <Search
                className="
                  h-5
                  w-5
                  shrink-0
                  text-zinc-400
                "
              />

              <input
                value={query}
                onChange={(event) => {
                  /*
                   * Preserve EXACTLY what the user types.
                   *
                   * No lowercase conversion.
                   * No character replacement.
                   * No automatic domain formatting.
                   */
                  setQuery(event.target.value);

                  if (results.length) {
                    setResults([]);
                  }

                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="Search for a domain name..."
                autoComplete="off"
                spellCheck={false}
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  py-3
                  text-base
                  text-zinc-950
                  outline-none
                  placeholder:text-zinc-400
                  sm:py-4
                "
              />
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !query.trim()
              }
              className="
                flex
                h-12
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#3120ff]
                px-4
                text-sm
                font-semibold
                text-white
                transition-colors
                hover:bg-[#2819d9]
                disabled:cursor-not-allowed
                disabled:opacity-50
                sm:px-6
              "
            >
              <span className="hidden sm:inline">
                {loading
                  ? 'Checking...'
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

      {/* ====================================================== */}
      {/* DOMAIN RESULTS */}
      {/* ====================================================== */}

      {results.length > 0 && (
        <section className="border-b border-zinc-200 px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">

            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-950">
                Domain results
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Results for{' '}
                <span className="font-medium text-zinc-700">
                  {query}
                </span>
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {results.map(
                (result, index) => (
                  <div
                    key={result.domain}
                    className={`
                      flex
                      flex-col
                      gap-4
                      p-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      ${
                        index !==
                        results.length - 1
                          ? 'border-b border-zinc-200'
                          : ''
                      }
                    `}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {result.isAvailable ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
                      )}

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-950">
                          {result.domain}
                        </p>

                        <p
                          className={`mt-1 text-sm ${
                            result.isAvailable
                              ? 'text-emerald-600'
                              : 'text-zinc-500'
                          }`}
                        >
                          {result.checkingFailed
                            ? result.reason
                            : result.isAvailable
                              ? 'Available for registration'
                              : 'Already registered. If you own this domain, you can transfer it to us.'}
                        </p>
                      </div>
                    </div>

                    {!result.checkingFailed && (
                      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">

                        {result.isAvailable &&
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

                        {result.isAvailable ? (
                          <button
                            type="button"
                            onClick={() =>
                              registerDomain(
                                result.domain
                              )
                            }
                            className="flex items-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2819d9]"
                          >
                            Register

                            <ArrowRight className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              transferDomain(
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
          </div>
        </section>
      )}

      {/* ====================================================== */}
      {/* USEFUL LINKS */}
      {/* ====================================================== */}

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-6xl">

          <div>
            <h2 className="text-xl font-semibold text-zinc-950">
              Here&apos;s somewhere useful to go
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Explore some of the most useful parts of Runtime.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {/* DOMAINS */}
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/#domain-search'
                )
              }
              className="
                group
                rounded-2xl
                border
                border-zinc-200
                bg-white
                p-6
                text-left
                transition-all
                hover:-translate-y-0.5
                hover:border-[#3120ff]/30
                hover:shadow-lg
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#3120ff]/10
                  text-[#3120ff]
                "
              >
                <Globe2 className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                Domains
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Search and register your next domain name.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3120ff]">
                Search domains
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* PRICING */}
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/domain-pricing'
                )
              }
              className="
                group
                rounded-2xl
                border
                border-zinc-200
                bg-white
                p-6
                text-left
                transition-all
                hover:-translate-y-0.5
                hover:border-[#3120ff]/30
                hover:shadow-lg
              "
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <CircleHelp className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                Domain Pricing
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                View registration, renewal and transfer pricing.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3120ff]">
                View pricing
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* WHOIS */}
            <button
              type="button"
              onClick={() =>
                navigate('/whois')
              }
              className="
                group
                rounded-2xl
                border
                border-zinc-200
                bg-white
                p-6
                text-left
                transition-all
                hover:-translate-y-0.5
                hover:border-[#3120ff]/30
                hover:shadow-lg
              "
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                WHOIS Lookup
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Check registration and WHOIS information for a domain.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3120ff]">
                Lookup domain
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* SUPPORT */}
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/contact'
                )
              }
              className="
                group
                rounded-2xl
                border
                border-zinc-200
                bg-white
                p-6
                text-left
                transition-all
                hover:-translate-y-0.5
                hover:border-[#3120ff]/30
                hover:shadow-lg
              "
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                <CircleHelp className="h-5 w-5" />
              </div>

              <h3 className="mt-5 font-semibold text-zinc-950">
                Customer Support
              </h3>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Need some help? Get in touch with Runtime support.
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#3120ff]">
                Contact us
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

          </div>
        </div>
      </section>
    </div>
  );
};
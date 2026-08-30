import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Search,
} from 'lucide-react';

import {
  domainService,
  DomainPricingRow,
} from '../services/DomainService';

export const DomainPricing: React.FC =
  () => {
    const [pricing, setPricing] =
      useState<
        DomainPricingRow[]
      >([]);

    const [loading, setLoading] =
      useState(true);

    const [query, setQuery] =
      useState('');

    const [error, setError] =
      useState<string | null>(
        null
      );

    useEffect(() => {
      const load = async () => {
        try {
          const data =
            await domainService.getPricing();

          /*
           * Runtime Zimbabwe pricing overrides.
           *
           * Keep the upstream API for every other extension,
           * but Runtime controls the public registration and
           * renewal prices for these Zimbabwe extensions.
           */
          const runtimeZimbabwePrices: Record<
            string,
            {
              register: number;
              renew: number;
            }
          > = {
            '.co.zw': {
              register: 2,
              renew: 2,
            },
            '.org.zw': {
              register: 3,
              renew: 3,
            },
            '.ac.zw': {
              register: 3,
              renew: 3,
            },
          };

          const adjustedPricing =
            data.map((item) => {
              const override =
                runtimeZimbabwePrices[
                  item.tld.toLowerCase()
                ];

              if (!override) {
                return item;
              }

              return {
                ...item,
                register:
                  override.register,
                renew:
                  override.renew,
              };
            });

          setPricing(
            adjustedPricing
          );
        } catch (error) {
          console.error(error);

          setError(
            'Unable to load domain pricing right now.'
          );
        } finally {
          setLoading(false);
        }
      };

      load();
    }, []);

    const filteredPricing =
      useMemo(() => {
        const search =
          query
            .trim()
            .toLowerCase();

        if (!search) {
          return pricing;
        }

        return pricing.filter(
          (item) =>
            item.tld.includes(
              search
            )
        );
      }, [pricing, query]);

    return (
      <main className="min-h-screen bg-white">
        <section className="border-b border-zinc-200 bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
              Domain registration pricing.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-600">
              Compare registration,
              renewal and transfer
              prices for .co.zw,
              .org.zw, .ac.zw and
              other supported domains.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">
                  All extensions
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Prices shown are
                  for one year.
                </p>
              </div>

              <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 shadow-sm">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />

                <input
                  value={query}
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search extension"
                  className="min-w-0 flex-1 py-3 text-sm outline-none placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {/* Header */}
              <div className="grid grid-cols-4 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:px-5 sm:text-xs">
                <span>
                  Extension
                </span>

                <span className="text-center">
                  Register
                </span>

                <span className="text-center">
                  Renew
                </span>

                <span className="text-center">
                  Transfer
                </span>
              </div>

              {/* Loading */}
              {loading && (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                  Loading domain pricing...
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="px-5 py-12 text-center text-sm text-zinc-500">
                  {error}
                </div>
              )}

              {/* Pricing Rows */}
              {!loading &&
                !error &&
                filteredPricing.map(
                  (item, index) => (
                    <div
                      key={item.tld}
                      className={`grid grid-cols-4 items-center px-3 py-4 sm:px-5 sm:py-5 ${
                        index !== filteredPricing.length - 1
                          ? 'border-b border-zinc-200'
                          : ''
                      }`}
                    >
                      {/* Extension */}
                      <p className="truncate font-mono text-sm font-semibold text-zinc-950 sm:text-lg">
                        {item.tld}
                      </p>

                      {/* Register */}
                      <p className="text-center text-xs font-semibold text-zinc-950 sm:text-base">
                        {item.register !== undefined
                          ? `$${item.register.toFixed(2)}`
                          : '—'}
                      </p>

                      {/* Renew */}
                      <p className="text-center text-xs font-semibold text-zinc-950 sm:text-base">
                        {item.renew !== undefined
                          ? `$${item.renew.toFixed(2)}`
                          : '—'}
                      </p>

                      {/* Transfer */}
                      <p className="text-center text-xs font-semibold text-zinc-950 sm:text-base">
                        {item.transfer !== undefined
                          ? `$${item.transfer.toFixed(2)}`
                          : '—'}
                      </p>
                    </div>
                  )
                )}

              {/* Empty */}
              {!loading &&
                !error &&
                filteredPricing.length === 0 && (
                  <div className="px-5 py-12 text-center text-sm text-zinc-500">
                    No matching extension found.
                  </div>
                )}
            </div>
          </div>
        </section>
      </main>
    );
  };
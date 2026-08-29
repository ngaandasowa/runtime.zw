import React, {
  useMemo,
  useState,
} from 'react';

import {
  Search,
  UserRound,
  ArrowRight,
  Globe2,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

export const AdminCustomers: React.FC =
  () => {
    const {
      users,
      domains,
      openCustomerAccount,
    } = useStore();

    const [
      search,
      setSearch,
    ] = useState('');

    const customers =
      useMemo(() => {
        const query =
          search
            .trim()
            .toLowerCase();

        return users
          .filter(
            (user) =>
              user.role ===
              'customer'
          )
          .filter((user) => {
            if (!query) {
              return true;
            }

            return [
              user.name,
              user.email,
              user.organisation,
              user.phone,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              );
          });
      }, [
        users,
        search,
      ]);

    return (
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#3120ff]">
            Customer management
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">
            Customers
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            View customer accounts and manage their services.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search customers..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#3120ff]"
          />
        </div>

        {/* EMPTY */}
        {customers.length === 0 && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-zinc-400" />

            <p className="mt-3 font-semibold text-zinc-950">
              No customers found
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Customer accounts will appear here.
            </p>
          </div>
        )}

        {/* CUSTOMER LIST */}
        {customers.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

            {customers.map(
              (customer) => {
                const customerDomains =
                  domains.filter(
                    (domain) =>
                      domain.user_id ===
                        customer.id &&
                      ![
                        'cancelled',
                        'registry_rejected',
                        'replaced',
                      ].includes(
                        String(
                          domain.status
                        )
                      )
                  );

                return (
                  <div
                    key={
                      customer.id
                    }
                    className="flex flex-col gap-4 border-b border-zinc-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                        <UserRound className="h-5 w-5 text-zinc-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-semibold text-zinc-950">
                          {customer.name ||
                            'Customer'}
                        </p>

                        <p className="truncate text-sm text-zinc-500">
                          {
                            customer.email
                          }
                        </p>

                        <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                          <Globe2 className="h-3.5 w-3.5" />

                          <span>
                            {
                              customerDomains.length
                            }{' '}
                            {customerDomains.length ===
                            1
                              ? 'domain'
                              : 'domains'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openCustomerAccount(
                          customer.id
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
                    >
                      Open account

                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              }
            )}

          </div>
        )}

      </div>
    );
  };
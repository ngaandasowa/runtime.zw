import React, { useState } from 'react';

import {
  BarChart3,
  CreditCard,
  DollarSign,
  FileText,
  Globe2,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Server,
  Settings,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  AdminDashboard,
} from './AdminDashboard';

import {
  AdminAnalytics,
} from './AdminAnalytics';

import {
  AdminRegistryManager,
} from './AdminRegistryManager';

import {
  AdminDomains,
} from './AdminDomains';

import {
  AdminPricing,
} from './AdminPricing';

import {
  AdminOrdersPayments,
} from './AdminOrdersPayments';

import {
  AdminNameservers,
} from './AdminNameservers';

import {
  AdminSettings,
} from './AdminSettings';

import {
  AdminCustomers,
} from './AdminCustomers';

import {
  AdminCustomerAccount,
} from './AdminCustomerAccount';

import {
  AdminEmailCampaigns,
} from './AdminEmailCampaigns';

type NavItem = {
  id:
    | 'dashboard'
    | 'analytics'
    | 'customers'
    | 'orders'
    | 'domains'
    | 'registry'
    | 'pricing'
    | 'nameservers'
    | 'email_campaigns'
    | 'settings';
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  badge?: number;
};

export const AdminShell:
  React.FC = () => {
    const {
      adminSubView,
      setAdminSubView,
      registryRequests,
      payments,
      logout,
    } = useStore();

    const [
      mobileOpen,
      setMobileOpen,
    ] = useState(false);

    const registryCount =
      registryRequests.filter(
        (request) =>
          request.status ===
            'ready' ||
          request.status ===
            'draft'
      ).length;

    const paymentCount =
      payments.filter(
        (payment) =>
          payment.status ===
            'pending' ||
          payment.status ===
            'pending_verification'
      ).length;

    const navItems: NavItem[] = [
      {
        id: 'dashboard',
        label: 'Overview',
        icon: LayoutDashboard,
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
      },
      {
        id: 'customers',
        label: 'Customers',
        icon: Users,
      },
      {
        id: 'orders',
        label: 'Payments',
        icon: CreditCard,
        badge: paymentCount,
      },
      {
        id: 'domains',
        label: 'Domains',
        icon: Globe2,
      },
      {
        id: 'registry',
        label: 'ZISPA Registry',
        icon: FileText,
        badge: registryCount,
      },
      {
        id: 'pricing',
        label: 'Pricing',
        icon: DollarSign,
      },
      {
        id: 'nameservers',
        label: 'Nameservers',
        icon: Server,
      },
      {
        id: 'email_campaigns',
        label: 'Email Campaigns',
        icon: Mail,
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
      },
    ];

    const currentLabel =
      navItems.find(
        (item) =>
          item.id ===
          adminSubView
      )?.label || 'Overview';

    const goTo = (
      id: NavItem['id']
    ) => {
      setAdminSubView(id);
      setMobileOpen(false);

      requestAnimationFrame(
        () => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto',
          });
        }
      );
    };

    return (
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">

        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3120ff]">
              Runtime Admin
            </p>

            <p className="truncate text-sm font-bold text-zinc-950">
              {currentLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileOpen(true)
            }
            aria-label="Open admin menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* MOBILE OVERLAY */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() =>
                setMobileOpen(false)
              }
              className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            />

            <aside className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col border-r border-zinc-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                    <ShieldAlert className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-zinc-950">
                      Runtime Admin
                    </p>

                    <p className="text-[11px] text-zinc-500">
                      Administration
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  aria-label="Close admin menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {navItems.map(
                    (item) => (
                      <NavButton
                        key={item.id}
                        active={
                          adminSubView ===
                          item.id
                        }
                        icon={item.icon}
                        label={item.label}
                        badge={item.badge}
                        onClick={() =>
                          goTo(
                            item.id
                          )
                        }
                      />
                    )
                  )}
                </div>
              </nav>

              <div className="border-t border-zinc-200 p-3">
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        <div className="md:flex">

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
            <div className="p-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3120ff]/10 text-[#3120ff]">
                    <img
                      src="/android-chrome-192x192.png"
                      alt="Runtime Admin"
                      className="h-8 w-8"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-zinc-950">
                      Runtime Admin
                    </p>

                    <p className="text-[10px] text-zinc-500">
                      Administration
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="space-y-1">
                {navItems.map(
                  (item) => (
                    <NavButton
                      key={item.id}
                      active={
                        adminSubView ===
                        item.id
                      }
                      icon={item.icon}
                      label={item.label}
                      badge={item.badge}
                      onClick={() =>
                        goTo(
                          item.id
                        )
                      }
                    />
                  )
                )}
              </div>
            </nav>

            <div className="border-t border-zinc-200 p-3">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* CONTENT */}
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-7xl">
              {adminSubView ===
                'dashboard' && (
                <AdminDashboard />
              )}

              {adminSubView ===
                'analytics' && (
                <AdminAnalytics />
              )}

              {adminSubView ===
                'orders' && (
                <AdminOrdersPayments />
              )}

              {adminSubView ===
                'domains' && (
                <AdminDomains />
              )}

              {adminSubView ===
                'customers' && (
                <AdminCustomers />
              )}

              {adminSubView ===
                'customer_account' && (
                <AdminCustomerAccount />
              )}

              {adminSubView ===
                'registry' && (
                <AdminRegistryManager />
              )}

              {adminSubView ===
                'pricing' && (
                <AdminPricing />
              )}

              {adminSubView ===
                'nameservers' && (
                <AdminNameservers />
              )}

              {adminSubView ===
                'email_campaigns' && (
                <AdminEmailCampaigns />
              )}

              {adminSubView ===
                'settings' && (
                <AdminSettings />
              )}


            </div>
          </main>
        </div>
      </div>
    );
  };

const NavButton: React.FC<{
  active: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  badge?: number;
  onClick: () => void;
}> = ({
  active,
  icon: Icon,
  label,
  badge = 0,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
      active
        ? 'bg-[#3120ff] text-white'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
    }`}
  >
    <span className="flex min-w-0 items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0" />

      <span className="truncate">
        {label}
      </span>
    </span>

    {badge > 0 && (
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          active
            ? 'bg-white/20 text-white'
            : 'bg-[#3120ff]/10 text-[#3120ff]'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);
import React, {
  useMemo,
  useState,
} from 'react';

import {
  ChevronRight,
  FileText,
  Globe2,
  Key,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Plus,
  Receipt,
  User,
  Webhook,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  DashboardOverview,
} from './DashboardOverview';

import {
  DashboardDomains,
} from './DashboardDomains';

import {
  DashboardBilling,
} from './DashboardBilling';

import {
  DashboardAccount,
} from './DashboardAccount';

import {
  ComingSoonView,
} from './ComingSoonView';

type MainView =
  | 'overview'
  | 'domains'
  | 'billing'
  | 'account'
  | 'build_projects'
  | 'build_deployments'
  | 'build_databases'
  | 'develop_keys'
  | 'develop_webhooks'
  | 'develop_logs';

type NavItem = {
  id: MainView;
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  soon?: boolean;
};

export const DashboardShell:
  React.FC = () => {
    const {
      currentUser,
      dashboardSubView,
      setDashboardSubView,
      setRegistrationModalOpen,
      logout,
    } = useStore();

    const [
      mobileOpen,
      setMobileOpen,
    ] = useState(false);

    const primaryNav: NavItem[] = [
      {
        id: 'overview',
        label: 'Overview',
        icon: LayoutDashboard,
      },
      {
        id: 'domains',
        label: 'My Domains',
        icon: Globe2,
      },
      {
        id: 'billing',
        label: 'Orders & Payments',
        icon: Receipt,
      },
      {
        id: 'account',
        label: 'Account',
        icon: User,
      },
    ];

    const futureNav: NavItem[] = [
      {
        id: 'build_projects',
        label: 'Projects',
        icon: Layers,
        soon: true,
      },
      {
        id: 'build_deployments',
        label: 'Deployments',
        icon: ChevronRight,
        soon: true,
      },
      {
        id: 'build_databases',
        label: 'Databases',
        icon: ChevronRight,
        soon: true,
      },
      {
        id: 'develop_keys',
        label: 'API Keys',
        icon: Key,
        soon: true,
      },
      {
        id: 'develop_webhooks',
        label: 'Webhooks',
        icon: Webhook,
        soon: true,
      },
      {
        id: 'develop_logs',
        label: 'Logs',
        icon: FileText,
        soon: true,
      },
    ];

    const allNav =
      useMemo(
        () => [
          ...primaryNav,
          ...futureNav,
        ],
        []
      );

    const currentLabel =
      allNav.find(
        (item) =>
          item.id ===
          dashboardSubView
      )?.label || 'Overview';

    const goTo = (
      id: MainView
    ) => {
      setDashboardSubView(id);
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

    const openRegistration =
      () => {
        setMobileOpen(false);
        setRegistrationModalOpen(
          true
        );
      };

    return (
      <div className="min-h-screen bg-[#FAFAFA] text-zinc-900">

        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3120ff]">
              Runtime
            </p>

            <p className="truncate text-sm font-bold text-zinc-950">
              {currentLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                openRegistration
              }
              aria-label="Register domain"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3120ff] text-white"
            >
              <Plus className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open dashboard menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
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
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-zinc-950">
                    {currentUser?.name ||
                      'Runtime Account'}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {currentUser?.email}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setMobileOpen(false)
                  }
                  aria-label="Close dashboard menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <button
                  type="button"
                  onClick={
                    openRegistration
                  }
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-3 text-xs font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Register Domain
                </button>

                <NavGroup
                  title="Account"
                  items={
                    primaryNav
                  }
                  active={
                    dashboardSubView
                  }
                  onSelect={
                    goTo
                  }
                />

                <div className="mt-5">
                  <NavGroup
                    title="Coming Soon"
                    items={
                      futureNav
                    }
                    active={
                      dashboardSubView
                    }
                    onSelect={
                      goTo
                    }
                  />
                </div>
              </div>

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
            <div className="border-b border-zinc-200 p-4">
              <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#3120ff]/10 text-sm font-bold text-[#3120ff]">
                  {currentUser?.name
                    ?.charAt(0)
                    .toUpperCase() ||
                    'R'}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-zinc-950">
                    {currentUser?.name}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              <button
                type="button"
                onClick={
                  openRegistration
                }
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#2819d9]"
              >
                <Plus className="h-4 w-4" />
                Register Domain
              </button>

              <NavGroup
                title="Account"
                items={
                  primaryNav
                }
                active={
                  dashboardSubView
                }
                onSelect={
                  goTo
                }
              />

              <div className="mt-5">
                <NavGroup
                  title="Coming Soon"
                  items={
                    futureNav
                  }
                  active={
                    dashboardSubView
                  }
                  onSelect={
                    goTo
                  }
                />
              </div>
            </div>

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
              {dashboardSubView ===
                'overview' && (
                <DashboardOverview />
              )}

              {dashboardSubView ===
                'domains' && (
                <DashboardDomains />
              )}

              {dashboardSubView ===
                'billing' && (
                <DashboardBilling />
              )}

              {dashboardSubView ===
                'account' && (
                <DashboardAccount />
              )}

              {dashboardSubView ===
                'build_projects' && (
                <ComingSoonView
                  category="Build"
                  moduleName="Projects & Workspaces"
                  description="Project and deployment tools are coming to Runtime."
                  architectureSpecs={[
                    'Project workspaces',
                    'Environment management',
                    'Team access',
                  ]}
                />
              )}

              {dashboardSubView ===
                'build_deployments' && (
                <ComingSoonView
                  category="Build"
                  moduleName="Deployments"
                  description="Application deployment tools are coming to Runtime."
                  architectureSpecs={[
                    'Application deployments',
                    'Build logs',
                    'SSL and routing',
                  ]}
                />
              )}

              {dashboardSubView ===
                'build_databases' && (
                <ComingSoonView
                  category="Build"
                  moduleName="Databases"
                  description="Managed database services are coming to Runtime."
                  architectureSpecs={[
                    'Managed databases',
                    'Backups',
                    'Usage visibility',
                  ]}
                />
              )}

              {dashboardSubView ===
                'develop_keys' && (
                <ComingSoonView
                  category="Develop"
                  moduleName="API Keys"
                  description="Developer API access is coming to Runtime."
                  architectureSpecs={[
                    'Scoped API keys',
                    'Access controls',
                    'Token management',
                  ]}
                />
              )}

              {dashboardSubView ===
                'develop_webhooks' && (
                <ComingSoonView
                  category="Develop"
                  moduleName="Webhooks"
                  description="Event notifications and webhooks are coming to Runtime."
                  architectureSpecs={[
                    'Event notifications',
                    'Delivery history',
                    'Webhook management',
                  ]}
                />
              )}

              {dashboardSubView ===
                'develop_logs' && (
                <ComingSoonView
                  category="Develop"
                  moduleName="Logs"
                  description="Platform logs and activity history are coming to Runtime."
                  architectureSpecs={[
                    'Activity logs',
                    'Event filters',
                    'Export options',
                  ]}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    );
  };

const NavGroup: React.FC<{
  title: string;
  items: NavItem[];
  active: string;
  onSelect: (
    id: MainView
  ) => void;
}> = ({
  title,
  items,
  active,
  onSelect,
}) => (
  <div>
    <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
      {title}
    </p>

    <div className="space-y-1">
      {items.map(
        (item) => {
          const Icon =
            item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                onSelect(
                  item.id
                )
              }
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${
                active ===
                item.id
                  ? 'bg-[#3120ff] text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0" />

                <span className="truncate">
                  {item.label}
                </span>
              </span>

              {item.soon && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                    active ===
                    item.id
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  Soon
                </span>
              )}
            </button>
          );
        }
      )}
    </div>
  </div>
);
import React from 'react';
import { 
  LayoutDashboard, 
  Globe, 
  Layers, 
  Cpu, 
  Database, 
  Terminal, 
  Key, 
  Webhook, 
  FileText, 
  Receipt, 
  User, 
  Plus, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DashboardOverview } from './DashboardOverview';
import { DashboardDomains } from './DashboardDomains';
import { DashboardBilling } from './DashboardBilling';
import { DashboardAccount } from './DashboardAccount';
import { ComingSoonView } from './ComingSoonView';

export const DashboardShell: React.FC = () => {
  const { 
    currentUser, 
    dashboardSubView, 
    setDashboardSubView, 
    setRegistrationModalOpen,
    setActiveView,
    logout 
  } = useStore();

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-zinc-200 bg-white p-4 flex flex-col justify-between shrink-0 shadow-2xs">
        <div className="space-y-6">
          
          {/* User Brief */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-[#3120ff] font-bold border border-red-200">
                {currentUser?.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-zinc-950 truncate">{currentUser?.name}</div>
                <div className="text-[10px] font-mono text-zinc-500 truncate">{currentUser?.email}</div>
              </div>
            </div>
          </div>

          {/* Nav Group: Overview */}
          <div className="space-y-1">
            <button
              onClick={() => setDashboardSubView('overview')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                dashboardSubView === 'overview'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </button>
          </div>

          {/* Nav Group: Build (Coming Soon) */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Build</span>
              <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-semibold">Soon</span>
            </div>
            
            <button
              onClick={() => setDashboardSubView('build_projects')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'build_projects'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Layers className="h-3.5 w-3.5" />
                <span>Projects</span>
              </div>
            </button>

            <button
              onClick={() => setDashboardSubView('build_deployments')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'build_deployments'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Cpu className="h-3.5 w-3.5" />
                <span>Deployments</span>
              </div>
            </button>

            <button
              onClick={() => setDashboardSubView('build_databases')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'build_databases'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Database className="h-3.5 w-3.5" />
                <span>Databases</span>
              </div>
            </button>
          </div>

          {/* Nav Group: Domains (Active Live Product) */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#3120ff] flex items-center justify-between">
              <span>Domains</span>
              <span className="text-[9px] bg-red-50 text-[#3120ff] px-1.5 py-0.5 rounded font-bold border border-red-200">Active</span>
            </div>

            <button
              onClick={() => setDashboardSubView('domains')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'domains'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>My Domains (.co.zw)</span>
            </button>

            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#3120ff] transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Domain</span>
            </button>
          </div>

          {/* Nav Group: Develop (Coming Soon) */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Develop</span>
              <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-semibold">Soon</span>
            </div>

            <button
              onClick={() => setDashboardSubView('develop_keys')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'develop_keys'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Key className="h-3.5 w-3.5" />
              <span>API Keys</span>
            </button>

            <button
              onClick={() => setDashboardSubView('develop_webhooks')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'develop_webhooks'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Webhook className="h-3.5 w-3.5" />
              <span>Webhooks</span>
            </button>

            <button
              onClick={() => setDashboardSubView('develop_logs')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'develop_logs'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Logs</span>
            </button>
          </div>

          {/* Nav Group: Billing */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Billing
            </div>

            <button
              onClick={() => setDashboardSubView('billing')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'billing'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <Receipt className="h-3.5 w-3.5" />
              <span>Orders &amp; Receipts</span>
            </button>
          </div>

          {/* Nav Group: Account */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Account
            </div>

            <button
              onClick={() => setDashboardSubView('account')}
              className={`w-full flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                dashboardSubView === 'account'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Profile &amp; Security</span>
            </button>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-zinc-200">
          <div className="text-[10px] font-mono text-zinc-400 text-center pb-2">
            Runtime Engine v1.0
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {dashboardSubView === 'overview' && <DashboardOverview />}
        {dashboardSubView === 'domains' && <DashboardDomains />}
        {dashboardSubView === 'billing' && <DashboardBilling />}
        {dashboardSubView === 'account' && <DashboardAccount />}
        
        {/* Placeholder Coming Soon Views */}
        {dashboardSubView === 'build_projects' && (
          <ComingSoonView
            category="Build"
            moduleName="Projects &amp; Workspaces"
            description="Manage multi-tenant software projects, environments (production, staging, preview), and shared team resources."
            architectureSpecs={[
              'Unified environment variables & secret vaulting',
              'Git repository webhooks (GitHub, GitLab, Self-hosted Git)',
              'Domain routing bindings to specific build branches',
              'Collaborator role-based permissions (Super Admin, Developer, Viewer)'
            ]}
          />
        )}

        {dashboardSubView === 'build_deployments' && (
          <ComingSoonView
            category="Build"
            moduleName="Application Deployments"
            description="Zero-config containerized deployments for Laravel, Node.js, Python, and Go microservices."
            architectureSpecs={[
              'Instant build pipeline execution via isolated container runners',
              'Live terminal streaming for stdout/stderr build logs',
              'Automated SSL wildcard certificate generation',
              'Rolling zero-downtime traffic switches'
            ]}
          />
        )}

        {dashboardSubView === 'build_databases' && (
          <ComingSoonView
            category="Build"
            moduleName="Managed Cloud Databases"
            description="Dedicated and serverless PostgreSQL, Redis, and MySQL clusters with automated backup snapshots."
            architectureSpecs={[
              'Point-in-time recovery and snapshot replication',
              'Sub-millisecond query caching layer',
              'Private VPC connection pooling',
              'Database metrics: active connections, I/O latency, storage allocation'
            ]}
          />
        )}

        {dashboardSubView === 'develop_keys' && (
          <ComingSoonView
            category="Develop"
            moduleName="Developer API Keys"
            description="Generate scoped tokens to interact with Runtime's REST APIs for domain registration and cloud automation."
            architectureSpecs={[
              'Granular permission scopes (domains:read, domains:write, dns:manage, compute:deploy)',
              'IP whitelist restrictions for programmatic tokens',
              'Token rotation & automated expiry policies',
              'Real-time token request rate-limiting'
            ]}
          />
        )}

        {dashboardSubView === 'develop_webhooks' && (
          <ComingSoonView
            category="Develop"
            moduleName="Event Webhooks"
            description="Receive real-time HTTP callbacks when domains are delegated by domain service, DNS records update, or bills renew."
            architectureSpecs={[
              'HMAC-SHA256 request payload verification',
              'Automatic exponential backoff retry policy',
              'Webhook event log inspection and manual payload redelivery',
              'Events: domain.registered, domain.confirmed, payment.verified, invoice.created'
            ]}
          />
        )}

        {dashboardSubView === 'develop_logs' && (
          <ComingSoonView
            category="Develop"
            moduleName="Platform Telemetry &amp; Logs"
            description="Unified queryable observability logs for all API requests, domain updates, and infrastructure events."
            architectureSpecs={[
              'Structured JSON log streaming',
              'Filter by actor, domain, HTTP status, and response latency',
              'Export audit logs for compliance & regulatory auditing',
              'Integration with Grafana / Prometheus / OpenTelemetry'
            ]}
          />
        )}
      </main>

    </div>
  );
};

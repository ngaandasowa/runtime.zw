import React from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Globe, 
  FileText, 
  DollarSign, 
  CreditCard, 
  Server, 
  Settings, 
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AdminDashboard } from './AdminDashboard';
import { AdminRegistryManager } from './AdminRegistryManager';
import { AdminDomains } from './AdminDomains';
import { AdminPricing } from './AdminPricing';
import { AdminOrdersPayments } from './AdminOrdersPayments';
import { AdminNameservers } from './AdminNameservers';
import { AdminSettings } from './AdminSettings';

export const AdminShell: React.FC = () => {
  const { 
    adminSubView, 
    setAdminSubView, 
    setActiveView, 
    registryRequests,
    logout 
  } = useStore();

  const pendingRegistryCount = registryRequests.filter(r => r.status === 'ready' || r.status === 'draft').length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 flex flex-col md:flex-row">
      
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 border-r border-zinc-200 bg-white p-4 flex flex-col justify-between shrink-0 shadow-2xs">
        <div className="space-y-6">
          
          {/* Admin Header Badge */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-[#3120ff] font-bold border border-red-200">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-950">Runtime Admin</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#3120ff]">REGISTRAR CONSOLE</div>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <div className="space-y-1 text-xs">
            
            <button
              onClick={() => setAdminSubView('dashboard')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'dashboard'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setAdminSubView('registry')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'registry'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="h-4 w-4" />
                <span>ZISPA Registry</span>
              </div>
              {pendingRegistryCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  adminSubView === 'registry' ? 'bg-white/20 text-white' : 'bg-red-100 text-[#3120ff]'
                }`}>
                  {pendingRegistryCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setAdminSubView('domains')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'domains'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Globe className="h-4 w-4" />
              <span>All Domains</span>
            </button>

            <button
              onClick={() => setAdminSubView('pricing')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'pricing'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Pricing Manager</span>
            </button>

            <button
              onClick={() => setAdminSubView('orders')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'orders'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Orders &amp; Payments</span>
            </button>

            <button
              onClick={() => setAdminSubView('nameservers')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'nameservers'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Server className="h-4 w-4" />
              <span>Platform Nameservers</span>
            </button>

            <button
              onClick={() => setAdminSubView('settings')}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-bold transition ${
                adminSubView === 'settings'
                  ? 'bg-[#3120ff] text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>

          </div>

        </div>

        {/* Bottom actions */}
        <div className="pt-4 border-t border-zinc-200 space-y-2">
          <button
            onClick={() => setActiveView('dashboard')}
            className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100 rounded-xl transition border border-zinc-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Exit to Customer App</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-1.5 text-xs font-semibold text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {adminSubView === 'dashboard' && <AdminDashboard />}
        {adminSubView === 'registry' && <AdminRegistryManager />}
        {adminSubView === 'domains' && <AdminDomains />}
        {adminSubView === 'pricing' && <AdminPricing />}
        {adminSubView === 'orders' && <AdminOrdersPayments />}
        {adminSubView === 'nameservers' && <AdminNameservers />}
        {adminSubView === 'settings' && <AdminSettings />}
      </main>

    </div>
  );
};

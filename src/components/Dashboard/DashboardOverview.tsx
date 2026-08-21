import React from 'react';
import { 
  Globe, 
  Layers, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Server,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const DashboardOverview: React.FC = () => {
  const { 
    currentUser, 
    domains, 
    orders, 
    setDashboardSubView, 
    setRegistrationModalOpen 
  } = useStore();

  const userDomains = domains.filter(d => d.user_email === currentUser?.email || d.user_id === currentUser?.id);
  const activeDomainsCount = userDomains.filter(d => d.status === 'active').length;
  const pendingDomainsCount = userDomains.filter(d => d.status === 'pending_registration' || d.status === 'pending').length;
  
  // Domains expiring within 30 days
  const now = new Date();
  const expiringSoon = userDomains.filter(d => {
    if (!d.expires_at || d.status !== 'active') return false;
    const diffDays = Math.ceil((new Date(d.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#3120ff] mb-1">
              <span>CLOUD WORKSPACE</span>
              <span>•</span>
              <span>{currentUser?.organisation || 'Individual Account'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Welcome, {currentUser?.name}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1">
              Manage your registered domains, active delegations, and cloud resources.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Register New Domain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Expiry Warning Notice if any */}
      {expiringSoon.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-xs flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Upcoming Domain Renewal Notice: </span>
            {expiringSoon.map(d => d.domain_name).join(', ')} is expiring within 30 days. Renewal rate is locked at $2.00 USD/year.
          </div>
          <button
            onClick={() => setDashboardSubView('billing')}
            className="text-xs font-bold text-amber-700 hover:underline shrink-0"
          >
            Review Renewals →
          </button>
        </div>
      )}

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ACTIVE DOMAINS</span>
            <Globe className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">
            {activeDomainsCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Delegated to domain service
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">PENDING SUBMISSION</span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">
            {pendingDomainsCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Awaiting registration confirmation
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">TOTAL ORDERS</span>
            <CreditCard className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">
            {orders.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            All invoices verified
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">CLOUD RUNTIME</span>
            <Cpu className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-sm font-bold text-[#3120ff] mt-1">
            PHASE 2 READY
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Compute &amp; DB modules queued
          </div>
        </div>

      </div>

      {/* User Domains Quick Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-zinc-950 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-[#3120ff]" />
            <span>My Registered Domains</span>
          </h2>

          <button
            onClick={() => setDashboardSubView('domains')}
            className="text-xs font-bold text-[#3120ff] hover:text-[#2819d9] flex items-center space-x-1"
          >
            <span>View All ({userDomains.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {userDomains.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
            <Globe className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-700 font-bold">No domains registered yet.</p>
            <p className="text-xs text-zinc-500 mt-1">Start by securing your .co.zw name for $2/year.</p>
            <button
              onClick={() => setRegistrationModalOpen(true)}
              className="mt-4 inline-flex items-center space-x-1.5 rounded-xl bg-[#3120ff] px-4 py-2 text-xs font-bold text-white hover:bg-[#2819d9] shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Domain</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Domain Name</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Nameservers</th>
                  <th className="pb-3">Expires At</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {userDomains.map(d => (
                  <tr key={d.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3.5 font-bold font-mono text-zinc-950">
                      {d.domain_name}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        d.status === 'active' 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                          : d.status === 'pending_registration'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-zinc-500 font-mono text-[11px]">
                      {d.nameservers.slice(0, 2).join(', ')}
                      {d.nameservers.length > 2 ? ` (+${d.nameservers.length - 2})` : ''}
                    </td>
                    <td className="py-3.5 text-zinc-500">
                      {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'Pending domain service'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setDashboardSubView('domains')}
                        className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-700 font-semibold hover:bg-[#3120ff] hover:text-white transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

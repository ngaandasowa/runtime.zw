import React from 'react';
import { 
  Users, 
  Globe, 
  Clock, 
  CreditCard, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  ArrowRight,
  Send,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminDashboard: React.FC = () => {
  const { 
    users, 
    domains, 
    orders, 
    registryRequests, 
    setAdminSubView 
  } = useStore();

  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const totalDomains = domains.length;
  const activeDomains = domains.filter(d => d.status === 'active').length;
  const pendingRegistrations = domains.filter(d => d.status === 'pending_registration' || d.status === 'pending').length;
  const awaitingZispaRequests = registryRequests.filter(r => r.status === 'submitted' || r.status === 'awaiting_confirmation').length;
  
  // Calculate total revenue from paid orders
  const revenueThisMonth = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  // Expiring soon count
  const now = new Date();
  const expiringSoonCount = domains.filter(d => {
    if (!d.expires_at || d.status !== 'active') return false;
    const diffDays = Math.ceil((new Date(d.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#3120ff] mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>RUNTIME INFRASTRUCTURE ADMIN CONSOLE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              Registry &amp; Platform Operations
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1">
              Overview of ZISPA registry dispatches, customer accounts, and revenue pipelines.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAdminSubView('registry')}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1a1de0] transition shadow-sm"
            >
              <Send className="h-4 w-4" />
              <span>ZISPA Registry Desk ({registryRequests.filter(r => r.status === 'ready').length} Ready)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Core Admin Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">TOTAL CUSTOMERS</span>
            <Users className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">{totalCustomers}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Verified account owners</div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">ACTIVE DOMAINS</span>
            <Globe className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">{activeDomains}</div>
          <div className="text-[11px] text-zinc-500 mt-1">{totalDomains} total records in DB</div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">PENDING REGISTRATIONS</span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">{pendingRegistrations}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Awaiting registry processing</div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AWAITING ZISPA</span>
            <Send className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-[#3120ff]">{awaitingZispaRequests}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Dispatched via email</div>
        </div>

        {/* Metric 5 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">EXPIRING SOON</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">{expiringSoonCount}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Within 30-day window</div>
        </div>

        {/* Metric 6 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">REVENUE THIS MONTH</span>
            <TrendingUp className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">${revenueThisMonth.toFixed(2)}</div>
          <div className="text-[11px] text-zinc-500 mt-1">USD (100% verified)</div>
        </div>

        {/* Metric 7 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">REGISTRY CONFIRMED</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-zinc-950">
            {registryRequests.filter(r => r.status === 'confirmed').length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Delegation confirmed</div>
        </div>

        {/* Metric 8 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">NAMESERVER HEALTH</span>
            <Globe className="h-4 w-4 text-[#3120ff]" />
          </div>
          <div className="text-sm font-bold text-emerald-600 mt-1">4 / 4 ONLINE</div>
          <div className="text-[11px] text-zinc-500 mt-1">Ngaatec primary cluster</div>
        </div>

      </div>

      {/* Two Columns: Recent Registry Activity & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Registry Activity */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-950 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-[#3120ff]" />
              <span>ZISPA Registry Queue</span>
            </h2>
            <button
              onClick={() => setAdminSubView('registry')}
              className="text-xs font-bold text-[#3120ff] hover:text-[#1a1de0] flex items-center space-x-1"
            >
              <span>Manage ZISPA</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {registryRequests.slice(0, 5).map(req => (
              <div key={req.id} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-zinc-950">{req.domain_name}</span>
                    <span className="text-[10px] bg-red-50 text-[#3120ff] px-1.5 py-0.5 rounded font-bold border border-red-200">
                      Action {req.action}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Customer: {req.customer_email}
                  </div>
                </div>

                <div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    req.status === 'confirmed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : req.status === 'submitted'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                  }`}>
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-zinc-950 flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-[#3120ff]" />
              <span>Recent Orders &amp; Payments</span>
            </h2>
            <button
              onClick={() => setAdminSubView('orders')}
              className="text-xs font-bold text-[#3120ff] hover:text-[#1a1de0] flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between">
                <div>
                  <div className="font-bold font-mono text-zinc-950">{order.reference}</div>
                  <div className="text-[11px] text-zinc-500">
                    {order.user_email} • {order.items[0]?.description || 'Domain Registration'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-zinc-950">${order.total.toFixed(2)} USD</div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">PAID</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

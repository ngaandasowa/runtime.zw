import React, { useState } from 'react';
import { Globe, Search } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { DomainStatus } from '../../types';

export const AdminDomains: React.FC = () => {
  const { domains, updateDomainStatus, showNotification } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredDomains = domains.filter(d => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (search && !d.domain_name.toLowerCase().includes(search.toLowerCase()) && !d.user_email.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
            <Globe className="h-6 w-6 text-[#3120ff]" />
            <span>All System Domains ({domains.length})</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Global administrative directory of all provisioned and delegated domain records.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 font-bold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1 text-xs text-zinc-900 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending_registration">Pending Registration</option>
            <option value="pending_transfer">Pending Transfer</option>
            <option value="pending_delete">Pending Delete</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search domain or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* Domains Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Domain</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Nameservers</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Expires At</th>
                <th className="pb-3 text-right">Admin Status Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredDomains.map(d => (
                <tr key={d.id} className="hover:bg-zinc-50 transition">
                  <td className="py-3.5 font-bold font-mono text-zinc-950">{d.domain_name}</td>
                  <td className="py-3.5 text-zinc-600">{d.user_email}</td>
                  <td className="py-3.5 text-zinc-600 font-mono text-[11px]">{d.nameservers.slice(0, 2).join(', ')}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      d.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                      d.status === 'pending_registration' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                      d.status === 'cancelled' ? 'border-zinc-200 bg-zinc-100 text-zinc-600' :
                      'border-zinc-200 bg-zinc-100 text-zinc-600'
                    }`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-zinc-500">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'Awaiting ZISPA'}
                  </td>
                  <td className="py-3.5 text-right">
                    <select
                      value={d.status}
                      onChange={(e) => {
                        updateDomainStatus(d.id, e.target.value as DomainStatus);
                        showNotification(`Status for ${d.domain_name} set to ${e.target.value}`, 'info');
                      }}
                      className="rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-[11px] text-zinc-800 font-semibold"
                    >
                      <option value="active">active</option>
                      <option value="pending_registration">pending_registration</option>
                      <option value="pending_transfer">pending_transfer</option>
                      <option value="pending_delete">pending_delete</option>
                      <option value="cancelled">cancelled</option>
                      <option value="expired">expired</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

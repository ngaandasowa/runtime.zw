import React, { useState } from 'react';
import { DollarSign, RefreshCw, Edit3, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { TldPricing } from '../../types';

export const AdminPricing: React.FC = () => {
  const { pricing, updateTldPrice, syncUpstreamPrices } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingTld, setEditingTld] = useState<TldPricing | null>(null);

  const handleSyncUpstream = async () => {
    setIsSyncing(true);
    await syncUpstreamPrices();
    setIsSyncing(false);
  };

  const handleSaveTldEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTld) return;
    updateTldPrice(
      editingTld.id,
      editingTld.runtime_registration_price,
      editingTld.runtime_renewal_price,
      editingTld.active
    );
    setEditingTld(null);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#3120ff] mb-1">
            <span>FINANCIAL MATRIX</span>
            <span>•</span>
            <span>UPSTREAM NGAATEC PROXY + RUNTIME PRICING RULE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
            <DollarSign className="h-6 w-6 text-[#3120ff]" />
            <span>TLD Pricing &amp; Registry Margin</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage public retail rates, renewal costs, and upstream sync policies.
          </p>
        </div>

        <button
          onClick={handleSyncUpstream}
          disabled={isSyncing}
          className="inline-flex items-center space-x-2 rounded-xl bg-white border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition shadow-2xs"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sync Upstream Ngaatec Rates</span>
        </button>
      </div>

      {/* Pricing Rule Info Box */}
      <div className="rounded-2xl border border-[#3120ff]/15 bg-[#3120ff]/5/50 p-4 text-xs text-zinc-700 flex items-start space-x-3">
        <ShieldCheck className="h-5 w-5 text-[#3120ff] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-zinc-950">Runtime Fixed $2.00 Rule Enforced:</div>
          <div>
            To democratize Zimbabwean digital presence, <strong className="text-zinc-950 font-mono">.co.zw</strong> registration and renewal are locked at <strong className="text-zinc-950 font-mono">$2.00 USD/year</strong> across the platform.
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">TLD</th>
                <th className="pb-3">Retail Price</th>
                <th className="pb-3">Renewal Price</th>
                <th className="pb-3">Upstream Cost (Ngaatec)</th>
                <th className="pb-3">Margin</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {pricing.map(tld => {
                const margin = tld.runtime_registration_price - tld.registry_cost;
                return (
                  <tr key={tld.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3.5 font-bold font-mono text-zinc-950 text-sm">{tld.tld}</td>
                    <td className="py-3.5 text-[#3120ff] font-extrabold">${tld.runtime_registration_price.toFixed(2)} USD</td>
                    <td className="py-3.5 text-zinc-800 font-medium">${tld.runtime_renewal_price.toFixed(2)} USD</td>
                    <td className="py-3.5 text-zinc-500">${tld.upstream_price?.toFixed(2) || tld.registry_cost.toFixed(2)} USD</td>
                    <td className="py-3.5">
                      <span className={`font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-zinc-500'}`}>
                        {margin >= 0 ? '+' : ''}${margin.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        tld.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                      }`}>
                        {tld.active ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setEditingTld({ ...tld })}
                        className="inline-flex items-center space-x-1 rounded-xl bg-zinc-100 px-2.5 py-1 text-zinc-700 font-semibold hover:bg-zinc-200 transition"
                      >
                        <Edit3 className="h-3 w-3 text-[#3120ff]" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit TLD Modal */}
      {editingTld && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-base font-bold text-zinc-950 mb-4">Edit TLD Pricing: {editingTld.tld}</h3>
            
            <form onSubmit={handleSaveTldEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Selling Retail Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTld.runtime_registration_price}
                  onChange={(e) => setEditingTld({ ...editingTld, runtime_registration_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Renewal Price ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTld.runtime_renewal_price}
                  onChange={(e) => setEditingTld({ ...editingTld, runtime_renewal_price: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Registry Cost ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingTld.registry_cost}
                  onChange={(e) => setEditingTld({ ...editingTld, registry_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingTld.active}
                  onChange={(e) => setEditingTld({ ...editingTld, active: e.target.checked })}
                  className="rounded border-zinc-300 text-[#3120ff] focus:ring-[#3120ff]"
                />
                <label htmlFor="isActive" className="text-zinc-800 font-medium">Active for registration</label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setEditingTld(null)}
                  className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#3120ff] px-4 py-2 font-bold text-white hover:bg-[#1a1de0] shadow-xs"
                >
                  Save TLD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { Server, Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { nameserverService } from '../../services/NameserverService';

export const AdminNameservers: React.FC = () => {
  const { settings, updateSettings, showNotification } = useStore();
  
  const [ns1, setNs1] = useState(settings.default_nameservers[0] || '');
  const [ns2, setNs2] = useState(settings.default_nameservers[1] || '');
  const [ns3, setNs3] = useState(settings.default_nameservers[2] || '');
  const [ns4, setNs4] = useState(settings.default_nameservers[3] || '');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const active = [ns1, ns2, ns3, ns4].filter(n => n.trim().length > 0);
    const validation = nameserverService.validateNameservers(active);
    if (!validation.valid) {
      setError(validation.error || 'Invalid nameservers');
      return;
    }
    setError(null);
    updateSettings({
      default_nameservers: [ns1, ns2, ns3, ns4]
        .map((nameserver) => nameserver.trim())
        .filter(Boolean),
    });
    showNotification('Platform default nameservers updated successfully.', 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      
      <div className="border-b border-zinc-200 pb-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-[#FF2D20] mb-1">
          <span>DNS INFRASTRUCTURE</span>
          <span>•</span>
          <span>NGAATEC AUTHORITATIVE CLUSTER</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
          <Server className="h-6 w-6 text-[#FF2D20]" />
          <span>Platform Default Nameservers</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          These nameservers are automatically populated when customers register or transfer .co.zw domains.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Default Primary Nameserver (1) *</label>
            <input
              type="text"
              value={ns1}
              onChange={(e) => setNs1(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Default Secondary Nameserver (2) *</label>
            <input
              type="text"
              value={ns2}
              onChange={(e) => setNs2(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Default Tertiary Nameserver (3) (Optional)</label>
            <input
              type="text"
              value={ns3}
              onChange={(e) => setNs3(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-700 font-semibold mb-1">Default Quaternary Nameserver (4) (Optional)</label>
            <input
              type="text"
              value={ns4}
              onChange={(e) => setNs4(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 rounded-xl bg-[#FF2D20] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#E0241A] transition shadow-xs"
            >
              <Save className="h-4 w-4" />
              <span>Save Nameservers</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

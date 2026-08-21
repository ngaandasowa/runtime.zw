import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Search, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  History, 
  ShieldAlert, 
  Server, 
  Check, 
  Clock, 
  AlertCircle,
  FileText,
  Lock,
  ArrowLeftRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Domain, RegistrantDetails } from '../../types';
import { nameserverService } from '../../services/NameserverService';

export const DashboardDomains: React.FC = () => {
  const { 
    currentUser, 
    domains, 
    setRegistrationModalOpen,
    updateDomainNameservers,
    requestDomainModify,
    requestDomainDelete,
    requestDomainTransfer
  } = useStore();

  const [activeTab, setActiveTab] = useState<'my_domains' | 'transfers'>('my_domains');
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [modalMode, setModalMode] = useState<'details' | 'nameservers' | 'modify' | 'delete' | 'history' | null>(null);

  // Transfer form
  const [transferDomain, setTransferDomain] = useState('');
  const [transferAuthCode, setTransferAuthCode] = useState('');

  // Nameservers editor state
  const [editNs, setEditNs] = useState<string[]>([]);
  const [nsError, setNsError] = useState<string | null>(null);

  // Modify editor state
  const [modifyOwner, setModifyOwner] = useState<RegistrantDetails | null>(null);
  const [modifyNs, setModifyNs] = useState<string[]>([]);

  // Delete modal state
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  const userDomains = domains.filter(d => d.user_email === currentUser?.email || d.user_id === currentUser?.id);

  const openNameserversModal = (domain: Domain) => {
    setSelectedDomain(domain);
    const ns = [...domain.nameservers];
    while (ns.length < 4) ns.push('');
    setEditNs(ns);
    setNsError(null);
    setModalMode('nameservers');
  };

  const handleSaveNameservers = () => {
    if (!selectedDomain) return;
    const active = editNs.filter(n => n.trim().length > 0);
    const validation = nameserverService.validateNameservers(active);
    if (!validation.valid) {
      setNsError(validation.error || 'Invalid nameservers');
      return;
    }
    updateDomainNameservers(selectedDomain.id, active);
    setModalMode(null);
  };

  const openModifyModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setModifyOwner({ ...domain.owner_details });
    setModifyNs([...domain.nameservers]);
    setModalMode('modify');
  };

  const handleSaveModify = () => {
    if (!selectedDomain || !modifyOwner) return;
    requestDomainModify(selectedDomain.id, modifyOwner, modifyNs);
    setModalMode(null);
  };

  const openDeleteModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setDeleteConfirmInput('');
    setModalMode('delete');
  };

  const handleExecuteDelete = () => {
    if (!selectedDomain) return;
    const success = requestDomainDelete(selectedDomain.id, deleteConfirmInput);
    if (success) {
      setModalMode(null);
    }
  };

  const openHistoryModal = (domain: Domain) => {
    setSelectedDomain(domain);
    setModalMode('history');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDomain.trim()) return;
    requestDomainTransfer(transferDomain.trim(), transferAuthCode.trim());
    setTransferDomain('');
    setTransferAuthCode('');
    setActiveTab('my_domains');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
            <Globe className="h-6 w-6 text-[#3120ff]" />
            <span>Domain Management</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Register, transfer, and manage authoritative nameservers for Zimbabwean ccTLDs (.co.zw).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-xs font-bold shadow-2xs">
            <button
              onClick={() => setActiveTab('my_domains')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'my_domains' ? 'bg-[#3120ff] text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              My Domains ({userDomains.length})
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'transfers' ? 'bg-[#3120ff] text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
            >
              Transfer In (T)
            </button>
          </div>

          <button
            onClick={() => setRegistrationModalOpen(true)}
            className="inline-flex items-center space-x-1.5 rounded-xl bg-[#3120ff] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Register .co.zw ($2/yr)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: My Domains */}
      {activeTab === 'my_domains' && (
        <div className="space-y-4">
          {userDomains.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-200 rounded-2xl bg-white shadow-2xs">
              <Globe className="h-10 w-10 text-zinc-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-zinc-950">No Domains Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                Secure your Zimbabwean domain name today with direct domain service delegation and $2.00/yr pricing.
              </p>
              <button
                onClick={() => setRegistrationModalOpen(true)}
                className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] shadow-xs"
              >
                <span>Search Domain Now</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {userDomains.map((domain) => (
                <div 
                  key={domain.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Domain Title & Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold font-mono text-zinc-950">
                          {domain.domain_name}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          domain.status === 'active' 
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                            : domain.status === 'pending_registration'
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : domain.status === 'pending_delete'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                        }`}>
                          {domain.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <div>Owner: <span className="text-zinc-800 font-medium">{domain.owner_details.full_name}</span></div>
                        <div>•</div>
                        <div>Nameservers: <span className="text-zinc-800 font-mono">{domain.nameservers.join(', ')}</span></div>
                        <div>•</div>
                        <div>Renewal: <span className="text-[#3120ff] font-bold">${domain.renewal_price.toFixed(2)}/yr</span></div>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => openNameserversModal(domain)}
                        className="inline-flex items-center space-x-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white hover:border-zinc-300 transition"
                      >
                        <Server className="h-3.5 w-3.5 text-[#3120ff]" />
                        <span>Nameservers</span>
                      </button>

                      <button
                        onClick={() => openModifyModal(domain)}
                        className="inline-flex items-center space-x-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white hover:border-zinc-300 transition"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#3120ff]" />
                        <span>Modify (M)</span>
                      </button>

                      <button
                        onClick={() => openHistoryModal(domain)}
                        className="inline-flex items-center space-x-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-white hover:border-zinc-300 transition"
                      >
                        <History className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Timeline</span>
                      </button>

                      <button
                        onClick={() => openDeleteModal(domain)}
                        className="inline-flex items-center space-x-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Transfer In */}
      {activeTab === 'transfers' && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 max-w-2xl mx-auto shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <ArrowLeftRight className="h-6 w-6 text-[#3120ff]" />
            <div>
              <h2 className="text-lg font-bold text-zinc-950">Transfer Domain into Runtime</h2>
              <p className="text-xs text-zinc-500">Initiate an official Domain transfer (Action T) to Runtime registrar infrastructure.</p>
            </div>
          </div>

          <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Domain Name to Transfer *</label>
              <input
                type="text"
                placeholder="existingdomain.co.zw"
                value={transferDomain}
                onChange={(e) => setTransferDomain(e.target.value.toLowerCase())}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">EPP / Authorization Code (Optional)</label>
              <input
                type="text"
                placeholder="Auth code from losing registrar"
                value={transferAuthCode}
                onChange={(e) => setTransferAuthCode(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600">
              <strong className="text-zinc-900 font-bold">Domain transfer Policy:</strong> Domain transfers do not incur extra transfer penalties. Once requested, a domain service Action T form is generated and dispatched to the registry.
            </div>

            <button
              type="submit"
              disabled={!transferDomain.trim()}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-[#3120ff] py-3 text-sm font-bold text-white hover:bg-[#2819d9] transition disabled:opacity-50 shadow-sm"
            >
              <span>Submit Transfer Request (Action T)</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* MODAL 1: Nameservers Editor */}
      {modalMode === 'nameservers' && selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-base font-bold text-zinc-950 mb-1">
              Update Nameservers: {selectedDomain.domain_name}
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Specify 2 to 4 authoritative nameservers. Updating queues a domain service MODIFY (M) request.
            </p>

            <div className="space-y-3 mb-4 text-xs font-mono">
              {editNs.map((ns, idx) => (
                <div key={idx}>
                  <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                    Nameserver {idx + 1} {idx < 2 ? '*' : '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={ns}
                    onChange={(e) => {
                      const copy = [...editNs];
                      copy[idx] = e.target.value;
                      setEditNs(copy);
                    }}
                    placeholder={`ns${idx + 1}.example.com`}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                  />
                </div>
              ))}

              {nsError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {nsError}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-200 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNameservers}
                className="rounded-xl bg-[#3120ff] px-4 py-2 font-bold text-white hover:bg-[#2819d9] shadow-xs"
              >
                Save &amp; Queue domain service (M)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Modify Details (domain service M) */}
      {modalMode === 'modify' && selectedDomain && modifyOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5 my-8">
            <h3 className="text-base font-bold text-zinc-950 mb-1">
              Modify Domain Contact (domain service Action M)
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Target: <strong className="text-zinc-950 font-mono">{selectedDomain.domain_name}</strong>. domain service requires complete contact specifications.
            </p>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    value={modifyOwner.full_name}
                    onChange={(e) => setModifyOwner({ ...modifyOwner, full_name: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Organisation</label>
                  <input
                    type="text"
                    value={modifyOwner.org_name || ''}
                    onChange={(e) => setModifyOwner({ ...modifyOwner, org_name: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Physical Address</label>
                <input
                  type="text"
                  value={modifyOwner.physical_address}
                  onChange={(e) => setModifyOwner({ ...modifyOwner, physical_address: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={modifyOwner.phone}
                    onChange={(e) => setModifyOwner({ ...modifyOwner, phone: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={modifyOwner.email}
                    onChange={(e) => setModifyOwner({ ...modifyOwner, email: e.target.value })}
                    className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Organisation Description</label>
                <input
                  type="text"
                  value={modifyOwner.org_description}
                  onChange={(e) => setModifyOwner({ ...modifyOwner, org_description: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-600 font-semibold mb-1">Proposed Usage</label>
                <input
                  type="text"
                  value={modifyOwner.proposed_usage}
                  onChange={(e) => setModifyOwner({ ...modifyOwner, proposed_usage: e.target.value })}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-zinc-200 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModify}
                className="rounded-xl bg-[#3120ff] px-4 py-2 font-bold text-white hover:bg-[#2819d9] shadow-xs"
              >
                Submit Modification (M)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Delete Protection (domain service D) */}
      {modalMode === 'delete' && selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            <div className="flex items-center space-x-2 text-zinc-950 mb-2">
              <ShieldAlert className="h-5 w-5 text-[#3120ff]" />
              <h3 className="text-base font-bold">Delete Protection Warning</h3>
            </div>
            
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              You are requesting deletion of <strong className="text-zinc-950 font-mono">{selectedDomain.domain_name}</strong> from the official domain service.
            </p>

            <p className="text-xs text-zinc-500 mb-4">
              To prevent accidental deletion, please type <span className="font-bold text-zinc-950 font-mono select-all">{selectedDomain.domain_name}</span> below:
            </p>

            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder={selectedDomain.domain_name}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-xs text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none mb-4"
            />

            <div className="flex justify-end space-x-3 pt-2 border-t border-zinc-200 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="px-4 py-2 font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                disabled={deleteConfirmInput.trim().toLowerCase() !== selectedDomain.domain_name.toLowerCase()}
                className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white hover:bg-rose-500 disabled:opacity-40 transition shadow-xs"
              >
                Confirm Delete (domain service D)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Domain History Timeline */}
      {modalMode === 'history' && selectedDomain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-base font-bold text-zinc-950 mb-1">
              Audit Timeline: {selectedDomain.domain_name}
            </h3>
            <p className="text-xs text-zinc-500 mb-4 font-mono">
              Immutable registry &amp; modification event trail
            </p>

            <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
              {selectedDomain.history.map((h, i) => (
                <div key={i} className="flex items-start space-x-3 border-l-2 border-[#3120ff] pl-3 py-1 text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-zinc-950">Action {h.action}</span>
                      <span className="text-[10px] text-[#3120ff] bg-red-50 px-1.5 py-0.5 rounded font-semibold border border-red-200">{h.status}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-600 mt-1">{h.description}</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Actor: {h.actor}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-zinc-200 text-xs">
              <button
                onClick={() => setModalMode(null)}
                className="rounded-xl bg-zinc-100 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

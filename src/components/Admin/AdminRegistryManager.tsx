import React, { useState } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Download, 
  Eye, 
  Clock, 
  Search, 
  Plus, 
  X
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { RegistryRequest, ZispaAction } from '../../types';
import { zispaTemplateService } from '../../services/ZispaTemplateService';

export const AdminRegistryManager: React.FC = () => {
  const { 
    registryRequests, 
    domains, 
    submitRegistryRequest, 
    confirmRegistryRequest, 
    createManualRegistryRequest,
    settings,
    showNotification 
  } = useStore();

  const [selectedRequest, setSelectedRequest] = useState<RegistryRequest | null>(null);
  const [modalMode, setModalMode] = useState<'preview' | 'manual_create' | null>(null);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual request create state
  const [manualDomainId, setManualDomainId] = useState<string>('');
  const [manualAction, setManualAction] = useState<ZispaAction>('N');

  // Stats
  const pendingN = registryRequests.filter(r => r.action === 'N' && (r.status === 'ready' || r.status === 'draft')).length;
  const pendingM = registryRequests.filter(r => r.action === 'M' && (r.status === 'ready' || r.status === 'draft')).length;
  const pendingT = registryRequests.filter(r => r.action === 'T' && (r.status === 'ready' || r.status === 'draft')).length;
  const pendingD = registryRequests.filter(r => r.action === 'D' && (r.status === 'ready' || r.status === 'draft')).length;
  const awaitingZispa = registryRequests.filter(r => r.status === 'submitted' || r.status === 'awaiting_confirmation').length;
  const confirmedToday = registryRequests.filter(r => r.status === 'confirmed').length;

  const filteredRequests = registryRequests.filter(r => {
    if (filterAction !== 'ALL' && r.action !== filterAction) return false;
    if (searchQuery && !r.domain_name.toLowerCase().includes(searchQuery.toLowerCase()) && !r.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleDownloadTxt = (req: RegistryRequest) => {
    const filename = zispaTemplateService.getFilename(req.domain_name, req.action);
    const blob = new Blob([req.generated_template], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification(`Downloaded ${filename}`, 'info');
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDomainId) return;
    createManualRegistryRequest(manualDomainId, manualAction);
    setModalMode(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-[#FF2D20] mb-1">
            <span>REGISTRAR PROTOCOL</span>
            <span>•</span>
            <span>ZISPA ENGINE (RFC-COMPLIANT)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
            <FileText className="h-6 w-6 text-[#FF2D20]" />
            <span>ZISPA Registry Management</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Dispatch official plain-text templates to <code className="text-zinc-800 font-mono">admin@zispa.org.zw</code> from <code className="text-zinc-800 font-mono">dns@ngaatec.com</code>.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (domains.length > 0) {
                setManualDomainId(domains[0].id);
                setModalMode('manual_create');
              }
            }}
            className="inline-flex items-center space-x-2 rounded-xl bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white hover:bg-[#E0241A] transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create ZISPA Request</span>
          </button>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pending Reg (N)</div>
          <div className="text-xl font-extrabold text-[#FF2D20] mt-1">{pendingN}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pending Modify (M)</div>
          <div className="text-xl font-extrabold text-zinc-950 mt-1">{pendingM}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pending Transfer (T)</div>
          <div className="text-xl font-extrabold text-zinc-950 mt-1">{pendingT}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pending Delete (D)</div>
          <div className="text-xl font-extrabold text-zinc-950 mt-1">{pendingD}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Awaiting ZISPA</div>
          <div className="text-xl font-extrabold text-[#FF2D20] mt-1">{awaitingZispa}</div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center shadow-xs">
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Confirmed Today</div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">{confirmedToday}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 font-bold">Action Filter:</span>
          <div className="inline-flex rounded-lg bg-zinc-100 p-0.5 text-xs font-bold">
            {['ALL', 'N', 'M', 'T', 'D'].map(act => (
              <button
                key={act}
                onClick={() => setFilterAction(act)}
                className={`px-2.5 py-1 rounded-md transition ${filterAction === act ? 'bg-white text-zinc-950 shadow-xs' : 'text-zinc-600 hover:text-zinc-950'}`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search domain or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none w-full sm:w-64"
          />
        </div>
      </div>

      {/* Registry Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Domain</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Submitted At</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    No registry requests found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3.5 font-bold font-mono text-zinc-950">
                      {req.domain_name}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-bold text-[11px] ${
                        req.action === 'N' ? 'bg-red-50 text-[#FF2D20] border border-red-200' :
                        req.action === 'M' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                        req.action === 'T' ? 'bg-zinc-100 text-zinc-800 border border-zinc-200' :
                        'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}>
                        Action {req.action}
                      </span>
                    </td>
                    <td className="py-3.5 text-zinc-600 truncate max-w-[140px]" title={req.customer_email}>
                      {req.customer_email}
                    </td>
                    <td className="py-3.5">
                      <span className="text-zinc-900 font-semibold font-mono">
                        {req.payment_reference || 'VERIFIED'}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        req.status === 'confirmed' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                        req.status === 'submitted' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                        req.status === 'ready' ? 'border-zinc-300 bg-zinc-100 text-zinc-800' :
                        'border-zinc-200 bg-zinc-50 text-zinc-500'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-zinc-500">
                      {req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Preview */}
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setModalMode('preview');
                          }}
                          title="Preview ZISPA plain text template"
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Download .txt */}
                        <button
                          onClick={() => handleDownloadTxt(req)}
                          title="Download ZISPA .txt attachment"
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200 transition"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        {/* Submit to ZISPA */}
                        {req.status !== 'confirmed' && (
                          <button
                            onClick={() => submitRegistryRequest(req.id)}
                            title="Send email to admin@zispa.org.zw with .txt attachment"
                            className="inline-flex items-center space-x-1 rounded-lg bg-red-50 text-[#FF2D20] px-2 py-1 hover:bg-red-100 border border-red-200 font-bold transition"
                          >
                            <Send className="h-3 w-3" />
                            <span>Submit</span>
                          </button>
                        )}

                        {/* Mark Confirmed */}
                        {req.status === 'submitted' && (
                          <button
                            onClick={() => confirmRegistryRequest(req.id)}
                            title="Mark registry confirmed by ZISPA"
                            className="inline-flex items-center space-x-1 rounded-lg bg-emerald-50 text-emerald-700 px-2 py-1 hover:bg-emerald-100 border border-emerald-200 font-bold transition"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Confirm</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Plain-Text ZISPA Template Preview Modal */}
      {modalMode === 'preview' && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            
            <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-zinc-950 font-mono">
                    {zispaTemplateService.getFilename(selectedRequest.domain_name, selectedRequest.action)}
                  </span>
                  <span className="text-[10px] bg-red-50 text-[#FF2D20] px-2 py-0.5 rounded font-mono font-bold border border-red-200">
                    RFC ZISPA Plain Text
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 font-mono">
                  Subject: <code className="text-zinc-950">{selectedRequest.email_subject}</code>
                </div>
              </div>

              <button
                onClick={() => setModalMode(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Email Metadata Card */}
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono mb-4 text-zinc-600 space-y-1">
              <div><span className="text-zinc-400">From:</span> {settings.registry_email_from}</div>
              <div><span className="text-zinc-400">To:</span> {settings.registry_email_to}</div>
              <div><span className="text-zinc-400">Attachment:</span> {zispaTemplateService.getFilename(selectedRequest.domain_name, selectedRequest.action)} (Plaintext .txt)</div>
            </div>

            {/* Template Box */}
            <div className="relative">
              <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-all">
                {selectedRequest.generated_template}
              </pre>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-zinc-200 text-xs font-mono">
              <button
                onClick={() => handleDownloadTxt(selectedRequest)}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-zinc-700 font-bold hover:bg-zinc-100"
              >
                <Download className="h-3.5 w-3.5 text-[#FF2D20]" />
                <span>Download .txt File</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 font-bold"
                >
                  Close
                </button>

                {selectedRequest.status !== 'confirmed' && (
                  <button
                    onClick={() => {
                      submitRegistryRequest(selectedRequest.id);
                      setModalMode(null);
                    }}
                    className="inline-flex items-center space-x-1.5 rounded-xl bg-[#FF2D20] px-4 py-1.5 font-bold text-white hover:bg-[#E0241A] shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Dispatch to ZISPA</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Create Manual ZISPA Request */}
      {modalMode === 'manual_create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            <h3 className="text-base font-bold text-zinc-950 mb-1">Create ZISPA Application</h3>
            <p className="text-xs text-zinc-500 mb-4 font-mono">
              Generate RFC template for existing database domain
            </p>

            <form onSubmit={handleCreateManual} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Select Domain</label>
                <select
                  value={manualDomainId}
                  onChange={(e) => setManualDomainId(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 border border-zinc-200 p-2 text-zinc-900 focus:border-[#FF2D20] focus:bg-white focus:outline-none font-mono"
                >
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.domain_name} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Action Type</label>
                <div className="grid grid-cols-4 gap-2 font-mono">
                  {(['N', 'M', 'D', 'T'] as ZispaAction[]).map(act => (
                    <button
                      key={act}
                      type="button"
                      onClick={() => setManualAction(act)}
                      className={`p-2 rounded-xl border text-center font-bold transition ${
                        manualAction === act
                          ? 'border-red-300 bg-red-50 text-[#FF2D20]'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {act}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#FF2D20] px-4 py-2 font-bold text-white hover:bg-[#E0241A] shadow-xs"
                >
                  Generate Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

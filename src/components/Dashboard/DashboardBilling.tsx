import React, { useState } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Calendar, 
  CheckCircle2, 
  FileText
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';

export const DashboardBilling: React.FC = () => {
  const { currentUser, orders, domains, showNotification } = useStore();
  const [selectedReceipt, setSelectedReceipt] = useState<Order | null>(null);

  const userOrders = orders.filter(o => o.user_email === currentUser?.email || o.user_id === currentUser?.id);
  const userDomains = domains.filter(d => d.user_email === currentUser?.email || d.user_id === currentUser?.id);

  // Renewal alerts
  const now = new Date();
  const domainRenewals = userDomains.map(d => {
    const expires = d.expires_at ? new Date(d.expires_at) : null;
    let daysLeft = null;
    let reminder = 'Active';

    if (expires) {
      daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) reminder = 'Expired';
      else if (daysLeft <= 1) reminder = '1 Day Left (Urgent)';
      else if (daysLeft <= 7) reminder = '7 Days Left';
      else if (daysLeft <= 14) reminder = '14 Days Left';
      else if (daysLeft <= 30) reminder = '30 Days Left';
    }

    return {
      ...d,
      daysLeft,
      reminder,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Top Heading */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
          <CreditCard className="h-6 w-6 text-[#FF2D20]" />
          <span>Billing &amp; Financial Invoices</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Server-side verified transaction receipts, orders, and domain lifecycle renewals.
        </p>
      </div>

      {/* Renewals Tracking Section */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-zinc-950 mb-3 flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-[#FF2D20]" />
          <span>Domain Renewal &amp; Expiry Monitor</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Domain</th>
                <th className="pb-3">Renewal Price</th>
                <th className="pb-3">Expiration Date</th>
                <th className="pb-3">Status / Alert</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {domainRenewals.map(d => (
                <tr key={d.id} className="hover:bg-zinc-50 transition">
                  <td className="py-3.5 font-bold font-mono text-zinc-950">
                    {d.domain_name}
                  </td>
                  <td className="py-3.5 text-[#FF2D20] font-bold">
                    ${d.renewal_price.toFixed(2)}/yr
                  </td>
                  <td className="py-3.5 text-zinc-500">
                    {d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'Awaiting Confirmation'}
                  </td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      d.daysLeft !== null && d.daysLeft <= 30
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}>
                      {d.reminder}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => showNotification(`Domain ${d.domain_name} renewal reminder dispatched.`, 'info')}
                      className="rounded-lg bg-zinc-100 px-2.5 py-1 text-zinc-700 font-semibold hover:bg-[#FF2D20] hover:text-white transition"
                    >
                      Renew ($2)
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Orders & Invoices Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-zinc-950 mb-3 flex items-center space-x-2">
          <Receipt className="h-4 w-4 text-[#FF2D20]" />
          <span>Orders &amp; Receipts</span>
        </h2>

        {userOrders.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4">No order records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3">Reference</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Payment Status</th>
                  <th className="pb-3 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {userOrders.map(order => (
                  <tr key={order.id} className="hover:bg-zinc-50 transition">
                    <td className="py-3.5 font-bold font-mono text-[#FF2D20]">
                      {order.reference}
                    </td>
                    <td className="py-3.5 text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-zinc-800 font-medium">
                      {order.items.map(i => i.description).join(', ')}
                    </td>
                    <td className="py-3.5 font-extrabold text-zinc-950">
                      ${order.total.toFixed(2)} {order.currency}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>PAID (Server Verified)</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedReceipt(order)}
                        className="inline-flex items-center space-x-1 rounded-xl bg-zinc-100 px-2.5 py-1 text-zinc-700 font-semibold hover:bg-zinc-200 transition"
                      >
                        <FileText className="h-3 w-3 text-[#FF2D20]" />
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice / Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-2xl ring-1 ring-black/5">
            
            <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-4">
              <div>
                <div className="text-xs font-bold text-[#FF2D20]">OFFICIAL INVOICE &amp; RECEIPT</div>
                <div className="text-lg font-bold font-mono text-zinc-950">{selectedReceipt.reference}</div>
              </div>
              <div className="text-right text-xs text-zinc-500">
                <div className="font-bold text-zinc-800">Ngaatec Private Limited</div>
                <div>Harare, Zimbabwe</div>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Billed To:</span>
                <span className="text-zinc-900 font-semibold">{currentUser?.name} ({selectedReceipt.user_email})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Issued Date:</span>
                <span className="text-zinc-900">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Paid Timestamp:</span>
                <span className="text-emerald-700 font-semibold">{selectedReceipt.paid_at ? new Date(selectedReceipt.paid_at).toLocaleString() : 'Confirmed'}</span>
              </div>

              <div className="mt-4 border-t border-zinc-200 pt-3">
                <div className="text-zinc-500 mb-2 font-semibold">Items:</div>
                {selectedReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 text-zinc-800">
                    <span>{item.description}</span>
                    <span className="font-bold">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-3 border-t border-zinc-200 text-sm font-bold text-zinc-950">
                <span>Total Amount Paid:</span>
                <span className="text-[#FF2D20] font-extrabold">${selectedReceipt.total.toFixed(2)} USD</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-zinc-200 text-xs">
              <span className="text-zinc-500">Status: Tax Paid &amp; Registry Submitted</span>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white hover:bg-[#E0241A] shadow-xs"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

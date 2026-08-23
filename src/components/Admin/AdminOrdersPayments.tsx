import React, { useState } from 'react';
import { CreditCard, Search, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const AdminOrdersPayments: React.FC = () => {
  const { orders } = useStore();
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    return o.reference.toLowerCase().includes(search.toLowerCase()) || o.user_email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-[#FF2D20]" />
            <span>Orders &amp; Payment Ledger ({orders.length})</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Complete transaction verification history, payment references, and invoice status.
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filter by reference or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white pl-9 pr-4 py-1.5 text-xs text-zinc-900 focus:border-[#FF2D20] focus:outline-none w-full shadow-2xs"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="pb-3">Reference</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Items</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Payment Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-zinc-50 transition">
                  <td className="py-3.5 font-bold font-mono text-[#FF2D20]">{order.reference}</td>
                  <td className="py-3.5 text-zinc-700">{order.user_email}</td>
                  <td className="py-3.5 text-zinc-600">{order.items.map(i => i.description).join(', ')}</td>
                  <td className="py-3.5 font-extrabold text-zinc-950">${order.total.toFixed(2)} USD</td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>PAID</span>
                    </span>
                  </td>
                  <td className="py-3.5 text-zinc-500">{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

const prices = [
  ['.co.zw', '$2', 'Businesses and personal projects'],
  ['.org.zw', '3', 'Organisations and community projects'],
  ['.ac.zw', '$3', 'Academic institutions'],
];

export const PricingSection: React.FC = () => {
  const { setRegistrationModalOpen } = useStore();
  return (
    <section id="pricing" className="border-b border-zinc-200 bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl"><p className="text-sm font-semibold text-[#3120ff]">Domain pricing</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">Simple prices. No surprises.</h2><p className="mt-4 text-zinc-600">Every price includes one year of registration. Renewals are charged at the same rate.</p></div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {prices.map(([extension, price, description]) => <article key={extension} className="border border-zinc-200 bg-white p-6"><p className="font-mono text-2xl font-bold text-zinc-950">{extension}</p><p className="mt-5 text-4xl font-bold text-zinc-950">{price}<span className="text-sm font-medium text-zinc-500"> / year</span></p><p className="mt-3 min-h-12 text-sm text-zinc-500">{description}</p><div className="mt-6 space-y-2 border-t border-zinc-100 pt-5 text-sm text-zinc-600"><p className="flex items-center gap-2"><Check className="h-4 w-4 text-[#3120ff]" /> Your domain, your account</p><p className="flex items-center gap-2"><Check className="h-4 w-4 text-[#3120ff]" /> Clear renewal pricing</p></div><button onClick={() => setRegistrationModalOpen(true)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-[#3120ff] py-3 text-sm font-semibold text-white hover:bg-[#2819d9]">Register {extension}<ArrowRight className="h-4 w-4" /></button></article>)}
        </div>
      </div>
    </section>
  );
};

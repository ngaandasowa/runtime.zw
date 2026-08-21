import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Search, XCircle } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { domainAvailabilityService, DomainAvailabilityResult } from '../../services/DomainAvailabilityService';

export const Hero: React.FC = () => {
  const { setPendingRegisterDomain, setRegistrationModalOpen } = useStore();
  const [name, setName] = useState('');
  const [tld, setTld] = useState('.co.zw');
  const [result, setResult] = useState<DomainAvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const domain = name.includes('.') ? name : `${name}${tld}`;
    setResult(await domainAvailabilityService.checkAvailability(domain));
    setLoading(false);
  };

  const register = (domain: string) => {
    setPendingRegisterDomain(domain);
    setRegistrationModalOpen(true);
  };

  return (
    <section className="border-b border-zinc-200 bg-[linear-gradient(135deg,#f8f9ff_0%,#ffffff_55%,#eef0ff_100%)] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <p className="mb-5 text-sm font-semibold text-[#3120ff]">Zimbabwean domains, made simple</p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-6xl">Build your place on the web.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">Register a .co.zw, .org.zw, or .ac.zw domain with clear pricing and straightforward support.</p>

        <form onSubmit={search} className="mx-auto mt-10 flex max-w-3xl flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lg sm:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <Search className="h-5 w-5 shrink-0 text-zinc-400" />
            <input value={name} onChange={(event) => setName(event.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))} placeholder="yourname" className="min-w-0 flex-1 py-3 text-base outline-none" aria-label="Domain name" />
            <select value={tld} onChange={(event) => setTld(event.target.value)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-2 text-sm font-semibold outline-none">
              <option value=".co.zw">.co.zw · $2</option>
              <option value=".org.zw">.org.zw · $3</option>
              <option value=".ac.zw">.ac.zw · $3</option>
            </select>
          </div>
          <button disabled={loading || !name.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-[#3120ff] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2819d9] disabled:opacity-50"><span>{loading ? 'Checking...' : 'Search'}</span><ArrowRight className="h-4 w-4" /></button>
        </form>

        {result && (
          <div className="mx-auto mt-4 flex max-w-3xl flex-col items-start justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-left sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              {result.isAvailable ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-zinc-400" />}
              <div><p className="font-mono text-sm font-semibold text-zinc-950">{result.domain}</p><p className="text-sm text-zinc-500">{result.isAvailable ? `Available for $${result.price.toFixed(2)} / year` : result.reason}</p></div>
            </div>
            {result.isAvailable && <button onClick={() => register(result.domain)} className="rounded-lg bg-[#3120ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2819d9]">Register</button>}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[['.co.zw', '$2 / year', 'Businesses and projects'], ['.org.zw', '$3 / year', 'Organisations'], ['.ac.zw', '$3 / year', 'Academic institutions']].map(([extension, price, description]) => <div key={extension} className="rounded-xl border border-zinc-200 bg-white p-4"><p className="font-mono text-lg font-bold text-zinc-950">{extension}</p><p className="mt-1 font-semibold text-[#3120ff]">{price}</p><p className="mt-1 text-sm text-zinc-500">{description}</p></div>)}
        </div>
      </div>
    </section>
  );
};

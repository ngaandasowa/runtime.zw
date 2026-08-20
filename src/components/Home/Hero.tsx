import React, { useState } from 'react';
import { 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Server,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Globe
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { domainAvailabilityService, DomainAvailabilityResult } from '../../services/DomainAvailabilityService';

export const Hero: React.FC = () => {
  const { setActiveView, setPendingRegisterDomain, setRegistrationModalOpen } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTld, setSelectedTld] = useState('.co.zw');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<DomainAvailabilityResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    const domainToCheck = searchTerm.includes('.') ? searchTerm : `${searchTerm}${selectedTld}`;
    const result = await domainAvailabilityService.checkAvailability(domainToCheck);
    setSearchResult(result);
    setIsSearching(false);
  };

  const handleRegisterClick = (domainName: string) => {
    setPendingRegisterDomain(domainName);
    setRegistrationModalOpen(true);
  };

  return (
    <div className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-radial-glow border-b border-zinc-200">
      
      {/* Decorative Grid Lines & Corner Red Crosshairs */}
      <div className="absolute inset-0 bg-grid-clean pointer-events-none opacity-60"></div>
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Badge */}
        <div className="flex justify-center mb-6">
          <div 
            onClick={() => setRegistrationModalOpen(true)}
            className="group cursor-pointer inline-flex items-center space-x-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1 text-xs font-semibold text-zinc-700 shadow-2xs hover:border-[#FF2D20]/40 transition"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#FF2D20]"></span>
            <span className="text-zinc-600">Phase 1 Active: Sovereign Zimbabwean Domains at $2.00/yr</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-[#FF2D20] group-hover:translate-x-0.5 transition" />
          </div>
        </div>

        {/* Primary Hero Header */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-zinc-950 mb-6 leading-[1.1]">
            The clean stack for <br className="hidden sm:inline" />
            <span className="text-[#FF2D20]">builders</span> and agents.
          </h1>
          
          <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto font-normal leading-relaxed mb-8">
            Runtime is the next-generation developer and cloud ecosystem. Sovereign Zimbabwean .co.zw domain registration at $2/yr, automated ZISPA RFC dispatch, and unified cloud compute.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              id="hero-primary-cta"
              onClick={() => {
                const el = document.getElementById('domain-search-hero');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center space-x-2 rounded-xl bg-[#FF2D20] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#E0241A] transition active:scale-98"
            >
              <span>Get Started with .co.zw</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              id="hero-secondary-docs-cta"
              onClick={() => setActiveView('docs')}
              className="inline-flex items-center space-x-2 rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 hover:border-zinc-300 transition active:scale-98"
            >
              <span>Explore Platform Docs</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Hero Interactive Domain Search Box */}
        <div id="domain-search-hero" className="max-w-3xl mx-auto relative mb-16">
          
          {/* Corner Crosshairs */}
          <div className="absolute -top-2.5 -left-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -top-2.5 -right-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -bottom-2.5 -left-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -bottom-2.5 -right-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 sm:p-4 shadow-xl ring-1 ring-black/5">
            <form onSubmit={handleSearch}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 flex items-center pl-3">
                  <Search className="h-5 w-5 text-zinc-400 mr-2.5 shrink-0" />
                  <input
                    id="hero-domain-input"
                    type="text"
                    placeholder="mybusiness"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
                    className="w-full bg-transparent py-2.5 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 font-medium focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    id="hero-tld-select"
                    value={selectedTld}
                    onChange={(e) => setSelectedTld(e.target.value)}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-bold text-zinc-800 focus:border-[#FF2D20] focus:outline-none"
                  >
                    <option value=".co.zw">.co.zw ($2/yr)</option>
                    <option value=".org.zw">.org.zw ($2/yr)</option>
                    <option value=".ac.zw">.ac.zw ($2/yr)</option>
                  </select>

                  <button
                    id="hero-search-btn"
                    type="submit"
                    disabled={isSearching || !searchTerm.trim()}
                    className="inline-flex items-center justify-center space-x-2 rounded-xl bg-[#FF2D20] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#E0241A] disabled:opacity-50 active:scale-95 shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <span>Search Domain</span>
                        <ArrowRight className="h-4 w-4 text-white" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Live Search Result Feedback */}
            {searchResult && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <div className="flex items-start sm:items-center space-x-3">
                    {searchResult.isAvailable ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-zinc-600 shrink-0">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-zinc-900 font-mono">
                          {searchResult.domain}
                        </span>
                        {searchResult.isAvailable ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {searchResult.isAvailable 
                          ? 'ZISPA direct delegation ready. Registrar pricing fixed at $2.00/yr.'
                          : searchResult.reason || 'This domain is already registered in the central registry.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    {searchResult.isAvailable ? (
                      <>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-zinc-900">
                            ${searchResult.price.toFixed(2)}
                            <span className="text-xs text-zinc-500 font-normal"> / yr</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-medium">Renewal guarantee</div>
                        </div>

                        <button
                          id="hero-register-available-btn"
                          onClick={() => handleRegisterClick(searchResult.domain)}
                          className="inline-flex items-center space-x-1.5 rounded-lg bg-[#FF2D20] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#E0241A] active:scale-95 shadow-sm"
                        >
                          <span>Register</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setSearchTerm(searchTerm + '-hq');
                        }}
                        className="text-xs font-semibold text-[#FF2D20] hover:underline"
                      >
                        Try "{searchTerm}-hq{selectedTld}"
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clean Logo / Trust Bar */}
        <div className="pt-6 border-t border-zinc-200">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">
            Powering Zimbabwean Ideas &amp; Sovereign Infrastructure
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-center p-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs">
              <span className="text-[#FF2D20] mr-1.5 font-bold">●</span> ZISPA Gateway
            </div>
            <div className="flex items-center justify-center p-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-500 mr-1.5" /> Ngaatec Registrar
            </div>
            <div className="flex items-center justify-center p-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs">
              <Server className="h-3.5 w-3.5 text-zinc-500 mr-1.5" /> 4x Anycast NS
            </div>
            <div className="flex items-center justify-center p-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs">
              <Zap className="h-3.5 w-3.5 text-zinc-500 mr-1.5" /> RFC Automation
            </div>
            <div className="hidden md:flex items-center justify-center p-3 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 shadow-2xs">
              <Globe className="h-3.5 w-3.5 text-zinc-500 mr-1.5" /> POTRAZ Aligned
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

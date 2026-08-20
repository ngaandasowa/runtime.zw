import React from 'react';
import { Server, ArrowUpRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Footer: React.FC = () => {
  const { setActiveView } = useStore();

  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-600 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Platform identity */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF2D20] text-white">
                <Server className="h-4 w-4" />
              </div>
              <span className="text-base font-extrabold text-zinc-950 tracking-tight">RUNTIME</span>
              <span className="text-xs font-bold text-[#FF2D20] bg-[#FF2D20]/10 px-2 py-0.5 rounded-full border border-[#FF2D20]/20">
                CLOUD &amp; INFRASTRUCTURE
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-500 max-w-md leading-relaxed">
              Runtime is building sovereign developer cloud infrastructure and domain registry systems. 
              Start with your Zimbabwean digital identity; deploy scalable microservices, databases, and automated workflows.
            </p>

            <div className="pt-2">
              <div className="inline-flex items-center space-x-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <div className="text-zinc-700">
                  <span className="font-bold text-zinc-900">Ngaatec Registrar Engine:</span> Operational • ZISPA Direct Registry Gateway
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Platform products */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">
              Infrastructure
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button 
                  onClick={() => setActiveView('home')} 
                  className="hover:text-[#FF2D20] transition flex items-center space-x-2"
                >
                  <span className="text-zinc-900 font-semibold">.co.zw Domains</span>
                  <span className="text-[10px] font-bold bg-[#FF2D20]/10 text-[#FF2D20] px-1.5 py-0.2 rounded-full">Live</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('platform')} 
                  className="hover:text-[#FF2D20] transition flex items-center space-x-2 text-zinc-600"
                >
                  <span>Application Runtime</span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">Soon</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('platform')} 
                  className="hover:text-[#FF2D20] transition flex items-center space-x-2 text-zinc-600"
                >
                  <span>Cloud Compute &amp; DB</span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">Soon</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveView('platform')} 
                  className="hover:text-[#FF2D20] transition flex items-center space-x-2 text-zinc-600"
                >
                  <span>Developer API</span>
                  <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded">Soon</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Resources & Governance */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-4">
              Developers &amp; Ops
            </h4>
            <ul className="space-y-2.5 text-xs font-medium">
              <li>
                <button onClick={() => setActiveView('docs')} className="text-zinc-600 hover:text-[#FF2D20] transition">
                  Architecture Specs
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('docs')} className="text-zinc-600 hover:text-[#FF2D20] transition">
                  ZISPA RFC Protocol
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('pricing')} className="text-zinc-600 hover:text-[#FF2D20] transition">
                  TLD Transparent Pricing
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('docs')} className="text-zinc-600 hover:text-[#FF2D20] transition">
                  REST API Reference
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer bar */}
        <div className="border-t border-zinc-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2 text-zinc-500">
            <span>Powered by</span>
            <span className="font-bold text-zinc-900">Ngaatec Private Limited</span>
            <span>•</span>
            <span>Registered Technology Registrar</span>
          </div>

          <div className="flex items-center space-x-4 text-zinc-500 font-medium">
            <span>© {new Date().getFullYear()} Runtime Infrastructure. All rights reserved.</span>
          </div>
        </div>

        {/* Giant subtle watermark like Laravel footer */}
        <div className="mt-12 select-none pointer-events-none text-center">
          <span className="text-6xl sm:text-9xl font-extrabold tracking-tighter text-zinc-100/80 uppercase">
            RUNTIME
          </span>
        </div>
      </div>
    </footer>
  );
};

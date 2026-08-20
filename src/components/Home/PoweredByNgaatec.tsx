import React from 'react';
import { ShieldCheck, Check } from 'lucide-react';

export const PoweredByNgaatec: React.FC = () => {
  return (
    <section className="py-16 border-b border-zinc-200 bg-[#FAFAFA] relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 sm:p-12 relative shadow-lg ring-1 ring-black/5">
          
          {/* Corner Crosshairs */}
          <div className="absolute -top-2.5 -left-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -top-2.5 -right-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -bottom-2.5 -left-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>
          <div className="absolute -bottom-2.5 -right-2.5 text-[#FF2D20] font-mono text-sm select-none font-bold">+</div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Col: Narrative */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center space-x-2 rounded-full border border-[#FF2D20]/20 bg-[#FF2D20]/10 px-3 py-0.5 text-xs font-bold text-[#FF2D20]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>OFFICIAL INFRASTRUCTURE PROVIDER</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
                Powered by Ngaatec
              </h2>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                Runtime is a cloud and developer technology platform operated by{' '}
                <strong className="text-zinc-900 font-bold">Ngaatec Private Limited</strong>.
              </p>

              <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                For domain registration and lifecycle operations, .co.zw domain requests are processed 
                directly through Ngaatec’s official registrar connectivity and delegated via ZISPA (Zimbabwe Internet Service Providers Association) protocols.
              </p>

              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-700">
                <div className="flex items-center space-x-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span className="font-medium">Direct ZISPA Delegation</span>
                </div>
                <div className="flex items-center space-x-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span className="font-medium">Enterprise DNS Clusters</span>
                </div>
                <div className="flex items-center space-x-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span className="font-medium">Transparent Upstream Pricing</span>
                </div>
                <div className="flex items-center space-x-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span className="font-medium">Automated Plaintext RFC Engine</span>
                </div>
              </div>
            </div>

            {/* Right Col: Technical Stack Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-xs shadow-2xs">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-3 text-zinc-500">
                  <div className="flex items-center space-x-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="text-zinc-900 font-bold font-mono">REGISTRY_GATEWAY.STATUS</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ONLINE</span>
                </div>

                <div className="space-y-2 text-zinc-700 font-mono">
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Operating Entity:</span>
                    <span className="text-zinc-900 font-bold">Ngaatec (Pvt) Ltd</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Upstream Endpoint:</span>
                    <span className="text-[#FF2D20] font-medium">clientzone.ngaatec.com</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Registry Target:</span>
                    <span className="text-zinc-900">admin@zispa.org.zw</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-200">
                    <span className="text-zinc-500">Registrar Mailer:</span>
                    <span className="text-zinc-900">dns@ngaatec.com</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-zinc-500">Active Nameservers:</span>
                    <span className="text-zinc-900 font-bold">4 / 4 Healthy</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 text-[11px] text-zinc-500 text-center">
                  Encrypted server-to-registry dispatch protocol
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

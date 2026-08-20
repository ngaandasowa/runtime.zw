import React from 'react';
import { Check, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const PricingSection: React.FC = () => {
  const { setRegistrationModalOpen } = useStore();

  return (
    <section className="py-16 md:py-24 border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#FF2D20] mb-2 bg-[#FF2D20]/10 px-3 py-1 rounded-full border border-[#FF2D20]/20">
            <span>Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-2">
            Predictable, honest domain pricing.
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 mt-4 leading-relaxed">
            No bait-and-switch renewal markups. Fixed $2.00 USD/year for .co.zw registration and renewals with complete registrant ownership.
          </p>
        </div>

        {/* Primary Pricing Grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: .co.zw Primary */}
          <div className="md:col-span-2 rounded-2xl border-2 border-zinc-900 bg-white p-8 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 bg-[#FF2D20] text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
              Standard Sovereign Rate
            </div>

            <div>
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl font-extrabold text-zinc-950 font-mono">.co.zw</span>
                <span className="text-xs font-bold text-[#FF2D20] bg-[#FF2D20]/10 px-2.5 py-0.5 rounded-full border border-[#FF2D20]/20">
                  ZIMBABWE ccTLD
                </span>
              </div>

              <div className="flex items-baseline space-x-2 mb-4">
                <span className="text-5xl font-extrabold text-zinc-950">$2.00</span>
                <span className="text-sm font-semibold text-zinc-500">USD / year</span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-600 mb-6 leading-relaxed">
                Official domain registration for Zimbabwean commercial businesses, tech startups, agencies, and personal developer portfolios.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 border-t border-zinc-100 pt-6 text-xs text-zinc-700">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span className="font-semibold">$2.00/yr Fixed Renewal Price</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span>Direct ZISPA Delegation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span>4 High-Availability Nameservers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span>Full Registrant Ownership Rights</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span>Automated ZISPA Plaintext RFC</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-[#FF2D20] shrink-0" />
                  <span>Instant Order &amp; Invoice Billing</span>
                </div>
              </div>
            </div>

            <button
              id="pricing-register-btn"
              onClick={() => setRegistrationModalOpen(true)}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-[#FF2D20] py-3.5 text-xs font-bold text-white hover:bg-[#E0241A] transition active:scale-98 shadow-sm"
            >
              <span>Register .co.zw for $2/yr</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Card 2: Other ZW TLDs */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 mb-2">Specialized .zw Extensions</h3>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Educational institutions and non-profit organizations operating within Zimbabwe.
              </p>

              <div className="space-y-4 border-t border-zinc-200 pt-4 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                  <span className="text-zinc-900 font-bold font-mono">.org.zw</span>
                  <span className="text-zinc-900 font-extrabold">$2.00/yr</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                  <span className="text-zinc-900 font-bold font-mono">.ac.zw</span>
                  <span className="text-zinc-900 font-extrabold">$2.00/yr</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-zinc-500">.com / .net</span>
                  <span className="text-zinc-400 font-medium">Phase 2</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-white p-3.5 text-xs text-zinc-600 border border-zinc-200 shadow-2xs">
                <span className="font-bold text-zinc-900">Registry Policy:</span> All registrations require valid administrative details submitted to ZISPA.
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setRegistrationModalOpen(true)}
                className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition shadow-2xs"
              >
                Search Non-Profit / Academic
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

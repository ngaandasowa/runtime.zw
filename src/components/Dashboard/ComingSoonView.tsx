import React from 'react';
import { Terminal, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ComingSoonViewProps {
  moduleName: string;
  category: string;
  description: string;
  architectureSpecs: string[];
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({
  moduleName,
  category,
  description,
  architectureSpecs
}) => {
  const { setActiveView } = useStore();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-0.5 text-xs text-zinc-600">
              <span className="font-bold">{category.toUpperCase()}</span>
              <span>•</span>
              <span className="text-[#3120ff] font-bold">PHASE 2 ROADMAP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight">
              {moduleName}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>

          <div className="shrink-0">
            <div className="rounded-xl border border-[#3120ff]/15 bg-[#3120ff]/5/50 px-4 py-3 text-center">
              <span className="text-xs font-bold text-[#3120ff] uppercase tracking-wider block">
                Module Status
              </span>
              <span className="text-sm font-extrabold text-zinc-950">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Spec Blueprint */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-4 flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-[#3120ff]" />
          <span>Planned Architecture &amp; Service Layer</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {architectureSpecs.map((spec, i) => (
            <div key={i} className="flex items-start space-x-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
              <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#3120ff]/5 text-[#3120ff] font-bold text-xs shrink-0 mt-0.5 border border-[#3120ff]/15 font-mono">
                {i + 1}
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed font-mono">
                {spec}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="text-zinc-500">
            Runtime's extensible database models &amp; service contracts are already prepared for this service.
          </div>
          <button
            onClick={() => setActiveView('docs')}
            className="inline-flex items-center space-x-1.5 text-[#3120ff] hover:text-[#2819d9] font-bold transition"
          >
            <span>Read Architecture Specs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

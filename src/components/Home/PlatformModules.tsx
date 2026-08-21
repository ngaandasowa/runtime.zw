import React from 'react';
import { Cloud, Code2, Database, FileText, Sparkles } from 'lucide-react';

const services = [
  ['Cloud hosting', 'Deploy and run applications on Runtime.', Cloud],
  ['API services', 'Connect your products with reliable APIs.', Code2],
  ['Data services', 'Store and manage application data.', Database],
  ['Developer tools', 'Tools for building and shipping software.', FileText],
  ['AI and automation', 'Build intelligent workflows and products.', Sparkles],
] as const;

export const PlatformModules: React.FC = () => (
  <section id="coming-soon" className="border-b border-zinc-200 bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-6xl">
      <div className="max-w-2xl"><p className="text-sm font-semibold text-[#3120ff]">Coming soon</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">More tools are on the way.</h2><p className="mt-4 text-zinc-600">Domains are available now. Hosting, APIs, data, developer tools, and automation will be added as the platform grows.</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {services.map(([title, description, Icon]) => <article key={title} className="border border-zinc-200 bg-zinc-50 p-5"><Icon className="h-5 w-5 text-zinc-500" /><h3 className="mt-5 font-semibold text-zinc-950">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-500">{description}</p><span className="mt-5 inline-block text-xs font-semibold text-zinc-400">Coming soon</span></article>)}
      </div>
    </div>
  </section>
);

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Cloud, Globe2, Server, ShieldCheck } from 'lucide-react';
import { guideApi, RuntimeGuide } from '../services/GuideService';

const Shell: React.FC<{eyebrow:string; title:string; intro:string; children:React.ReactNode}> = ({eyebrow,title,intro,children}) => (
  <div className="bg-white">
    <section className="border-b border-zinc-200 bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-[#3120ff]">{eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-600 sm:text-lg">{intro}</p>
      </div>
    </section>
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">{children}</div>
  </div>
);

const Card: React.FC<{title:string; children:React.ReactNode}> = ({title,children}) => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-6"><h2 className="text-xl font-bold text-zinc-950">{title}</h2><div className="mt-3 text-sm leading-7 text-zinc-600">{children}</div></div>
);

export const DomainsPage: React.FC = () => (
  <Shell eyebrow="Domains" title="Register and manage domains with Runtime" intro="Search for a domain, register it, manage renewals and choose how its DNS is handled. Runtime supports Zimbabwe domain registration alongside other available extensions.">
    <div className="grid gap-5 md:grid-cols-2">
      <Card title="Zimbabwe domains"><p>Runtime supports .co.zw registration and also handles .org.zw and .ac.zw applications where the registry requires additional information.</p><Link className="mt-4 inline-flex items-center gap-2 font-semibold text-[#3120ff]" to="/domains/co-zw">Learn about .co.zw <ArrowRight className="h-4 w-4" /></Link></Card>
      <Card title="DNS choice"><p>Use Runtime DNS, powered by Cloudflare, or keep your own nameservers as Custom DNS. Existing Custom DNS domains are not silently migrated.</p><Link className="mt-4 inline-flex items-center gap-2 font-semibold text-[#3120ff]" to="/dns">Understand Runtime DNS <ArrowRight className="h-4 w-4" /></Link></Card>
    </div>
    <div className="mt-8 rounded-2xl bg-zinc-950 p-7 text-white"><h2 className="text-2xl font-bold">Ready to search?</h2><p className="mt-2 text-sm text-zinc-300">Check availability from Runtime's domain search.</p><Link to="/#domain-search" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950">Search domains <ArrowRight className="h-4 w-4" /></Link></div>
  </Shell>
);

export const CoZwPage: React.FC = () => (
  <Shell eyebrow=".co.zw domains" title="Register a .co.zw domain in Zimbabwe" intro="A .co.zw domain gives a business, project or organisation a Zimbabwe-focused web address. Runtime handles the registration workflow and keeps the domain in your account for ongoing management.">
    <div className="grid gap-5 md:grid-cols-3">
      <Card title="Search"><p>Check whether the .co.zw name you want is available before starting registration.</p></Card>
      <Card title="Register"><p>Complete the order and required registrant details. Registration remains subject to the registry's rules and approval process.</p></Card>
      <Card title="Connect"><p>Choose Runtime DNS or Custom DNS, then connect the domain to your website, hosting or other service.</p></Card>
    </div>
    <div className="mt-10 prose prose-zinc max-w-none"><h2 className="text-2xl font-bold text-zinc-950">DNS after registration</h2><p className="mt-3 text-zinc-600 leading-7">Runtime DNS uses a Cloudflare zone created for the domain. Cloudflare assigns the authoritative nameservers for that individual zone, so Runtime does not use one fixed nameserver pair. If you choose other nameservers, the domain remains on Custom DNS.</p></div>
    <div className="mt-8 flex flex-wrap gap-3"><Link to="/#domain-search" className="rounded-xl bg-[#3120ff] px-5 py-3 text-sm font-semibold text-white">Search a .co.zw domain</Link><Link to="/domain-pricing" className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-800">View domain pricing</Link></div>
  </Shell>
);

export const DnsPage: React.FC = () => (
  <Shell eyebrow="Runtime DNS" title="DNS management powered by Cloudflare" intro="Runtime DNS is the DNS option for domains managed through Runtime's Cloudflare integration. It is designed to make common DNS changes easier while keeping Custom DNS domains separate.">
    <div className="grid gap-5 md:grid-cols-2">
      <Card title="How Runtime DNS works"><p>Runtime creates or uses a Cloudflare zone for the domain. Cloudflare assigns nameservers specifically to that zone. Once delegation is confirmed, Runtime can manage DNS records for the domain.</p></Card>
      <Card title="What Custom DNS means"><p>A domain using nameservers outside Runtime's Cloudflare-managed zone is Custom DNS. Runtime does not automatically replace those nameservers or migrate existing DNS records.</p></Card>
    </div>
    <h2 className="mt-12 text-2xl font-bold text-zinc-950">Connect your domain to the services you use</h2>
    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">DNS records can point a domain to platforms such as Vercel, Netlify, Render, GitHub Pages, Firebase, a VPS or traditional web hosting. The exact records come from the platform you are connecting.</p>
    <Link to="/guides" className="mt-5 inline-flex items-center gap-2 font-semibold text-[#3120ff]">Read the DNS guides <ArrowRight className="h-4 w-4" /></Link>
  </Shell>
);

export const GuidesPage: React.FC = () => {
  const [published,setPublished]=useState<RuntimeGuide[]>([]);
  useEffect(()=>{ guideApi('/').then(d=>setPublished(d.guides||[])).catch(()=>{}); },[]);
  return <Shell eyebrow="Guides" title="Domain and DNS guides" intro="Practical instructions for registering domains and connecting them to websites, cloud platforms and hosting services.">
    <div className="grid gap-4 md:grid-cols-2">
      {published.map(g=><Link key={g.slug} to={`/guides/${g.slug}`} className="group overflow-hidden rounded-2xl border border-zinc-200 transition hover:border-[#3120ff]/40"><div className="aspect-1200/630 bg-zinc-100">{g.featured_image?<img src={g.featured_image} alt={g.featured_image_alt||g.title} className="h-full w-full object-cover" loading="lazy"/>:<div className="flex h-full items-center justify-center px-8 text-center text-sm font-semibold text-zinc-400">Runtime Guide</div>}</div><div className="p-6"><p className="text-[11px] font-bold uppercase tracking-wide text-[#3120ff]">{g.category||'Guide'}</p><h2 className="mt-2 font-bold text-zinc-950">{g.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">{g.excerpt}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#3120ff]">Read guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div></Link>)}
    </div>
  </Shell>;
};

import React, { useState } from 'react';
import { 
  Globe, 
  Cpu, 
  Database, 
  Terminal, 
  Boxes, 
  Check, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  Server, 
  Layers, 
  Network,
  Activity,
  Copy,
  CheckCheck
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface ModuleCardProps {
  title: string;
  badge: 'Available Now' | 'Coming Soon';
  badgeType: 'active' | 'upcoming';
  description: string;
  icon: React.ReactNode;
  specs: string[];
  onAction?: () => void;
  actionText?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  title,
  badge,
  badgeType,
  description,
  icon,
  specs,
  onAction,
  actionText
}) => {
  return (
    <div className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 bg-white ${
      badgeType === 'active'
        ? 'border-zinc-300 shadow-lg ring-1 ring-black/5'
        : 'border-zinc-200 hover:border-zinc-300 shadow-2xs'
    }`}>
      <div>
        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
            badgeType === 'active' 
              ? 'border-red-200 bg-red-50 text-[#FF2D20]' 
              : 'border-zinc-200 bg-zinc-50 text-zinc-600'
          }`}>
            {icon}
          </div>

          <span className={`inline-flex items-center space-x-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            badgeType === 'active'
              ? 'bg-[#FF2D20]/10 text-[#FF2D20] border border-[#FF2D20]/20'
              : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badgeType === 'active' ? 'bg-[#FF2D20]' : 'bg-zinc-400'}`}></span>
            <span>{badge}</span>
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-zinc-900 mb-2">
          {title}
        </h3>
        <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
          {description}
        </p>

        {/* Feature Specs */}
        <div className="space-y-2 mb-6 border-t border-zinc-100 pt-4">
          {specs.map((spec, i) => (
            <div key={i} className="flex items-start space-x-2 text-xs text-zinc-600">
              <Check className="h-3.5 w-3.5 text-[#FF2D20] shrink-0 mt-0.5" />
              <span>{spec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Action */}
      {onAction && actionText ? (
        <button
          onClick={onAction}
          className={`w-full inline-flex items-center justify-center space-x-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
            badgeType === 'active'
              ? 'bg-[#FF2D20] text-white hover:bg-[#E0241A] shadow-sm'
              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
        >
          <span>{actionText}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="w-full text-center py-2 text-xs text-zinc-400 border border-dashed border-zinc-200 rounded-xl font-medium">
          In active development
        </div>
      )}
    </div>
  );
};

export const PlatformModules: React.FC = () => {
  const { setActiveView, setRegistrationModalOpen } = useStore();
  const [activeCodeTab, setActiveCodeTab] = useState<'dns' | 'cli' | 'zispa' | 'api'>('dns');
  const [copied, setCopied] = useState(false);

  const codeSnippets = {
    dns: `// Configure Sovereign Zimbabwean Nameservers
import { RuntimeDNS } from '@runtime/dns';

const dns = new RuntimeDNS({ apiKey: process.env.RUNTIME_KEY });

await dns.records.create({
  domain: 'mybusiness.co.zw',
  type: 'A',
  name: '@',
  value: '102.130.112.44',
  ttl: 300
});

// 4-Tier Redundant Delegation: ns1..ns4.ngaatec.com`,
    cli: `# Deploy your application instantly to Runtime Cloud
$ npm install -g runtime-cli

$ runtime login
> Authenticated as developer@mybusiness.co.zw

$ runtime deploy --domain mybusiness.co.zw
> Building container image...
> Provisioning Anycast SSL certificate...
> Routed to https://mybusiness.co.zw [200 OK]`,
    zispa: `1.  (N)ew, (M)odify, (D)elete or (T)ransfer ...: N
2.  Fully Qualified Domain Name ................: mybusiness.co.zw
3a. Sponsoring Registrar .......................: NGAATEC
3b. Postal Address .............................: P.O. Box 4122, Harare, ZW
4.  Admin Contact ..............................: Ngaatec Operations
5.  Technical Contact ..........................: dns@ngaatec.com
6.  Primary Nameserver .........................: ns1.ngaatec.com [102.130.112.1]
7.  Secondary Nameserver .......................: ns2.ngaatec.com [102.130.112.2]`,
    api: `// Programmatic Domain Registration via REST API
const response = await fetch('https://api.runtime.co.zw/v1/domains/register', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rt_live_92a8e104f32a',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    domain: 'startup.co.zw',
    period_years: 1,
    nameservers: ['ns1.ngaatec.com', 'ns2.ngaatec.com']
  })
});`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-16 md:py-24 border-b border-zinc-200 bg-[#FAFAFA]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#FF2D20] mb-2 bg-[#FF2D20]/10 px-3 py-1 rounded-full border border-[#FF2D20]/20">
            <span>Modular Cloud Ecosystem</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-zinc-950 tracking-tight mt-2">
            Ship web apps with the sovereign cloud runtime.
          </h2>
          <p className="text-sm sm:text-base text-zinc-600 mt-4 leading-relaxed">
            Runtime brings the modern developer experience to Africa. Instant Zimbabwean domain registry integration, automated RFC dispatch, and unified compute.
          </p>
        </div>

        {/* Bento Code Showcase */}
        <div className="mb-16 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-xl ring-1 ring-black/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-4 mb-4">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setActiveCodeTab('dns')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeCodeTab === 'dns'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                DNS SDK
              </button>
              <button
                onClick={() => setActiveCodeTab('cli')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeCodeTab === 'cli'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                CLI Deploy
              </button>
              <button
                onClick={() => setActiveCodeTab('zispa')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeCodeTab === 'zispa'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                ZISPA Plaintext RFC
              </button>
              <button
                onClick={() => setActiveCodeTab('api')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeCodeTab === 'api'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                REST API
              </button>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition px-2.5 py-1 rounded-lg border border-zinc-200 bg-zinc-50"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="rounded-xl bg-zinc-950 p-4 sm:p-5 text-zinc-200 font-mono text-xs overflow-x-auto leading-relaxed border border-zinc-900">
            <pre className="font-mono">
              <code>{codeSnippets[activeCodeTab]}</code>
            </pre>
          </div>
        </div>

        {/* 6 Platform Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* 1. Domains (Available Now) */}
          <ModuleCard
            title="Domains & Registry"
            badge="Available Now"
            badgeType="active"
            description="High-performance Zimbabwean domain registration, renewals, transfers, and direct RFC ZISPA delegation."
            icon={<Globe className="h-5 w-5" />}
            specs={[
              '.co.zw registration & renewal at $2.00/yr',
              'Automated ZISPA plain-text templates (N/M/D/T)',
              '4-tier redundant nameserver delegation',
              'Sub-minute WHOIS and ownership updates'
            ]}
            actionText="Register Domain"
            onAction={() => setRegistrationModalOpen(true)}
          />

          {/* 2. Application Runtime (Coming Soon) */}
          <ModuleCard
            title="Application Runtime"
            badge="Coming Soon"
            badgeType="upcoming"
            description="Push code to git and let Runtime handle containerization, multi-region edge routing, and environment secrets."
            icon={<Layers className="h-5 w-5" />}
            specs={[
              'Zero-config Docker & Node/Laravel builds',
              'Instant preview URLs for PRs & staging',
              'Global edge routing with SSL auto-provisioning',
              'Real-time streaming build & runtime logs'
            ]}
            actionText="View Specification"
            onAction={() => setActiveView('docs')}
          />

          {/* 3. Cloud Infrastructure (Coming Soon) */}
          <ModuleCard
            title="Cloud Infrastructure"
            badge="Coming Soon"
            badgeType="upcoming"
            description="Elastic virtual machines, high-throughput NVMe block storage, and fully managed PostgreSQL/Redis instances."
            icon={<Cpu className="h-5 w-5" />}
            specs={[
              'Dedicated vCPU compute with sub-millisecond I/O',
              'Managed PostgreSQL clusters with auto-failover',
              'S3-compatible object storage for static assets',
              'Isolated VPC networking with zero public egress fee'
            ]}
            actionText="View Specification"
            onAction={() => setActiveView('docs')}
          />

          {/* 4. Developer Platform (Coming Soon) */}
          <ModuleCard
            title="Developer Platform"
            badge="Coming Soon"
            badgeType="upcoming"
            description="Unified project workspaces, granular team access controls, API keys, webhook event triggers, and audit trails."
            icon={<Terminal className="h-5 w-5" />}
            specs={[
              'Scoped programmatic API tokens (Read/Write)',
              'Reliable event-driven webhooks with HMAC signatures',
              'Immutable security audit logs',
              'Team role-based permissions (RBAC)'
            ]}
            actionText="View Docs"
            onAction={() => setActiveView('docs')}
          />

          {/* 5. API Services (Coming Soon) */}
          <ModuleCard
            title="API & Automations"
            badge="Coming Soon"
            badgeType="upcoming"
            description="Programmatic RESTful APIs to register domains, adjust DNS records, trigger deployments, and monitor resources."
            icon={<Network className="h-5 w-5" />}
            specs={[
              'OpenAPI 3.1 & SDKs for PHP/Laravel, Node, Go',
              'Automated ZISPA registry batch dispatch',
              'Dynamic DNS updates & SSL automation',
              'CLI tool: `runtime deploy` and `runtime domain`'
            ]}
            actionText="View Docs"
            onAction={() => setActiveView('docs')}
          />

          {/* 6. Diagnostics & Health Engine (Coming Soon) */}
          <ModuleCard
            title="Diagnostics & Health Engine"
            badge="Coming Soon"
            badgeType="upcoming"
            description="Autonomous infrastructure diagnostics, predictive resource scaling, and intelligent application monitoring."
            icon={<Activity className="h-5 w-5" />}
            specs={[
              'Automated crash diagnosis and root-cause analysis',
              'Predictive spike autoscaling',
              'Real-time infrastructure sizing',
              'Intelligent latency & uptime alerts'
            ]}
            actionText="View Specs"
            onAction={() => setActiveView('docs')}
          />

        </div>
      </div>
    </section>
  );
};

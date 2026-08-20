import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Code2, 
  Layers, 
  FileText, 
  Copy, 
  Check, 
  ArrowRight, 
  Server, 
  Cpu, 
  Key, 
  Globe,
  Database
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const DocsView: React.FC = () => {
  const { showNotification } = useStore();
  const [activeTab, setActiveTab] = useState<'zispa_spec' | 'rest_api' | 'laravel_arch' | 'cloud_roadmap'>('zispa_spec');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    showNotification('Code snippet copied to clipboard', 'info');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const zispaTemplateSample = `** Registration of .co.zw Domain Name **

0.  ADMINISTRATIVE DETAILS
    0a. Action              : N
    0b. Current Domain      : 
    0c. Proposed Domain     : startup.co.zw
    0d. Revision Number     : 1

1.  APPLICANT DETAILS
    1a. Full Name           : Farai Moyo
    1b. Organisation Name   : ZimTech Ventures Pvt Ltd
    1c. Physical Address    : 45 Samora Machel Avenue, Harare, Zimbabwe
    1d. Postal Address      : P.O. Box 410, Harare, Zimbabwe
    1e. Telephone Number    : +263 77 123 4567
    1f. Fax Number          : 
    1g. Email Address       : farai@zimtech.co.zw

2.  ORGANISATION DESCRIPTION
    2a. Description of Org  : Technology research & cloud software development
    2b. Proposed Domain Use : Main corporate SaaS & API platform

3.  TECHNICAL CONTACT
    3a. Full Name           : Ngaatec Infrastructure Team
    3b. Organisation Name   : Ngaatec (Pvt) Ltd
    3c. Physical Address    : Ngaatec Cloud Campus, Harare, Zimbabwe
    3d. Postal Address      : P.O. Box 1020, Harare, Zimbabwe
    3e. Telephone Number    : +263 77 000 0000
    3f. Fax Number          : 
    3g. Email Address       : tech@ngaatec.com

4.  PRIMARY NAMESERVER
    4a. Primary Server Host : ns1.runtime.co.zw
    4b. Primary Server Net  : 
    4c. Primary Server IP   : 

5.  SECONDARY NAMESERVERS
    5a. Secondary Server (1): ns2.runtime.co.zw
    5b. Secondary Net (1)   : 
    5c. Secondary IP (1)    : 
    5d. Secondary Server (2): ns3.runtime.co.zw
    5e. Secondary Net (2)   : 
    5f. Secondary IP (2)    : 
    5g. Secondary Server (3): ns4.runtime.co.zw
    5h. Secondary Net (3)   : 
    5i. Secondary IP (3)    : 

6.  PAYMENT / BILLING DETAILS
    6a. Billing Contact     : billing@ngaatec.com
    6b. Order Reference     : ORD-2026-COZW-8941
    6c. Amount Paid (USD)   : $2.00`;

  const apiCurlSample = `# Check Domain Availability
curl -X GET "https://api.runtime.co.zw/v1/domains/check?name=startup.co.zw" \\
  -H "Authorization: Bearer rt_live_9f81a7b8e" \\
  -H "Accept: application/json"

# Response:
{
  "domain": "startup.co.zw",
  "available": true,
  "tld": ".co.zw",
  "price_usd": 2.00,
  "renewal_price_usd": 2.00,
  "currency": "USD"
}

# Register Domain
curl -X POST "https://api.runtime.co.zw/v1/domains/register" \\
  -H "Authorization: Bearer rt_live_9f81a7b8e" \\
  -H "Content-Type: application/json" \\
  -d '{
    "domain": "startup.co.zw",
    "period_years": 1,
    "nameservers": ["ns1.runtime.co.zw", "ns2.runtime.co.zw"],
    "registrant": {
      "full_name": "Farai Moyo",
      "org_name": "ZimTech Ventures Pvt Ltd",
      "physical_address": "45 Samora Machel Ave, Harare",
      "phone": "+263771234567",
      "email": "farai@zimtech.co.zw",
      "org_description": "Cloud SaaS",
      "proposed_usage": "Corporate portal"
    }
  }'`;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 text-xs font-bold text-[#FF2D20] bg-[#FF2D20]/10 px-3 py-1 rounded-full border border-[#FF2D20]/20 mb-3">
          <BookOpen className="h-3.5 w-3.5" />
          <span>DEVELOPER &amp; ARCHITECTURE SPECS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-950 tracking-tight">
          Runtime Platform Engine Specs
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl mt-2 leading-relaxed">
          Comprehensive reference for the ZISPA plain-text protocol, REST APIs, Laravel service architecture, and sovereign cloud infrastructure roadmap.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3 text-xs">
        <button
          onClick={() => setActiveTab('zispa_spec')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'zispa_spec'
              ? 'bg-[#FF2D20] text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>ZISPA Registry Specification</span>
        </button>

        <button
          onClick={() => setActiveTab('rest_api')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'rest_api'
              ? 'bg-[#FF2D20] text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>REST API Reference</span>
        </button>

        <button
          onClick={() => setActiveTab('laravel_arch')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'laravel_arch'
              ? 'bg-[#FF2D20] text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Laravel Service Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud_roadmap')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl font-bold transition ${
            activeTab === 'cloud_roadmap'
              ? 'bg-[#FF2D20] text-white shadow-sm'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
        >
          <Cpu className="h-4 w-4" />
          <span>Cloud &amp; Runtime Roadmap</span>
        </button>
      </div>

      {/* TAB 1: ZISPA SPEC */}
      {activeTab === 'zispa_spec' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-950">Zimbabwe Internet Service Providers Association (ZISPA) Engine</h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              ZISPA manages the <strong className="text-zinc-900">.co.zw</strong> country-code Top Level Domain via automated email processing. Runtime implements the official plain-text RFC format with strict adherence to 0a action codes and character validation rules.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="font-bold text-[#FF2D20] text-sm">Action N (New)</div>
                <div className="text-zinc-600 text-[11px] mt-1">Initial registration &amp; delegation of unallocated domain name.</div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="font-bold text-zinc-900 text-sm">Action M (Modify)</div>
                <div className="text-zinc-600 text-[11px] mt-1">Update nameservers, registrant address, or contact details.</div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="font-bold text-zinc-900 text-sm">Action T (Transfer)</div>
                <div className="text-zinc-600 text-[11px] mt-1">Migrate domain management to Ngaatec registrar.</div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="font-bold text-zinc-900 text-sm">Action D (Delete)</div>
                <div className="text-zinc-600 text-[11px] mt-1">Relinquish domain delegation with confirmation safeguard.</div>
              </div>
            </div>

            <div className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-600">Canonical ZISPA Plaintext Form Sample:</span>
                <button
                  onClick={() => copyToClipboard(zispaTemplateSample, 'zispa_sample')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#FF2D20] hover:text-[#E0241A]"
                >
                  {copiedCode === 'zispa_sample' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode === 'zispa_sample' ? 'Copied' : 'Copy Template'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-200 text-xs overflow-x-auto leading-relaxed font-mono">
                <code>{zispaTemplateSample}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REST API */}
      {activeTab === 'rest_api' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-950">Runtime v1 Public &amp; Partner APIs</h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              Programmatically query availability, submit .co.zw registrations, manage DNS delegations, and trigger container deployments.
            </p>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-600">cURL REST Examples:</span>
                <button
                  onClick={() => copyToClipboard(apiCurlSample, 'api_sample')}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-[#FF2D20] hover:text-[#E0241A]"
                >
                  {copiedCode === 'api_sample' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedCode === 'api_sample' ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-zinc-950 text-zinc-200 text-xs overflow-x-auto leading-relaxed font-mono">
                <code>{apiCurlSample}</code>
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LARAVEL ARCHITECTURE */}
      {activeTab === 'laravel_arch' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 space-y-4 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-950">Laravel Service Blueprint</h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              The platform strictly enforces the <strong>Service Layer Pattern</strong> in Laravel. Controllers and Livewire components remain lightweight, delegating all domain logic to dedicated Service classes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                <div className="font-bold text-[#FF2D20] font-mono">App\Services\DomainAvailabilityService</div>
                <p className="text-zinc-600 text-[11px]">Validates .co.zw name rules, checks WHOIS &amp; local database allocations, returns $2.00 pricing.</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                <div className="font-bold text-[#FF2D20] font-mono">App\Services\ZispaTemplateService</div>
                <p className="text-zinc-600 text-[11px]">Generates canonical plain-text RFC templates for Action N, M, D, and T with character escapement.</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                <div className="font-bold text-[#FF2D20] font-mono">App\Services\RegistryService</div>
                <p className="text-zinc-600 text-[11px]">Dispatches outbound email with .txt attachment to ZISPA inbox and handles confirmation state machines.</p>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 space-y-1">
                <div className="font-bold text-[#FF2D20] font-mono">App\Services\RuntimePricingService</div>
                <p className="text-zinc-600 text-[11px]">Enforces $2.00/yr fixed pricing rule and proxies upstream pricing from Ngaatec.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLOUD ROADMAP */}
      {activeTab === 'cloud_roadmap' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-zinc-950">Full-Stack Cloud Platform Roadmap</h2>
              <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed">
                Runtime is designed to evolve from Zimbabwean ccTLD registration into a comprehensive developer cloud ecosystem.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-4 p-4 rounded-xl border border-red-200 bg-red-50/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF2D20] text-white font-bold text-sm shrink-0">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Domains (Live Production Phase)</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Automated .co.zw registration at fixed $2.00 USD/year, authoritative nameserver delegation, ZISPA Action N/M/D/T lifecycle.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 font-bold text-sm shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Application Deployment Engine (Phase 2)</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Zero-config containerized hosting for Laravel, Node.js, Python, and Go with automated SSL wildcard certificates and branch previews.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 font-bold text-sm shrink-0">
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Managed Cloud Databases &amp; Storage (Phase 3)</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Automated PostgreSQL, MySQL, and Redis clusters with point-in-time recovery and sub-millisecond query caching.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200 text-zinc-700 font-bold text-sm shrink-0">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Developer Platform &amp; Automation (Phase 4)</h3>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Programmatic API keys, webhook event streaming, telemetry logs, and CLI tooling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

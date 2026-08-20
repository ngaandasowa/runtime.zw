import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  Server, 
  CreditCard, 
  AlertCircle,
  HelpCircle,
  Building2,
  User,
  Globe2,
  Lock
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { domainAvailabilityService, DomainAvailabilityResult } from '../../services/DomainAvailabilityService';
import { nameserverService } from '../../services/NameserverService';
import { RegistrantDetails, RegistrantType } from '../../types';

export const DomainRegistrationModal: React.FC = () => {
  const { 
    registrationModalOpen, 
    setRegistrationModalOpen, 
    pendingRegisterDomain, 
    setPendingRegisterDomain,
    currentUser,
    settings,
    registerNewDomain,
    setActiveView,
    setDashboardSubView,
    setAuthModalOpen
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Search, 2: Registrant Info, 3: Nameservers, 4: Checkout
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTld, setSelectedTld] = useState('.co.zw');
  const [isChecking, setIsChecking] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<DomainAvailabilityResult | null>(null);

  // Registrant Type
  const [registrantType, setRegistrantType] = useState<RegistrantType>('myself');

  // Form Details
  const [fullName, setFullName] = useState(currentUser?.name || '');
  const [orgName, setOrgName] = useState(currentUser?.organisation || '');
  const [physicalAddress, setPhysicalAddress] = useState('147 Samora Machel Avenue');
  const [postalAddress, setPostalAddress] = useState('P.O. Box 1024, Harare');
  const [city, setCity] = useState('Harare');
  const [country, setCountry] = useState('Zimbabwe');
  const [phone, setPhone] = useState(currentUser?.phone || '+263 77 123 4567');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [orgDescription, setOrgDescription] = useState('Commercial technology provider and digital enterprise');
  const [proposedUsage, setProposedUsage] = useState('Official enterprise website, web applications, and corporate email routing.');

  // Nameservers
  const [nsMode, setNsMode] = useState<'default' | 'custom'>('default');
  const [customNs, setCustomNs] = useState<string[]>([
    'ns1.ngaatec.com',
    'ns2.ngaatec.com',
    '',
    ''
  ]);
  const [nsError, setNsError] = useState<string | null>(null);

  // Payment method
  const [gateway, setGateway] = useState<'paynow' | 'ecocash' | 'innbucks' | 'stripe_card'>('paynow');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (pendingRegisterDomain) {
      setSearchTerm(pendingRegisterDomain.replace('.co.zw', ''));
      handleCheck(pendingRegisterDomain);
    }
  }, [pendingRegisterDomain]);

  useEffect(() => {
    if (currentUser && registrantType === 'myself') {
      setFullName(currentUser.name);
      setEmail(currentUser.email);
      if (currentUser.organisation) setOrgName(currentUser.organisation);
      if (currentUser.phone) setPhone(currentUser.phone);
    }
  }, [currentUser, registrantType]);

  if (!registrationModalOpen) return null;

  const handleCheck = async (domainName: string) => {
    setIsChecking(true);
    const res = await domainAvailabilityService.checkAvailability(domainName);
    setAvailabilityResult(res);
    setIsChecking(false);
    if (res.isAvailable) {
      // Advance to step 2
      setStep(2);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    const target = searchTerm.includes('.') ? searchTerm : `${searchTerm}${selectedTld}`;
    handleCheck(target);
  };

  const validateStep2 = () => {
    if (!fullName.trim()) return 'Full Name is required';
    if (!email.trim() || !email.includes('@')) return 'A valid email address is required';
    if (!physicalAddress.trim()) return 'Physical address is required by ZISPA registry';
    if (!city.trim()) return 'Town / City is required';
    if (!phone.trim()) return 'Phone number is required';
    if (!orgDescription.trim()) return 'Organisation description is required';
    if (!proposedUsage.trim()) return 'Proposed domain usage is required';
    return null;
  };

  const handleStep2Next = () => {
    const err = validateStep2();
    if (err) {
      alert(err);
      return;
    }
    setStep(3);
  };

  const handleStep3Next = () => {
    if (nsMode === 'custom') {
      const activeNs = customNs.filter(n => n.trim().length > 0);
      const validation = nameserverService.validateNameservers(activeNs);
      if (!validation.valid) {
        setNsError(validation.error || 'Invalid nameservers');
        return;
      }
    }
    setNsError(null);
    setStep(4);
  };

  const handleCompleteOrder = async () => {
    if (!availabilityResult) return;
    setIsProcessing(true);

    const owner: RegistrantDetails = {
      full_name: fullName,
      org_name: orgName || (registrantType === 'myself' ? 'Personal Account' : 'Client Organisation'),
      physical_address: physicalAddress,
      postal_address: postalAddress,
      city,
      country,
      phone,
      email,
      org_description: orgDescription,
      proposed_usage: proposedUsage,
    };

    const finalNs = nsMode === 'default' 
      ? settings.default_nameservers 
      : customNs.filter(n => n.trim().length > 0);

    await registerNewDomain(
      availabilityResult.domain,
      registrantType,
      owner,
      finalNs,
      gateway
    );

    setIsProcessing(false);
    setRegistrationModalOpen(false);
    setActiveView('dashboard');
    setDashboardSubView('domains');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0A0D15] shadow-2xl p-6 sm:p-8 my-8 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {step === 1 && 'Search & Register Domain'}
                {step === 2 && 'Step 2: Registrant Ownership Details'}
                {step === 3 && 'Step 3: Nameserver Delegation'}
                {step === 4 && 'Step 4: Review & Confirmed Payment'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Official ZISPA .co.zw Registration ($2.00/yr)
              </p>
            </div>
          </div>

          <button
            onClick={() => setRegistrationModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mb-6 text-[11px] font-mono text-center">
          <div className={`py-1.5 rounded border ${step >= 1 ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-600'}`}>
            1. Domain
          </div>
          <div className={`py-1.5 rounded border ${step >= 2 ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-600'}`}>
            2. Owner Info
          </div>
          <div className={`py-1.5 rounded border ${step >= 3 ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-600'}`}>
            3. Nameservers
          </div>
          <div className={`py-1.5 rounded border ${step >= 4 ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 text-slate-600'}`}>
            4. Payment
          </div>
        </div>

        {/* STEP 1: Search Domain */}
        {step === 1 && (
          <div className="space-y-6">
            <form onSubmit={handleManualSearch} className="space-y-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Enter your desired domain name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. acmebrand"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
                <select
                  value={selectedTld}
                  onChange={(e) => setSelectedTld(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-sm text-cyan-300 focus:border-cyan-500 focus:outline-none"
                >
                  <option value=".co.zw">.co.zw ($2/yr)</option>
                  <option value=".org.zw">.org.zw ($2/yr)</option>
                  <option value=".ac.zw">.ac.zw ($2/yr)</option>
                </select>
                <button
                  type="submit"
                  disabled={isChecking || !searchTerm.trim()}
                  className="rounded-xl bg-cyan-500 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-400 transition disabled:opacity-50"
                >
                  {isChecking ? 'Checking...' : 'Check'}
                </button>
              </div>
            </form>

            {availabilityResult && (
              <div className={`p-4 rounded-xl border ${availabilityResult.isAvailable ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-rose-500/30 bg-rose-950/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {availabilityResult.isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-400" />
                    )}
                    <div>
                      <span className="font-mono font-bold text-white text-base">
                        {availabilityResult.domain}
                      </span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded ${availabilityResult.isAvailable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {availabilityResult.isAvailable ? 'Available for $2.00/yr' : 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  {availabilityResult.isAvailable && (
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center space-x-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-300"
                    >
                      <span>Continue</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Registrant Details */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 text-xs text-cyan-200 font-mono">
              Registering: <strong className="text-white text-sm">{availabilityResult?.domain || searchTerm}</strong> at $2.00 USD/year
            </div>

            {/* Registrant Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Who are you registering this domain for?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRegistrantType('myself')}
                  className={`flex items-center space-x-3 p-3.5 rounded-xl border text-left transition ${
                    registrantType === 'myself'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <User className="h-5 w-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">Myself / My Organisation</div>
                    <div className="text-[11px] text-slate-400">Use my account owner details</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegistrantType('client')}
                  className={`flex items-center space-x-3 p-3.5 rounded-xl border text-left transition ${
                    registrantType === 'client'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building2 className="h-5 w-5 text-cyan-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">My Client</div>
                    <div className="text-[11px] text-slate-400">Enter custom third-party owner details</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Registrant Form */}
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Owner Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tendai Chikwanha"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Organisation Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Chikwanha Holdings (Pvt) Ltd"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Owner Physical Address *</label>
                  <input
                    type="text"
                    value={physicalAddress}
                    onChange={(e) => setPhysicalAddress(e.target.value)}
                    placeholder="e.g. 100 Samora Machel Avenue"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Postal Address</label>
                  <input
                    type="text"
                    value={postalAddress}
                    onChange={(e) => setPostalAddress(e.target.value)}
                    placeholder="e.g. P.O. Box 2441"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Town / City *</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Country *</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Owner Phone *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+263 77 123 4567"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Owner Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.co.zw"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Organisation Description *</label>
                <input
                  type="text"
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  placeholder="e.g. Retail e-commerce and financial tech solutions"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Proposed Domain Usage *</label>
                <input
                  type="text"
                  value={proposedUsage}
                  onChange={(e) => setProposedUsage(e.target.value)}
                  placeholder="e.g. Corporate portal, API endpoints, and transactional emails."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Search</span>
              </button>

              <button
                type="button"
                onClick={handleStep2Next}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-cyan-400 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-300"
              >
                <span>Continue to Nameservers</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Nameservers */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 font-mono">
                Nameserver Configuration
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setNsMode('default')}
                  className={`p-4 rounded-xl border text-left transition ${
                    nsMode === 'default'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1 text-cyan-300">Use Runtime Default Nameservers</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Recommended. Automatically binds to Ngaatec high-availability DNS cluster with instant delegation.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNsMode('custom')}
                  className={`p-4 rounded-xl border text-left transition ${
                    nsMode === 'custom'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">Use Custom Nameservers</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">
                    Specify your own external DNS providers (e.g. Cloudflare, AWS Route 53, or private DNS).
                  </div>
                </button>
              </div>

              {nsMode === 'default' ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs text-slate-300 space-y-2">
                  <div className="text-slate-400 font-semibold mb-2">Default Delegation:</div>
                  {settings.default_nameservers.map((ns, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-cyan-400">ns{idx + 1}:</span>
                      <span className="text-white">{ns}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">
                    Enter between 2 and 4 authoritative nameservers for your domain:
                  </div>

                  {customNs.map((ns, index) => (
                    <div key={index}>
                      <label className="block text-[11px] font-mono text-slate-400 mb-1">
                        Nameserver {index + 1} {index < 2 ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="text"
                        placeholder={`ns${index + 1}.example.com`}
                        value={ns}
                        onChange={(e) => {
                          const copy = [...customNs];
                          copy[index] = e.target.value;
                          setCustomNs(copy);
                        }}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  ))}

                  {nsError && (
                    <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs">
                      {nsError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Owner Info</span>
              </button>

              <button
                type="button"
                onClick={handleStep3Next}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-cyan-400 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-300"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Payment */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Target Domain:</span>
                <span className="text-white font-bold">{availabilityResult?.domain}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Registration Period:</span>
                <span className="text-white">1 Year (ZISPA ccTLD)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Registrant Owner:</span>
                <span className="text-white">{fullName} ({orgName || 'Personal'})</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Assigned Nameservers:</span>
                <span className="text-cyan-300">{nsMode === 'default' ? 'Runtime Default Cluster (4 nodes)' : 'Custom (RFC Validated)'}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span className="text-slate-200">Total Due Today:</span>
                <span className="text-cyan-400">$2.00 USD</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 font-mono">
                Select Zimbabwean or International Gateway
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setGateway('paynow')}
                  className={`p-3 rounded-lg border text-left transition ${
                    gateway === 'paynow'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  Paynow Zimbabwe (EcoCash, OneMoney, Visa/Mastercard)
                </button>

                <button
                  type="button"
                  onClick={() => setGateway('ecocash')}
                  className={`p-3 rounded-lg border text-left transition ${
                    gateway === 'ecocash'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  EcoCash Direct Mobile PIN Prompt
                </button>

                <button
                  type="button"
                  onClick={() => setGateway('innbucks')}
                  className={`p-3 rounded-lg border text-left transition ${
                    gateway === 'innbucks'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  InnBucks USD QR Payment
                </button>

                <button
                  type="button"
                  onClick={() => setGateway('stripe_card')}
                  className={`p-3 rounded-lg border text-left transition ${
                    gateway === 'stripe_card'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  International Card / Stripe
                </button>
              </div>
            </div>

            {/* Registry Submission Rule Notice */}
            <div className="flex items-start space-x-2.5 rounded-lg bg-cyan-950/30 p-3 border border-cyan-500/20 text-xs text-cyan-200">
              <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>ZISPA Registry Guarantee:</strong> Once payment is confirmed by server-side verification, the official plain-text application is queued for direct registrar dispatch to <code className="text-white">admin@zispa.org.zw</code>.
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleCompleteOrder}
                disabled={isProcessing}
                className="inline-flex items-center space-x-2 rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-black hover:bg-cyan-300 transition active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
                    <span>Processing Payment &amp; ZISPA Queue...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Pay $2.00 &amp; Submit Registration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Globe, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  Check
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { RegistrantDetails } from '../types';
import { nameserverService } from '../services/NameserverService';

export const DomainRegistrationModal: React.FC = () => {
  const { 
    currentUser, 
    settings, 
    pendingRegisterDomain, 
    setRegistrationModalOpen, 
    registerNewDomain,
    setActiveView,
    setDashboardSubView,
    showNotification
  } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [domainName, setDomainName] = useState<string>(pendingRegisterDomain || 'mybusiness.co.zw');
  const [registrantType, setRegistrantType] = useState<'myself' | 'client'>('myself');
  
  // Registrant Details
  const [registrantDetails, setRegistrantDetails] = useState<RegistrantDetails>({
    full_name: currentUser?.name || '',
    org_name: currentUser?.organisation || '',
    physical_address: '45 Samora Machel Avenue, Harare',
    postal_address: 'P.O. Box 1024, Harare',
    city: 'Harare',
    country: 'Zimbabwe',
    phone: currentUser?.phone || '+263 77 123 4567',
    email: currentUser?.email || 'customer@runtime.co.zw',
    org_description: 'Software development, cloud systems, and internet services',
    proposed_usage: 'Corporate website, developer platform endpoints, and business email',
  });

  // Nameservers
  const [useDefaultNs, setUseDefaultNs] = useState<boolean>(true);
  const [customNs, setCustomNs] = useState<string[]>([
    settings.default_nameservers[0] || 'ns1.runtime.co.zw',
    settings.default_nameservers[1] || 'ns2.runtime.co.zw',
    settings.default_nameservers[2] || 'ns3.runtime.co.zw',
    settings.default_nameservers[3] || 'ns4.runtime.co.zw',
  ]);
  const [nsError, setNsError] = useState<string | null>(null);

  // Payment
  const [selectedGateway, setSelectedGateway] = useState<'paynow' | 'ecocash' | 'innbucks' | 'stripe_card'>('paynow');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [completedOrderRef, setCompletedOrderRef] = useState<string>('');

  const selectedTld = ['.co.zw', '.org.zw', '.ac.zw'].find(tld => domainName.toLowerCase().endsWith(tld)) || '.co.zw';
  const selectedPrice = selectedTld === '.ac.zw' ? 3 : 2;

  useEffect(() => {
    if (pendingRegisterDomain) {
      setDomainName(pendingRegisterDomain);
    }
  }, [pendingRegisterDomain]);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim() || !domainName.includes('.')) {
      showNotification('Please enter a valid domain name (e.g. startup.co.zw)', 'error');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrantDetails.full_name || !registrantDetails.email || !registrantDetails.phone) {
      showNotification('Please fill in all required details', 'error');
      return;
    }
    setStep(3);
  };

  const handleStep3Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!useDefaultNs) {
      const active = customNs.filter(n => n.trim().length > 0);
      const validation = nameserverService.validateNameservers(active);
      if (!validation.valid) {
        setNsError(validation.error || 'Invalid nameservers');
        return;
      }
    }
    setNsError(null);
    setStep(4);
  };

  const handleCompleteRegistration = async () => {
    setIsProcessing(true);
    try {
      const nsToUse = useDefaultNs ? settings.default_nameservers : customNs.filter(n => n.trim().length > 0);
      const res = await registerNewDomain(
        domainName,
        registrantType,
        registrantDetails,
        nsToUse,
        selectedGateway
      );

      setCompletedOrderRef(res.order.reference);
      setRegistrationSuccess(true);
      setIsProcessing(false);
    } catch (err) {
      setIsProcessing(false);
      showNotification('Payment failed or registry preparation error', 'error');
    }
  };

  const closeModal = () => {
    setRegistrationModalOpen(false);
  };

  const goToDashboard = () => {
    setRegistrationModalOpen(false);
    setActiveView('dashboard');
    setDashboardSubView('domains');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 text-zinc-900 shadow-2xl ring-1 ring-black/5 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#3120ff] border border-red-200">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 tracking-tight">
                {registrationSuccess ? 'Registration Confirmed' : 'Register .co.zw Domain'}
              </h2>
              <div className="text-xs text-zinc-500">
                {registrationSuccess ? 'Registration submitted' : `$${selectedPrice.toFixed(2)} USD/year`}
              </div>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator (If not completed) */}
        {!registrationSuccess && (
          <div className="mb-6">
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
              <div className={`p-2 rounded-xl border ${step >= 1 ? 'border-[#3120ff] bg-[#3120ff]/10 text-[#3120ff]' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
                1. Domain
              </div>
              <div className={`p-2 rounded-xl border ${step >= 2 ? 'border-[#3120ff] bg-[#3120ff]/10 text-[#3120ff]' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
                2. Registrant
              </div>
              <div className={`p-2 rounded-xl border ${step >= 3 ? 'border-[#3120ff] bg-[#3120ff]/10 text-[#3120ff]' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
                3. Nameservers
              </div>
              <div className={`p-2 rounded-xl border ${step >= 4 ? 'border-[#3120ff] bg-[#3120ff]/10 text-[#3120ff]' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
                4. Payment
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Domain & Term */}
        {!registrationSuccess && step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Domain Name to Register *
              </label>
              <input
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-.]/g, ''))}
                placeholder="mybusiness.co.zw"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs sm:text-sm text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Standard Zimbabwean Top-Level Domains (.co.zw, .org.zw, .ac.zw)
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-zinc-900">Registration Guarantee</div>
                <div className="text-[11px] text-zinc-500">Registration and renewal are charged at the same annual rate.</div>
              </div>
              <div className="text-lg font-extrabold text-[#3120ff]">
                ${selectedPrice.toFixed(2)} USD / year
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-200">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm"
              >
                <span>Continue to Registrant</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Registrant Details */}
        {!registrationSuccess && step === 2 && (
          <form onSubmit={handleStep2Next} className="space-y-4">
            
            <div className="flex items-center space-x-4 mb-2">
              <span className="text-xs font-semibold text-zinc-500">Registering for:</span>
              <label className="inline-flex items-center space-x-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="regType"
                  checked={registrantType === 'myself'}
                  onChange={() => setRegistrantType('myself')}
                  className="text-[#3120ff] focus:ring-[#3120ff]"
                />
                <span className="text-zinc-800 font-medium">Myself / My Business</span>
              </label>
              <label className="inline-flex items-center space-x-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="regType"
                  checked={registrantType === 'client'}
                  onChange={() => setRegistrantType('client')}
                  className="text-[#3120ff] focus:ring-[#3120ff]"
                />
                <span className="text-zinc-800 font-medium">A Client</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Full Applicant Name *</label>
                <input
                  type="text"
                  required
                  value={registrantDetails.full_name}
                  onChange={(e) => setRegistrantDetails({ ...registrantDetails, full_name: e.target.value })}
                  placeholder="e.g. Farai Moyo"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Organisation Name (Optional)</label>
                <input
                  type="text"
                  value={registrantDetails.org_name}
                  onChange={(e) => setRegistrantDetails({ ...registrantDetails, org_name: e.target.value })}
                  placeholder="e.g. ZimTech Ltd"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-zinc-700 font-semibold mb-1">Physical Address in Zimbabwe *</label>
              <input
                type="text"
                required
                value={registrantDetails.physical_address}
                onChange={(e) => setRegistrantDetails({ ...registrantDetails, physical_address: e.target.value })}
                placeholder="45 Samora Machel Avenue, Harare"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={registrantDetails.phone}
                  onChange={(e) => setRegistrantDetails({ ...registrantDetails, phone: e.target.value })}
                  placeholder="+263 77 123 4567"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={registrantDetails.email}
                  onChange={(e) => setRegistrantDetails({ ...registrantDetails, email: e.target.value })}
                  placeholder="farai@zimtech.co.zw"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-zinc-700 font-semibold mb-1">Organisation Description *</label>
              <input
                type="text"
                required
                value={registrantDetails.org_description}
                onChange={(e) => setRegistrantDetails({ ...registrantDetails, org_description: e.target.value })}
                placeholder="e.g. Software engineering, cloud hosting, and mobile apps"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="text-xs">
              <label className="block text-zinc-700 font-semibold mb-1">Proposed Domain Use *</label>
              <input
                type="text"
                required
                value={registrantDetails.proposed_usage}
                onChange={(e) => setRegistrantDetails({ ...registrantDetails, proposed_usage: e.target.value })}
                placeholder="e.g. Corporate website, developer APIs, and business email"
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 text-zinc-900 focus:border-[#3120ff] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm"
              >
                <span>Continue to Nameservers</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Nameservers */}
        {!registrationSuccess && step === 3 && (
          <form onSubmit={handleStep3Next} className="space-y-5">
            
            <div className="space-y-3">
              <div 
                onClick={() => setUseDefaultNs(true)}
                className={`p-4 rounded-xl border cursor-pointer transition ${useDefaultNs ? 'border-[#3120ff] bg-red-50/40' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={useDefaultNs}
                      onChange={() => setUseDefaultNs(true)}
                      className="text-[#3120ff]"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-950">Use Runtime Authoritative Nameservers (Recommended)</div>
                      <div className="text-[11px] text-zinc-500">Zero-config DNS routing, ready for instant cloud deployment.</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#3120ff]/10 text-[#3120ff] px-2 py-0.5 rounded-full font-bold">
                    Fastest
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono pl-6">
                  {settings.default_nameservers.slice(0, 4).map((ns, idx) => (
                    <div key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-zinc-200 text-zinc-700">
                      {idx + 1}. {ns}
                    </div>
                  ))}
                </div>
              </div>

              <div 
                onClick={() => setUseDefaultNs(false)}
                className={`p-4 rounded-xl border cursor-pointer transition ${!useDefaultNs ? 'border-[#3120ff] bg-red-50/40' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    checked={!useDefaultNs}
                    onChange={() => setUseDefaultNs(false)}
                    className="text-[#3120ff]"
                  />
                  <div>
                    <div className="text-xs font-bold text-zinc-950">Use Custom Nameservers</div>
                    <div className="text-[11px] text-zinc-500">Specify external DNS providers (Cloudflare, AWS Route 53, etc.)</div>
                  </div>
                </div>

                {!useDefaultNs && (
                  <div className="mt-4 space-y-2 pl-6">
                    {customNs.map((ns, idx) => (
                      <div key={idx}>
                        <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                          Nameserver {idx + 1} {idx < 2 ? '*' : '(Optional)'}
                        </label>
                        <input
                          type="text"
                          value={ns}
                          onChange={(e) => {
                            const copy = [...customNs];
                            copy[idx] = e.target.value;
                            setCustomNs(copy);
                          }}
                          placeholder={`ns${idx + 1}.example.com`}
                          className="w-full rounded-xl bg-white border border-zinc-200 p-2 text-xs text-zinc-900 focus:border-[#3120ff] focus:outline-none font-mono"
                        />
                      </div>
                    ))}

                    {nsError && (
                      <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                        {nsError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm"
              >
                <span>Continue to Checkout</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: Review & Payment */}
        {!registrationSuccess && step === 4 && (
          <div className="space-y-5">
            
            {/* Order Review Box */}
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Domain Item:</span>
                <span className="text-zinc-900 font-bold font-mono">{domainName} (1 Year)</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Registrant:</span>
                <span className="text-zinc-800 font-medium">{registrantDetails.full_name}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Registration:</span>
                <span className="text-[#3120ff] font-bold">New domain</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 text-sm font-bold text-zinc-950">
                <span>Total Amount:</span>
                <span className="text-[#3120ff] font-extrabold">${selectedPrice.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Payment Gateway Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-2">
                Select Verified Payment Gateway
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGateway('paynow')}
                  className={`p-3 rounded-xl border text-left transition ${selectedGateway === 'paynow' ? 'border-[#3120ff] bg-red-50/40 text-zinc-900' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
                >
                  <div className="text-xs font-bold text-zinc-950">Paynow Zimbabwe</div>
                  <div className="text-[10px] text-zinc-500">EcoCash, OneMoney, ZimSwitch</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGateway('ecocash')}
                  className={`p-3 rounded-xl border text-left transition ${selectedGateway === 'ecocash' ? 'border-[#3120ff] bg-red-50/40 text-zinc-900' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
                >
                  <div className="text-xs font-bold text-zinc-950">EcoCash Direct USD</div>
                  <div className="text-[10px] text-zinc-500">Mobile Wallet Instant Push</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGateway('innbucks')}
                  className={`p-3 rounded-xl border text-left transition ${selectedGateway === 'innbucks' ? 'border-[#3120ff] bg-red-50/40 text-zinc-900' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
                >
                  <div className="text-xs font-bold text-zinc-950">InnBucks</div>
                  <div className="text-[10px] text-zinc-500">Retail QR &amp; Express Code</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedGateway('stripe_card')}
                  className={`p-3 rounded-xl border text-left transition ${selectedGateway === 'stripe_card' ? 'border-[#3120ff] bg-red-50/40 text-zinc-900' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
                >
                  <div className="text-xs font-bold text-zinc-950">International Card</div>
                  <div className="text-[10px] text-zinc-500">Visa / Mastercard / Amex</div>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#3120ff]" />
              <span>Payment is processed securely and your receipt is issued immediately.</span>
            </div>

            <div className="flex justify-between pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompleteRegistration}
                className="inline-flex items-center space-x-2 rounded-xl bg-[#3120ff] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Processing Payment &amp; Staging...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>Pay ${selectedPrice.toFixed(2)} USD &amp; Register</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success Confirmation Screen */}
        {registrationSuccess && (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-950">
                Domain Successfully Registered!
              </h3>
              <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
                Order <span className="text-[#3120ff] font-bold font-mono">{completedOrderRef}</span> has been confirmed.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left text-xs space-y-1.5 max-w-lg mx-auto">
              <div className="text-zinc-500">Target: <span className="text-zinc-900 font-bold font-mono">{domainName}</span></div>
              <div className="text-zinc-500">Status: <span className="text-emerald-700 font-bold">Registration received</span></div>
              <div className="text-zinc-500">Authoritative Nameservers: <span className="text-zinc-800 font-mono">{settings.default_nameservers.slice(0, 2).join(', ')}</span></div>
              <div className="text-zinc-500">Need help? <a href="https://wa.me/263788350229" target="_blank" rel="noreferrer" className="text-zinc-800 font-semibold hover:text-[#3120ff]">Message us on WhatsApp</a></div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <button
                onClick={goToDashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded-xl bg-[#3120ff] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#2819d9] transition shadow-sm"
              >
                <span>View in Customer Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                onClick={closeModal}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

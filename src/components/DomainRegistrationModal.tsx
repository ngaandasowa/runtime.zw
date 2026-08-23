import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe2,
  Lock,
  Search,
  Server,
  User,
  X,
} from 'lucide-react';

import { useStore } from '../context/StoreContext';
import {
  domainService,
  DomainAvailabilityResult,
} from '../services/DomainService';
import { nameserverService } from '../services/NameserverService';
import { RegistrantDetails, RegistrantType } from '../types';

type Step = 'search' | 'owner' | 'nameservers' | 'payment';

type Gateway =
  | 'paynow'
  | 'ecocash'
  | 'innbucks'
  | 'stripe_card';

const ZISPA_PRICES: Record<string, number> = {
  '.co.zw': 2,
  '.org.zw': 3,
  '.ac.zw': 3,
};

const ZISPA_TLDS = Object.keys(ZISPA_PRICES);

const normalizeDomain = (value: string) =>
  value.trim().toLowerCase();

const getZispaTld = (domain: string) => {
  const normalized = normalizeDomain(domain);

  return ZISPA_TLDS.find((tld) =>
    normalized.endsWith(tld)
  );
};

const requiresZispaDetails = (domain: string) =>
  Boolean(getZispaTld(domain));

const getRegistrationPrice = (
  result: DomainAvailabilityResult | null
): number | undefined => {
  if (!result) return undefined;

  const zispaTld = getZispaTld(result.domain);

  if (zispaTld) {
    return ZISPA_PRICES[zispaTld];
  }

  return result.price;
};

const emptyRegistrant = (): RegistrantDetails => ({
  full_name: '',
  org_name: '',
  physical_address: '',
  postal_address: '',
  city: '',
  country: 'Zimbabwe',
  phone: '',
  email: '',
  org_description: '',
  proposed_usage: '',
});

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
    showNotification,
  } = useStore();

  const [step, setStep] = useState<Step>('search');
  const [startedWithSelectedDomain, setStartedWithSelectedDomain] =
    useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<
    DomainAvailabilityResult[]
  >([]);
  const [availabilityResult, setAvailabilityResult] =
    useState<DomainAvailabilityResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(
    null
  );

  const [registrantType, setRegistrantType] =
    useState<RegistrantType>('myself');
  const [registrantDetails, setRegistrantDetails] =
    useState<RegistrantDetails>(emptyRegistrant());

  const [useDefaultNameservers, setUseDefaultNameservers] =
    useState(true);
  const [customNameservers, setCustomNameservers] = useState<
    string[]
  >(['', '', '', '']);
  const [nameserverError, setNameserverError] = useState<
    string | null
  >(null);

const [gateway, setGateway] =
  useState<Gateway>('paynow');

const [renewPrice, setRenewPrice] =
  useState<number | undefined>(
    undefined
  );

const [isProcessing, setIsProcessing] =
  useState(false);

  const selectedDomain = availabilityResult?.domain || '';
  const zispaRequired = selectedDomain
    ? requiresZispaDetails(selectedDomain)
    : false;

  const price = useMemo(
    () => getRegistrationPrice(availabilityResult),
    [availabilityResult]
  );

  const priceLabel =
    price !== undefined
      ? `$${price.toFixed(2)}`
      : 'Price unavailable';
  const loadRenewPrice = async (
  domain: string
) => {
  const zispaTld =
    getZispaTld(domain);

  /*
   * Runtime fixed Zimbabwe pricing
   */
  if (zispaTld) {
    setRenewPrice(
      ZISPA_PRICES[zispaTld]
    );

    return;
  }

  /*
   * All other extensions use
   * the renewal price returned
   * by the Ngaatec pricing API.
   */
  try {
    const pricing =
      await domainService.getPricing();

    const normalizedDomain =
      domain
        .trim()
        .toLowerCase();

    const match =
      [...pricing]
        .sort(
          (a, b) =>
            b.tld.length -
            a.tld.length
        )
        .find((item) =>
          normalizedDomain.endsWith(
            item.tld.toLowerCase()
          )
        );

    setRenewPrice(
      match?.renew
    );
  } catch (error) {
    console.error(
      'Unable to load renewal price:',
      error
    );

    setRenewPrice(
      undefined
    );
  }
};

  const resetState = () => {
    setStep('search');
    setStartedWithSelectedDomain(false);
    setSearchTerm('');
    setSearchResults([]);
    setAvailabilityResult(null);
    setIsChecking(false);
    setSearchError(null);
    setRegistrantType('myself');
    setRegistrantDetails(emptyRegistrant());
    setUseDefaultNameservers(true);
    setCustomNameservers(['', '', '', '']);
    setNameserverError(null);
    setGateway('paynow');
    setRenewPrice(undefined);
    setIsProcessing(false);
  };

  const closeModal = () => {
    setRegistrationModalOpen(false);
    setPendingRegisterDomain(null);
    resetState();
  };

  const fillFromAccount = () => {
    if (!currentUser) return;

    setRegistrantDetails((current) => ({
      ...current,
      full_name: currentUser.name || '',
      org_name: currentUser.organisation || '',
      phone: currentUser.phone || '',
      email: currentUser.email || '',
    }));
  };

  const clearRegistrantIdentity = () => {
    setRegistrantDetails(emptyRegistrant());
  };

  /*
   * When the modal is opened, determine whether the user already
   * selected a domain on the public homepage.
   *
   * If they did, we silently re-check that exact domain. There is
   * no second visible search step.
   */
  useEffect(() => {
    if (!registrationModalOpen) return;

    const initialDomain = pendingRegisterDomain?.trim() || '';
    const hasSelectedDomain = Boolean(initialDomain);

    setStartedWithSelectedDomain(hasSelectedDomain);
    setSearchError(null);
    setSearchResults([]);
    setAvailabilityResult(null);
    setNameserverError(null);

    if (!hasSelectedDomain) {
      setStep('search');
      return;
    }

    let cancelled = false;

    const prepareSelectedDomain = async () => {
      setIsChecking(true);

      try {
        const result = await domainService.checkAvailability(
          initialDomain
        );

        if (cancelled) return;

        setAvailabilityResult(result);

        await loadRenewPrice(
          result.domain
        );

        if (result.checkingFailed) {
          setSearchError(
            result.reason ||
              'We could not confirm this domain right now.'
          );
          setStep('search');
          return;
        }

        if (!result.isAvailable) {
          setSearchError(
            `${result.domain} is no longer available for registration.`
          );
          setStep('search');
          return;
        }

        const resolvedPrice = getRegistrationPrice(result);

        if (resolvedPrice === undefined) {
          setSearchError(
            `Pricing for ${result.domain} is currently unavailable.`
          );
          setStep('search');
          return;
        }

        if (requiresZispaDetails(result.domain)) {
          setStep('owner');
          fillFromAccount();
        } else {
          setStep('nameservers');
        }
      } catch (error) {
        console.error(
          'Failed to prepare selected domain:',
          error
        );

        if (!cancelled) {
          setSearchError(
            'We could not confirm this domain right now.'
          );
          setStep('search');
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    };

    void prepareSelectedDomain();

    return () => {
      cancelled = true;
    };
  }, [registrationModalOpen]);

  /*
   * If the user switches back to "myself", only genuine information
   * already stored on the account is filled. No address, city,
   * description or other information is invented.
   */
  useEffect(() => {
    if (
      !registrationModalOpen ||
      registrantType !== 'myself' ||
      !currentUser
    ) {
      return;
    }

    fillFromAccount();
  }, [registrantType, currentUser, registrationModalOpen]);

  const searchDomains = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!searchTerm.trim()) return;

    setIsChecking(true);
    setSearchError(null);
    setSearchResults([]);
    setAvailabilityResult(null);

    try {
      const results = await domainService.searchDomains(
        searchTerm
      );

      const sorted = [...results].sort((a, b) => {
        if (a.checkingFailed && !b.checkingFailed) return 1;
        if (!a.checkingFailed && b.checkingFailed) return -1;

        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1;
        }

        return 0;
      });

      setSearchResults(sorted);
    } catch (error) {
      console.error('Domain search failed:', error);
      setSearchError(
        'We could not complete the domain search. Please try again.'
      );
    } finally {
      setIsChecking(false);
    }
  };

  const chooseDomain = (
    result: DomainAvailabilityResult
  ) => {
    if (
      result.checkingFailed ||
      !result.isAvailable
    ) {
      return;
    }

    const resolvedPrice = getRegistrationPrice(result);

    if (resolvedPrice === undefined) {
      showNotification(
        `Pricing for ${result.domain} is currently unavailable.`,
        'error'
      );
      return;
    }

    setAvailabilityResult(result);
    setSearchError(null);

    void loadRenewPrice(
      result.domain
    );

    if (requiresZispaDetails(result.domain)) {
      fillFromAccount();
      setStep('owner');
    } else {
      setStep('nameservers');
    }
  };

  const updateRegistrant = (
    field: keyof RegistrantDetails,
    value: string
  ) => {
    setRegistrantDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateRegistrant = () => {
    const fields: Array<{
      value: string | undefined;
      message: string;
    }> = [
      {
        value: registrantDetails.full_name,
        message: 'Full applicant name is required.',
      },
      {
        value: registrantDetails.physical_address,
        message: 'Physical address is required.',
      },
      {
        value: registrantDetails.postal_address,
        message: 'Postal address is required.',
      },
      {
        value: registrantDetails.city,
        message: 'Town or city is required.',
      },
      {
        value: registrantDetails.country,
        message: 'Country is required.',
      },
      {
        value: registrantDetails.phone,
        message: 'Phone number is required.',
      },
      {
        value: registrantDetails.email,
        message: 'Email address is required.',
      },
      {
        value: registrantDetails.org_description,
        message:
          'Organisation or activity description is required.',
      },
      {
        value: registrantDetails.proposed_usage,
        message: 'Proposed domain use is required.',
      },
    ];

    for (const field of fields) {
      if (!field.value?.trim()) {
        return field.message;
      }
    }

    if (!registrantDetails.email.includes('@')) {
      return 'Please enter a valid email address.';
    }

    return null;
  };

  const continueFromOwner = () => {
    const error = validateRegistrant();

    if (error) {
      showNotification(error, 'error');
      return;
    }

    setStep('nameservers');
  };

  const continueFromNameservers = () => {
    if (!useDefaultNameservers) {
      const active = customNameservers
        .map((value) => value.trim())
        .filter(Boolean);

      const validation =
        nameserverService.validateNameservers(active);

      if (!validation.valid) {
        setNameserverError(
          validation.error ||
            'Please check the nameservers you entered.'
        );
        return;
      }
    }

    setNameserverError(null);
    setStep('payment');
  };

  const finalNameservers = () =>
    useDefaultNameservers
      ? [...settings.default_nameservers]
      : customNameservers
          .map((value) => value.trim())
          .filter(Boolean);

  const basicOwnerDetails = (): RegistrantDetails => ({
    full_name: currentUser?.name || '',
    org_name: currentUser?.organisation || '',
    physical_address: '',
    postal_address: '',
    city: '',
    country: '',
    phone: currentUser?.phone || '',
    email: currentUser?.email || '',
    org_description: '',
    proposed_usage: '',
  });

  const completeOrder = async () => {
    if (
      !availabilityResult ||
      !availabilityResult.isAvailable
    ) {
      showNotification(
        'Please select an available domain first.',
        'error'
      );
      return;
    }

    if (price === undefined) {
      showNotification(
        'Domain pricing is currently unavailable.',
        'error'
      );
      return;
    }

    if (zispaRequired) {
      const ownerError = validateRegistrant();

      if (ownerError) {
        showNotification(ownerError, 'error');
        setStep('owner');
        return;
      }
    }

    setIsProcessing(true);

    try {
      await registerNewDomain(
        availabilityResult.domain,
        zispaRequired ? registrantType : 'myself',
        zispaRequired
          ? registrantDetails
          : basicOwnerDetails(),
        finalNameservers(),
        gateway
      );

      setRegistrationModalOpen(false);
      setPendingRegisterDomain(null);
      setActiveView('dashboard');
      setDashboardSubView('domains');
      resetState();
    } catch (error) {
      console.error(
        'Domain registration order failed:',
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : 'Unable to submit the domain order.',
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const goBack = () => {
    if (step === 'owner') {
      if (startedWithSelectedDomain) {
        closeModal();
      } else {
        setAvailabilityResult(null);
        setStep('search');
      }
      return;
    }

    if (step === 'nameservers') {
      if (zispaRequired) {
        setStep('owner');
      } else if (startedWithSelectedDomain) {
        closeModal();
      } else {
        setAvailabilityResult(null);
        setStep('search');
      }
      return;
    }

    if (step === 'payment') {
      setStep('nameservers');
    }
  };

  const canGoBack = step !== 'search';

  const headerTitle =
    step === 'search'
      ? 'Register a domain'
      : step === 'owner'
        ? 'Registrant details'
        : step === 'nameservers'
          ? 'Nameservers'
          : 'Review and payment';

  if (!registrationModalOpen) {
    return null;
  }

  const preparingSelectedDomain =
    startedWithSelectedDomain &&
    isChecking &&
    !availabilityResult;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:p-4">
      <div className="flex h-full items-end justify-center sm:items-center">
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-2xl">
          {/* Fixed header */}
          <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                  <Globe2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-zinc-950 sm:text-lg">
                    {headerTitle}
                  </h2>

                  {selectedDomain ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="break-all font-mono font-semibold text-zinc-700">
                        {selectedDomain}
                      </span>

                      <span className="text-zinc-400">
                        •
                      </span>

                      <span className="font-semibold text-[#3120ff]">
                        {priceLabel}/year
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">
                      Find an available domain and continue.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close registration"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedDomain && !preparingSelectedDomain && (
              <div
                className={`mt-4 grid gap-1.5 text-center text-[10px] font-semibold sm:gap-2 sm:text-xs ${
                  zispaRequired
                    ? 'grid-cols-4'
                    : 'grid-cols-3'
                }`}
              >
                <div className="rounded-lg bg-[#3120ff]/10 px-1 py-2 text-[#3120ff]">
                  Domain
                </div>

                {zispaRequired && (
                  <div
                    className={`rounded-lg px-1 py-2 ${
                      step === 'owner' ||
                      step === 'nameservers' ||
                      step === 'payment'
                        ? 'bg-[#3120ff]/10 text-[#3120ff]'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    Owner
                  </div>
                )}

                <div
                  className={`rounded-lg px-1 py-2 ${
                    step === 'nameservers' ||
                    step === 'payment'
                      ? 'bg-[#3120ff]/10 text-[#3120ff]'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  DNS
                </div>

                <div
                  className={`rounded-lg px-1 py-2 ${
                    step === 'payment'
                      ? 'bg-[#3120ff]/10 text-[#3120ff]'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  Payment
                </div>
              </div>
            )}
          </div>

          {/* Only this section scrolls */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            {preparingSelectedDomain && (
              <div className="flex min-h-80 flex-col items-center justify-center text-center">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#3120ff]/25 border-t-[#3120ff]" />

                <p className="mt-4 text-sm font-semibold text-zinc-950">
                  Confirming your domain
                </p>

                <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                  {pendingRegisterDomain}
                </p>
              </div>
            )}

            {!preparingSelectedDomain &&
              step === 'search' && (
                <div className="space-y-5">
                  <form onSubmit={searchDomains}>
                    <label className="mb-2 block text-sm font-semibold text-zinc-950">
                      Domain name
                    </label>

                    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">
                      <Search className="ml-1 h-5 w-5 shrink-0 text-zinc-400" />

                      <input
                        value={searchTerm}
                        onChange={(event) => {
                          setSearchTerm(
                            event.target.value
                              .toLowerCase()
                              .replace(/\s/g, '')
                          );

                          if (searchError) {
                            setSearchError(null);
                          }
                        }}
                        placeholder="yourbrand or yourbrand.com"
                        autoComplete="off"
                        spellCheck={false}
                        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 sm:px-2"
                      />

                      <button
                        type="submit"
                        disabled={
                          isChecking ||
                          !searchTerm.trim()
                        }
                        className="flex h-11 shrink-0 items-center justify-center rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isChecking ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <>
                            <Search className="h-4 w-4 sm:hidden" />
                            <span className="hidden sm:inline">
                              Search
                            </span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Enter a full domain, or enter a name to check popular extensions.
                    </p>
                  </form>

                  {searchError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-zinc-200">
                      {searchResults.map(
                        (result, index) => {
                          const resultPrice =
                            getRegistrationPrice(
                              result
                            );

                          return (
                            <div
                              key={result.domain}
                              className={`flex items-center gap-3 p-4 ${
                                index !==
                                searchResults.length -
                                  1
                                  ? 'border-b border-zinc-200'
                                  : ''
                              }`}
                            >
                              {result.checkingFailed ? (
                                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                              ) : result.isAvailable ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 shrink-0 text-zinc-400" />
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="break-all font-mono text-sm font-semibold text-zinc-950">
                                  {result.domain}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {result.checkingFailed
                                    ? result.reason ||
                                      'Unable to check'
                                    : result.isAvailable
                                      ? resultPrice !==
                                        undefined
                                        ? `$${resultPrice.toFixed(
                                            2
                                          )}/year`
                                        : 'Pricing unavailable'
                                      : 'Already registered'}
                                </p>
                              </div>

                              {result.isAvailable &&
                                !result.checkingFailed && (
                                  <button
                                    type="button"
                                    disabled={
                                      resultPrice ===
                                      undefined
                                    }
                                    onClick={() =>
                                      chooseDomain(
                                        result
                                      )
                                    }
                                    className="shrink-0 rounded-lg bg-[#3120ff] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                                  >
                                    Register
                                  </button>
                                )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}

            {!preparingSelectedDomain &&
              step === 'owner' &&
              zispaRequired && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Domain owner
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      These details are required for .co.zw, .org.zw and .ac.zw registrations.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegistrantType(
                          'myself'
                        );
                        setRegistrantDetails(
                          emptyRegistrant()
                        );
                        setTimeout(
                          fillFromAccount,
                          0
                        );
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        registrantType ===
                        'myself'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <User className="h-4 w-4 text-[#3120ff]" />
                      <p className="mt-2 text-xs font-semibold text-zinc-950 sm:text-sm">
                        Myself
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRegistrantType(
                          'client'
                        );
                        clearRegistrantIdentity();
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        registrantType ===
                        'client'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-[#3120ff]" />
                      <p className="mt-2 text-xs font-semibold text-zinc-950 sm:text-sm">
                        A client
                      </p>
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full applicant name"
                      required
                      value={
                        registrantDetails.full_name ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'full_name',
                          value
                        )
                      }
                    />

                    <Field
                      label="Organisation name"
                      value={
                        registrantDetails.org_name ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'org_name',
                          value
                        )
                      }
                    />

                    <Field
                      label="Physical address"
                      required
                      value={
                        registrantDetails.physical_address ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'physical_address',
                          value
                        )
                      }
                    />

                    <Field
                      label="Postal address"
                      required
                      value={
                        registrantDetails.postal_address ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'postal_address',
                          value
                        )
                      }
                    />

                    <Field
                      label="Town / City"
                      required
                      value={
                        registrantDetails.city ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'city',
                          value
                        )
                      }
                    />

                    <Field
                      label="Country"
                      required
                      value={
                        registrantDetails.country ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'country',
                          value
                        )
                      }
                    />

                    <Field
                      label="Phone"
                      required
                      value={
                        registrantDetails.phone ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'phone',
                          value
                        )
                      }
                    />

                    <Field
                      label="Email"
                      type="email"
                      required
                      value={
                        registrantDetails.email ?? ''
                      }
                      onChange={(value) =>
                        updateRegistrant(
                          'email',
                          value
                        )
                      }
                    />
                  </div>

                  <Field
                    label="Organisation / activity description"
                    required
                    value={
                      registrantDetails.org_description ?? ''
                    }
                    onChange={(value) =>
                      updateRegistrant(
                        'org_description',
                        value
                      )
                    }
                  />

                  <Field
                    label="Proposed domain use"
                    required
                    value={
                      registrantDetails.proposed_usage ?? ''
                    }
                    onChange={(value) =>
                      updateRegistrant(
                        'proposed_usage',
                        value
                      )
                    }
                  />
                </div>
              )}

            {!preparingSelectedDomain &&
              step === 'nameservers' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      DNS nameservers
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Use Runtime nameservers or enter your own.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setUseDefaultNameservers(
                        true
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      useDefaultNameservers
                        ? 'border-[#3120ff] bg-[#3120ff]/5'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Server className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />

                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-950">
                          Runtime nameservers
                        </p>

                        <div className="mt-2 space-y-1">
                          {settings.default_nameservers.map(
                            (ns) => (
                              <p
                                key={ns}
                                className="break-all font-mono text-xs text-zinc-600"
                              >
                                {ns}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setUseDefaultNameservers(
                        false
                      )
                    }
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      !useDefaultNameservers
                        ? 'border-[#3120ff] bg-[#3120ff]/5'
                        : 'border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Custom nameservers
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Use nameservers supplied by another hosting or DNS provider.
                        </p>
                      </div>
                    </div>
                  </button>

                  {!useDefaultNameservers && (
                    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                      {customNameservers.map(
                        (value, index) => (
                          <Field
                            key={index}
                            label={`Nameserver ${index + 1}${
                              index < 2
                                ? ' *'
                                : ' (optional)'
                            }`}
                            value={value}
                            placeholder={`ns${index + 1}.example.com`}
                            mono
                            onChange={(
                              newValue
                            ) => {
                              const copy = [
                                ...customNameservers,
                              ];

                              copy[index] =
                                newValue.toLowerCase();

                              setCustomNameservers(
                                copy
                              );
                            }}
                          />
                        )
                      )}

                      {nameserverError && (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            {nameserverError}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            {!preparingSelectedDomain &&
              step === 'payment' && (
                <div className="space-y-5">
                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <SummaryRow
                      label="Domain"
                      value={selectedDomain}
                      mono
                    />

                    <SummaryRow
                       label="Renewal"
                      value={
                        renewPrice !== undefined
                          ? `$${renewPrice.toFixed(2)} / year`
                          : 'Unavailable'
                      }
                    />

                    {zispaRequired && (
                      <SummaryRow
                        label="Registrant"
                        value={
                          registrantDetails.full_name
                        }
                      />
                    )}

                    <SummaryRow
                      label="Nameservers"
                      value={
                        useDefaultNameservers
                          ? 'Runtime nameservers'
                          : 'Custom nameservers'
                      }
                    />

                    <div className="flex items-center justify-between gap-4 bg-zinc-50 px-4 py-4">
                      <span className="text-sm font-semibold text-zinc-950">
                        Total
                      </span>
                      <span className="text-lg font-bold text-[#3120ff]">
                        {priceLabel} USD
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-zinc-950">
                      Payment method
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <GatewayButton
                        active={
                          gateway === 'paynow'
                        }
                        title="Paynow"
                        onClick={() =>
                          setGateway('paynow')
                        }
                      />

                      <GatewayButton
                        active={
                          gateway === 'ecocash'
                        }
                        title="EcoCash"
                        onClick={() =>
                          setGateway('ecocash')
                        }
                      />

                      <GatewayButton
                        active={
                          gateway === 'innbucks'
                        }
                        title="InnBucks"
                        onClick={() =>
                          setGateway('innbucks')
                        }
                      />

                      <GatewayButton
                        active={
                          gateway ===
                          'stripe_card'
                        }
                        title="International card"
                        onClick={() =>
                          setGateway(
                            'stripe_card'
                          )
                        }
                      />
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-zinc-500">
                    Your order will be added to your account for processing after payment is confirmed.
                  </p>
                </div>
              )}
          </div>

          {/* Fixed footer - always visible on mobile */}
          {!preparingSelectedDomain &&
            step !== 'search' && (
              <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={!canGoBack}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>

                  {step === 'owner' && (
                    <button
                      type="button"
                      onClick={
                        continueFromOwner
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] sm:px-5"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  {step ===
                    'nameservers' && (
                    <button
                      type="button"
                      onClick={
                        continueFromNameservers
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] sm:px-5"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  {step === 'payment' && (
                    <button
                      type="button"
                      onClick={completeOrder}
                      disabled={
                        isProcessing ||
                        price === undefined
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Processing
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Pay {priceLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: 'text' | 'email';
  placeholder?: string;
  mono?: boolean;
};

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  mono = false,
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-zinc-700">
      {label}
      {required ? ' *' : ''}
    </label>

    <input
      type={type}
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#3120ff] ${
        mono ? 'font-mono' : ''
      }`}
    />
  </div>
);

type SummaryRowProps = {
  label: string;
  value: string;
  mono?: boolean;
};

const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  value,
  mono = false,
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-4 py-3">
    <span className="shrink-0 text-sm text-zinc-500">
      {label}
    </span>

    <span
      className={`min-w-0 break-all text-right text-sm font-medium text-zinc-950 ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </span>
  </div>
);

type GatewayButtonProps = {
  active: boolean;
  title: string;
  onClick: () => void;
};

const GatewayButton: React.FC<GatewayButtonProps> = ({
  active,
  title,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${
      active
        ? 'border-[#3120ff] bg-[#3120ff]/5 text-zinc-950'
        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`}
  >
    {title}
  </button>
);
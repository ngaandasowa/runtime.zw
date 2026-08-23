import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe2,
  Lock,
  Search,
  Server,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

import {
  useStore,
} from '../../context/StoreContext';

import {
  domainService,
  DomainAvailabilityResult,
} from '../../services/DomainService';

import {
  nameserverService,
} from '../../services/NameserverService';

import {
  RegistrantDetails,
  RegistrantType,
} from '../../types';

type Step =
  | 1
  | 2
  | 3
  | 4;

type Gateway =
  | 'paynow'
  | 'ecocash'
  | 'innbucks'
  | 'stripe_card';

const ZISPA_TLDS = [
  '.co.zw',
  '.org.zw',
  '.ac.zw',
];

const FIXED_PRICES: Record<
  string,
  number
> = {
  '.co.zw': 2,
  '.org.zw': 3,
  '.ac.zw': 3,
};

const isZispaDomain = (
  domain: string
) => {
  const normalized =
    domain
      .trim()
      .toLowerCase();

  return ZISPA_TLDS.some(
    (tld) =>
      normalized.endsWith(
        tld
      )
  );
};

const getFixedPrice = (
  domain: string
) => {
  const normalized =
    domain
      .trim()
      .toLowerCase();

  const match =
    ZISPA_TLDS.find(
      (tld) =>
        normalized.endsWith(
          tld
        )
    );

  return match
    ? FIXED_PRICES[match]
    : undefined;
};

export const DomainRegistrationModal: React.FC =
  () => {
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

    const [
      step,
      setStep,
    ] =
      useState<Step>(1);

    /*
     * ----------------------------------------------------------
     * DOMAIN SEARCH
     * ----------------------------------------------------------
     */

    const [
      searchTerm,
      setSearchTerm,
    ] =
      useState('');

    const [
      searchResults,
      setSearchResults,
    ] =
      useState<
        DomainAvailabilityResult[]
      >([]);

    const [
      availabilityResult,
      setAvailabilityResult,
    ] =
      useState<
        DomainAvailabilityResult | null
      >(null);

    const [
      isChecking,
      setIsChecking,
    ] =
      useState(false);

    const [
      searchError,
      setSearchError,
    ] =
      useState<
        string | null
      >(null);

    /*
     * ----------------------------------------------------------
     * REGISTRANT
     * ----------------------------------------------------------
     */

    const [
      registrantType,
      setRegistrantType,
    ] =
      useState<RegistrantType>(
        'myself'
      );

    const [
      fullName,
      setFullName,
    ] =
      useState(
        currentUser?.name ||
          ''
      );

    const [
      orgName,
      setOrgName,
    ] =
      useState(
        currentUser?.organisation ||
          ''
      );

    const [
      physicalAddress,
      setPhysicalAddress,
    ] =
      useState('');

    const [
      postalAddress,
      setPostalAddress,
    ] =
      useState('');

    const [
      city,
      setCity,
    ] =
      useState('');

    const [
      country,
      setCountry,
    ] =
      useState(
        'Zimbabwe'
      );

    const [
      phone,
      setPhone,
    ] =
      useState(
        currentUser?.phone ||
          ''
      );

    const [
      email,
      setEmail,
    ] =
      useState(
        currentUser?.email ||
          ''
      );

    const [
      orgDescription,
      setOrgDescription,
    ] =
      useState('');

    const [
      proposedUsage,
      setProposedUsage,
    ] =
      useState('');

    /*
     * ----------------------------------------------------------
     * NAMESERVERS
     * ----------------------------------------------------------
     */

    const [
      nsMode,
      setNsMode,
    ] =
      useState<
        'default' | 'custom'
      >('default');

    const [
      customNs,
      setCustomNs,
    ] =
      useState<string[]>([
        '',
        '',
        '',
        '',
      ]);

    const [
      nsError,
      setNsError,
    ] =
      useState<
        string | null
      >(null);

    /*
     * ----------------------------------------------------------
     * PAYMENT
     * ----------------------------------------------------------
     */

    const [
      gateway,
      setGateway,
    ] =
      useState<Gateway>(
        'paynow'
      );

    const [
      isProcessing,
      setIsProcessing,
    ] =
      useState(false);

    /*
     * ----------------------------------------------------------
     * DERIVED VALUES
     * ----------------------------------------------------------
     */

    const selectedDomain =
      availabilityResult?.domain ||
      pendingRegisterDomain ||
      '';

    const requiresOwnerDetails =
      selectedDomain
        ? isZispaDomain(
            selectedDomain
          )
        : false;

    const domainPrice =
      useMemo(() => {
        if (
          !selectedDomain
        ) {
          return 0;
        }

        const fixed =
          getFixedPrice(
            selectedDomain
          );

        if (
          fixed !==
          undefined
        ) {
          return fixed;
        }

        return (
          availabilityResult?.price ??
          0
        );
      }, [
        selectedDomain,
        availabilityResult,
      ]);

    const formattedPrice =
      domainPrice > 0
        ? `$${domainPrice.toFixed(
            2
          )}`
        : 'Price unavailable';

    /*
     * ----------------------------------------------------------
     * RESET
     * ----------------------------------------------------------
     */

    const resetRegistration =
      () => {
        setStep(1);

        setSearchTerm(
          ''
        );

        setSearchResults(
          []
        );

        setAvailabilityResult(
          null
        );

        setSearchError(
          null
        );

        setRegistrantType(
          'myself'
        );

        setFullName(
          currentUser?.name ||
            ''
        );

        setOrgName(
          currentUser?.organisation ||
            ''
        );

        setPhysicalAddress(
          ''
        );

        setPostalAddress(
          ''
        );

        setCity(
          ''
        );

        setCountry(
          'Zimbabwe'
        );

        setPhone(
          currentUser?.phone ||
            ''
        );

        setEmail(
          currentUser?.email ||
            ''
        );

        setOrgDescription(
          ''
        );

        setProposedUsage(
          ''
        );

        setNsMode(
          'default'
        );

        setCustomNs([
          '',
          '',
          '',
          '',
        ]);

        setNsError(
          null
        );

        setGateway(
          'paynow'
        );

        setIsChecking(
          false
        );

        setIsProcessing(
          false
        );
      };

    const closeModal =
      () => {
        setRegistrationModalOpen(
          false
        );

        setPendingRegisterDomain(
          null
        );

        resetRegistration();
      };

    /*
     * ----------------------------------------------------------
     * CURRENT ACCOUNT DETAILS
     * ----------------------------------------------------------
     */

    useEffect(() => {
      if (
        !currentUser ||
        registrantType !==
          'myself'
      ) {
        return;
      }

      setFullName(
        currentUser.name ||
          ''
      );

      setOrgName(
        currentUser.organisation ||
          ''
      );

      setPhone(
        currentUser.phone ||
          ''
      );

      setEmail(
        currentUser.email ||
          ''
      );
    }, [
      currentUser,
      registrantType,
    ]);

    /*
     * ----------------------------------------------------------
     * DOMAIN SELECTED FROM HOMEPAGE
     *
     * Recheck silently.
     * The customer does NOT search again.
     * ----------------------------------------------------------
     */

    useEffect(() => {
      if (
        !registrationModalOpen ||
        !pendingRegisterDomain
      ) {
        return;
      }

      let cancelled =
        false;

      const prepareDomain =
        async () => {
          setIsChecking(
            true
          );

          setSearchError(
            null
          );

          try {
            const result =
              await domainService.checkAvailability(
                pendingRegisterDomain
              );

            if (
              cancelled
            ) {
              return;
            }

            setAvailabilityResult(
              result
            );

            if (
              result.checkingFailed
            ) {
              setSearchError(
                result.reason ||
                  'Unable to confirm domain availability.'
              );

              setStep(1);

              return;
            }

            if (
              !result.isAvailable
            ) {
              setSearchError(
                `${result.domain} is no longer available for registration.`
              );

              setStep(1);

              return;
            }

            /*
             * ZISPA:
             * Owner Details -> Nameservers -> Payment
             *
             * Other TLDs:
             * Nameservers -> Payment
             */
            setStep(
              isZispaDomain(
                result.domain
              )
                ? 2
                : 3
            );
          } catch (
            error
          ) {
            console.error(
              'Unable to prepare selected domain:',
              error
            );

            if (
              !cancelled
            ) {
              setSearchError(
                'Unable to confirm domain availability.'
              );

              setStep(1);
            }
          } finally {
            if (
              !cancelled
            ) {
              setIsChecking(
                false
              );
            }
          }
        };

      prepareDomain();

      return () => {
        cancelled =
          true;
      };
    }, [
      pendingRegisterDomain,
      registrationModalOpen,
    ]);

    /*
     * ----------------------------------------------------------
     * DASHBOARD DOMAIN SEARCH
     * ----------------------------------------------------------
     */

    const handleSearch =
      async (
        event:
          React.FormEvent
      ) => {
        event.preventDefault();

        if (
          !searchTerm.trim()
        ) {
          return;
        }

        setIsChecking(
          true
        );

        setSearchResults(
          []
        );

        setAvailabilityResult(
          null
        );

        setSearchError(
          null
        );

        try {
          const results =
            await domainService.searchDomains(
              searchTerm
            );

          setSearchResults(
            results
          );
        } catch (
          error
        ) {
          console.error(
            'Domain search failed:',
            error
          );

          setSearchError(
            'We could not complete the domain search. Please try again.'
          );
        } finally {
          setIsChecking(
            false
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * SELECT AVAILABLE DOMAIN
     * ----------------------------------------------------------
     */

    const selectDomain = (
      result:
        DomainAvailabilityResult
    ) => {
      if (
        !result.isAvailable ||
        result.checkingFailed
      ) {
        return;
      }

      setAvailabilityResult(
        result
      );

      setPendingRegisterDomain(
        result.domain
      );

      setStep(
        isZispaDomain(
          result.domain
        )
          ? 2
          : 3
      );
    };

    /*
     * ----------------------------------------------------------
     * OWNER VALIDATION
     * ----------------------------------------------------------
     */

    const validateOwnerDetails =
      () => {
        if (
          !fullName.trim()
        ) {
          return 'Owner full name is required.';
        }

        if (
          !email.trim() ||
          !email.includes('@')
        ) {
          return 'A valid owner email address is required.';
        }

        if (
          !physicalAddress.trim()
        ) {
          return 'Physical address is required.';
        }

        if (
          !city.trim()
        ) {
          return 'Town or city is required.';
        }

        if (
          !country.trim()
        ) {
          return 'Country is required.';
        }

        if (
          !phone.trim()
        ) {
          return 'Phone number is required.';
        }

        if (
          !orgDescription.trim()
        ) {
          return 'Organisation or activity description is required.';
        }

        if (
          !proposedUsage.trim()
        ) {
          return 'Proposed domain usage is required.';
        }

        return null;
      };

    const handleOwnerNext =
      () => {
        const error =
          validateOwnerDetails();

        if (error) {
          showNotification(
            error,
            'error'
          );

          return;
        }

        setStep(3);
      };

    /*
     * ----------------------------------------------------------
     * NAMESERVER VALIDATION
     * ----------------------------------------------------------
     */

    const handleNameserverNext =
      () => {
        if (
          nsMode ===
          'custom'
        ) {
          const active =
            customNs
              .map((ns) =>
                ns.trim()
              )
              .filter(Boolean);

          const validation =
            nameserverService.validateNameservers(
              active
            );

          if (
            !validation.valid
          ) {
            setNsError(
              validation.error ||
                'Invalid nameserver configuration.'
            );

            return;
          }
        }

        setNsError(
          null
        );

        setStep(4);
      };

    /*
     * ----------------------------------------------------------
     * COMPLETE ORDER
     * ----------------------------------------------------------
     */

    const handleCompleteOrder =
      async () => {
        if (
          !availabilityResult ||
          !availabilityResult.isAvailable
        ) {
          return;
        }

        if (
          requiresOwnerDetails
        ) {
          const ownerError =
            validateOwnerDetails();

          if (
            ownerError
          ) {
            showNotification(
              ownerError,
              'error'
            );

            setStep(2);

            return;
          }
        }

        setIsProcessing(
          true
        );

        try {
          /*
           * Full ZISPA owner details are required
           * only for:
           *
           * .co.zw
           * .org.zw
           * .ac.zw
           *
           * Other domains still receive a basic
           * internal owner object from the account.
           */

          const owner:
            RegistrantDetails =
            requiresOwnerDetails
              ? {
                  full_name:
                    fullName.trim(),

                  org_name:
                    orgName.trim() ||
                    (registrantType ===
                    'myself'
                      ? 'Individual'
                      : 'Client'),

                  physical_address:
                    physicalAddress.trim(),

                  postal_address:
                    postalAddress.trim(),

                  city:
                    city.trim(),

                  country:
                    country.trim(),

                  phone:
                    phone.trim(),

                  email:
                    email.trim(),

                  org_description:
                    orgDescription.trim(),

                  proposed_usage:
                    proposedUsage.trim(),
                }
              : {
                  full_name:
                    currentUser?.name ||
                    fullName ||
                    'Customer',

                  org_name:
                    currentUser?.organisation ||
                    orgName ||
                    '',

                  physical_address:
                    '',

                  postal_address:
                    '',

                  city:
                    '',

                  country:
                    '',

                  phone:
                    currentUser?.phone ||
                    phone ||
                    '',

                  email:
                    currentUser?.email ||
                    email ||
                    '',

                  org_description:
                    '',

                  proposed_usage:
                    '',
                };

          const finalNameservers =
            nsMode ===
            'default'
              ? [
                  ...settings.default_nameservers,
                ]
              : customNs
                  .map(
                    (ns) =>
                      ns.trim()
                  )
                  .filter(
                    Boolean
                  );

          await registerNewDomain(
            availabilityResult.domain,
            registrantType,
            owner,
            finalNameservers,
            gateway
          );

          setRegistrationModalOpen(
            false
          );

          setPendingRegisterDomain(
            null
          );

          setActiveView(
            'dashboard'
          );

          setDashboardSubView(
            'domains'
          );

          resetRegistration();
        } catch (
          error
        ) {
          console.error(
            'Unable to complete domain order:',
            error
          );

          showNotification(
            error instanceof
              Error
              ? error.message
              : 'Unable to complete your domain order.',
            'error'
          );
        } finally {
          setIsProcessing(
            false
          );
        }
      };

    /*
     * ----------------------------------------------------------
     * BACK LOGIC
     * ----------------------------------------------------------
     */

    const handleBackFromNameservers =
      () => {
        if (
          requiresOwnerDetails
        ) {
          setStep(2);

          return;
        }

        /*
         * If domain came from homepage,
         * do not make them search again.
         */
        if (
          pendingRegisterDomain
        ) {
          closeModal();

          return;
        }

        setStep(1);
      };

    if (
      !registrationModalOpen
    ) {
      return null;
    }

    /*
     * ----------------------------------------------------------
     * PREPARING DOMAIN
     * ----------------------------------------------------------
     */

    if (
      pendingRegisterDomain &&
      isChecking &&
      !availabilityResult
    ) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-2xl">

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3120ff]/30 border-t-[#3120ff]" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-zinc-950">
              Preparing your domain
            </h3>

            <p className="mt-2 font-mono text-sm text-zinc-600">
              {
                pendingRegisterDomain
              }
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Confirming availability and pricing.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">

        <div className="flex min-h-full items-center justify-center">

          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">

            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-zinc-200 px-5 py-5 sm:px-7">

              <div className="flex min-w-0 items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                  <Globe2 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                    {step === 1 &&
                      'Register a domain'}

                    {step === 2 &&
                      'Owner details'}

                    {step === 3 &&
                      'Nameservers'}

                    {step === 4 &&
                      'Review your order'}
                  </h2>

                  {selectedDomain ? (
                    <p className="mt-1 truncate font-mono text-xs text-zinc-500">
                      {
                        selectedDomain
                      }

                      {domainPrice >
                        0 &&
                        ` · ${formattedPrice}/year`}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">
                      Search and register your next domain.
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* PROGRESS */}
            {selectedDomain && (
              <div className="border-b border-zinc-200 px-5 py-4 sm:px-7">

                <div
                  className={`grid gap-2 text-center text-[11px] font-semibold ${
                    requiresOwnerDetails
                      ? 'grid-cols-4'
                      : 'grid-cols-3'
                  }`}
                >
                  <div className="rounded-lg bg-[#3120ff]/10 px-2 py-2 text-[#3120ff]">
                    Domain ✓
                  </div>

                  {requiresOwnerDetails && (
                    <div
                      className={`rounded-lg px-2 py-2 ${
                        step >= 2
                          ? 'bg-[#3120ff]/10 text-[#3120ff]'
                          : 'bg-zinc-100 text-zinc-400'
                      }`}
                    >
                      Owner
                    </div>
                  )}

                  <div
                    className={`rounded-lg px-2 py-2 ${
                      step >= 3
                        ? 'bg-[#3120ff]/10 text-[#3120ff]'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    Nameservers
                  </div>

                  <div
                    className={`rounded-lg px-2 py-2 ${
                      step >= 4
                        ? 'bg-[#3120ff]/10 text-[#3120ff]'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}
                  >
                    Payment
                  </div>
                </div>
              </div>
            )}

            <div className="px-5 py-6 sm:px-7">

              {/* STEP 1 */}
              {step === 1 && (
                <div className="space-y-5">

                  <form
                    onSubmit={
                      handleSearch
                    }
                  >
                    <label className="mb-2 block text-sm font-semibold text-zinc-950">
                      Search for a domain
                    </label>

                    <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-2 shadow-sm">

                      <Search className="ml-2 h-5 w-5 shrink-0 text-zinc-400" />

                      <input
                        value={
                          searchTerm
                        }
                        onChange={(
                          event
                        ) =>
                          setSearchTerm(
                            event.target.value
                              .toLowerCase()
                              .replace(
                                /\s/g,
                                ''
                              )
                          )
                        }
                        placeholder="yourdomain or yourdomain.com"
                        autoComplete="off"
                        spellCheck={
                          false
                        }
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400"
                      />

                      <button
                        type="submit"
                        disabled={
                          isChecking ||
                          !searchTerm.trim()
                        }
                        className="flex h-11 items-center gap-2 rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isChecking ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                            <span className="hidden sm:inline">
                              Checking
                            </span>
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4" />

                            <span className="hidden sm:inline">
                              Search
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {searchError && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                      <span>
                        {
                          searchError
                        }
                      </span>
                    </div>
                  )}

                  {searchResults.length >
                    0 && (
                    <div className="overflow-hidden rounded-xl border border-zinc-200">

                      {searchResults.map(
                        (
                          result,
                          index
                        ) => (
                          <div
                            key={
                              result.domain
                            }
                            className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                              index !==
                              searchResults.length -
                                1
                                ? 'border-b border-zinc-200'
                                : ''
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">

                              {result.checkingFailed ? (
                                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                              ) : result.isAvailable ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 shrink-0 text-zinc-400" />
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-mono text-sm font-semibold text-zinc-950">
                                  {
                                    result.domain
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-zinc-500">
                                  {result.checkingFailed
                                    ? result.reason ||
                                      'Unable to check'
                                    : result.isAvailable
                                      ? `${getFixedPrice(
                                          result.domain
                                        ) !==
                                        undefined
                                          ? `$${getFixedPrice(
                                              result.domain
                                            )!.toFixed(
                                              2
                                            )}`
                                          : result.price !==
                                              undefined
                                            ? `$${result.price.toFixed(
                                                2
                                              )}`
                                            : 'Available'} / year`
                                      : 'Already registered'}
                                </p>
                              </div>
                            </div>

                            {result.isAvailable &&
                              !result.checkingFailed && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectDomain(
                                      result
                                    )
                                  }
                                  className="rounded-lg bg-[#3120ff] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
                                >
                                  Register
                                </button>
                              )}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 &&
                requiresOwnerDetails && (
                  <div className="space-y-5">

                    <div className="rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 p-3">
                      <p className="text-xs text-zinc-600">
                        Registrant information is required for this Zimbabwean domain extension.
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold text-zinc-950">
                        {
                          selectedDomain
                        }{' '}
                        ·{' '}
                        {
                          formattedPrice
                        }
                        /year
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-zinc-950">
                        Who are you registering for?
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">

                        <button
                          type="button"
                          onClick={() =>
                            setRegistrantType(
                              'myself'
                            )
                          }
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                            registrantType ===
                            'myself'
                              ? 'border-[#3120ff] bg-[#3120ff]/5'
                              : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <User className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />

                          <div>
                            <p className="text-sm font-semibold text-zinc-950">
                              Myself / Organisation
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              Register using my details.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRegistrantType(
                              'client'
                            );

                            setFullName(
                              ''
                            );

                            setOrgName(
                              ''
                            );

                            setPhysicalAddress(
                              ''
                            );

                            setPostalAddress(
                              ''
                            );

                            setCity(
                              ''
                            );

                            setPhone(
                              ''
                            );

                            setEmail(
                              ''
                            );

                            setOrgDescription(
                              ''
                            );

                            setProposedUsage(
                              ''
                            );
                          }}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                            registrantType ===
                            'client'
                              ? 'border-[#3120ff] bg-[#3120ff]/5'
                              : 'border-zinc-200 hover:bg-zinc-50'
                          }`}
                        >
                          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />

                          <div>
                            <p className="text-sm font-semibold text-zinc-950">
                              My Client
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              Enter the actual owner's details.
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Owner Full Name *
                        </label>

                        <input
                          value={
                            fullName
                          }
                          onChange={(
                            event
                          ) =>
                            setFullName(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Organisation Name
                        </label>

                        <input
                          value={
                            orgName
                          }
                          onChange={(
                            event
                          ) =>
                            setOrgName(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Physical Address *
                        </label>

                        <input
                          value={
                            physicalAddress
                          }
                          onChange={(
                            event
                          ) =>
                            setPhysicalAddress(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Postal Address
                        </label>

                        <input
                          value={
                            postalAddress
                          }
                          onChange={(
                            event
                          ) =>
                            setPostalAddress(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Town / City *
                        </label>

                        <input
                          value={
                            city
                          }
                          onChange={(
                            event
                          ) =>
                            setCity(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Country *
                        </label>

                        <input
                          value={
                            country
                          }
                          onChange={(
                            event
                          ) =>
                            setCountry(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Phone *
                        </label>

                        <input
                          value={
                            phone
                          }
                          onChange={(
                            event
                          ) =>
                            setPhone(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                          Email *
                        </label>

                        <input
                          type="email"
                          value={
                            email
                          }
                          onChange={(
                            event
                          ) =>
                            setEmail(
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                        Organisation / Activity Description *
                      </label>

                      <input
                        value={
                          orgDescription
                        }
                        onChange={(
                          event
                        ) =>
                          setOrgDescription(
                            event.target.value
                          )
                        }
                        placeholder="Briefly describe the organisation or activity"
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-zinc-700">
                        Proposed Domain Usage *
                      </label>

                      <input
                        value={
                          proposedUsage
                        }
                        onChange={(
                          event
                        ) =>
                          setProposedUsage(
                            event.target.value
                          )
                        }
                        placeholder="Website, email, online services..."
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-[#3120ff]"
                      />
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-5">

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            pendingRegisterDomain
                          ) {
                            closeModal();
                          } else {
                            setStep(
                              1
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950"
                      >
                        <ArrowLeft className="h-4 w-4" />

                        <span>
                          Back
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleOwnerNext
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#3120ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2819d9]"
                      >
                        Continue

                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="space-y-6">

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Nameserver configuration
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      Choose where DNS for your domain will be managed.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={() =>
                        setNsMode(
                          'default'
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        nsMode ===
                        'default'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Server className="h-5 w-5 text-[#3120ff]" />

                      <p className="mt-3 text-sm font-semibold text-zinc-950">
                        Default Nameservers
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Use Runtime's default DNS configuration.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setNsMode(
                          'custom'
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        nsMode ===
                        'custom'
                          ? 'border-[#3120ff] bg-[#3120ff]/5'
                          : 'border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <Globe2 className="h-5 w-5 text-[#3120ff]" />

                      <p className="mt-3 text-sm font-semibold text-zinc-950">
                        Custom Nameservers
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Use Cloudflare, another host, or your own DNS.
                      </p>
                    </button>
                  </div>

                  {nsMode ===
                  'default' ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">

                      <p className="mb-3 text-xs font-semibold text-zinc-500">
                        Default Nameservers
                      </p>

                      <div className="space-y-2">
                        {settings.default_nameservers.map(
                          (
                            nameserver,
                            index
                          ) => (
                            <div
                              key={
                                nameserver
                              }
                              className="font-mono text-sm text-zinc-800"
                            >
                              ns
                              {
                                index +
                                  1
                              }
                              :{' '}
                              {
                                nameserver
                              }
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">

                      {customNs.map(
                        (
                          value,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                          >
                            <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                              Nameserver{' '}
                              {index +
                                1}{' '}
                              {index <
                              2
                                ? '*'
                                : '(optional)'}
                            </label>

                            <input
                              value={
                                value
                              }
                              onChange={(
                                event
                              ) => {
                                const copy =
                                  [
                                    ...customNs,
                                  ];

                                copy[
                                  index
                                ] =
                                  event.target.value
                                    .trim()
                                    .toLowerCase();

                                setCustomNs(
                                  copy
                                );
                              }}
                              placeholder={`ns${index + 1}.example.com`}
                              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#3120ff]"
                            />
                          </div>
                        )
                      )}

                      {nsError && (
                        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

                          {
                            nsError
                          }
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-5">

                    <button
                      type="button"
                      onClick={
                        handleBackFromNameservers
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950"
                    >
                      <ArrowLeft className="h-4 w-4" />

                      Back
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleNameserverNext
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#3120ff] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2819d9]"
                    >
                      Continue

                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 */}
              {step === 4 && (
                <div className="space-y-6">

                  <div className="overflow-hidden rounded-xl border border-zinc-200">

                    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                      <span className="text-sm text-zinc-500">
                        Domain
                      </span>

                      <span className="font-mono text-sm font-semibold text-zinc-950">
                        {
                          selectedDomain
                        }
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                      <span className="text-sm text-zinc-500">
                        Registration
                      </span>

                      <span className="text-sm font-medium text-zinc-950">
                        1 Year
                      </span>
                    </div>

                    {requiresOwnerDetails && (
                      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                        <span className="text-sm text-zinc-500">
                          Registrant
                        </span>

                        <span className="max-w-[60%] text-right text-sm font-medium text-zinc-950">
                          {
                            fullName
                          }
                          {orgName &&
                            ` · ${orgName}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                      <span className="text-sm text-zinc-500">
                        Nameservers
                      </span>

                      <span className="text-sm font-medium text-zinc-950">
                        {nsMode ===
                        'default'
                          ? 'Default'
                          : 'Custom'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-50 px-4 py-4">
                      <span className="font-semibold text-zinc-950">
                        Total
                      </span>

                      <span className="text-lg font-bold text-[#3120ff]">
                        {
                          formattedPrice
                        }{' '}
                        USD
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#3120ff]" />

                      <h3 className="text-sm font-semibold text-zinc-950">
                        Payment method
                      </h3>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">

                      {[
                        [
                          'paynow',
                          'Paynow',
                          'EcoCash, OneMoney & Cards',
                        ],
                        [
                          'ecocash',
                          'EcoCash',
                          'Mobile payment',
                        ],
                        [
                          'innbucks',
                          'InnBucks',
                          'USD payment',
                        ],
                        [
                          'stripe_card',
                          'International Card',
                          'Visa / Mastercard',
                        ],
                      ].map(
                        ([
                          value,
                          title,
                          description,
                        ]) => (
                          <button
                            key={
                              value
                            }
                            type="button"
                            onClick={() =>
                              setGateway(
                                value as Gateway
                              )
                            }
                            className={`rounded-xl border p-3 text-left transition ${
                              gateway ===
                              value
                                ? 'border-[#3120ff] bg-[#3120ff]/5'
                                : 'border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <p className="text-sm font-semibold text-zinc-950">
                              {
                                title
                              }
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                description
                              }
                            </p>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-[#3120ff]/20 bg-[#3120ff]/5 p-4">

                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#3120ff]" />

                    <p className="text-xs leading-5 text-zinc-600">
                      After payment is confirmed, your domain order will be added to your account and processed.
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200 pt-5">

                    <button
                      type="button"
                      onClick={() =>
                        setStep(
                          3
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-950"
                    >
                      <ArrowLeft className="h-4 w-4" />

                      Back
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleCompleteOrder
                      }
                      disabled={
                        isProcessing ||
                        domainPrice <=
                          0
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-[#3120ff] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                          Processing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />

                          Pay{' '}
                          {
                            formattedPrice
                          }
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
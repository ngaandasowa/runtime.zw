import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
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
  getCoZwRegistrationEligibility,
  RUNTIME_ZW_PRICES,
} from '../services/DomainService';
import { nameserverService } from '../services/NameserverService';
import { RegistrantDetails, RegistrantType } from '../types';

type Step =
  | 'search'
  | 'owner'
  | 'nameservers'
  | 'payment'
  | 'instructions';

type Gateway =
  | 'ecocash_usd'
  | 'pesepay';

type PesePayMethod = {
  code: string;
  name: string;
  description: string;
  seamless: boolean;
  requiresPhone: boolean;
};

const ZISPA_PRICES: Record<string, number> = {
  '.co.zw': 2,
  '.org.zw': 3,
  '.ac.zw': 3,
};

const ZISPA_TLDS = Object.keys(ZISPA_PRICES);

const KNOWN_NAMESERVER_IPS:
  Record<string, string> = {
    'ns1.ngaatec.com':
      '148.163.100.131',
    'ns2.ngaatec.com':
      '148.163.100.132',
  };

const isValidIpAddress = (
  value: string
) => {
  const input =
    value.trim();

  const parts =
    input.split('.');

  if (
    parts.length === 4 &&
    parts.every(
      (part) =>
        /^\d{1,3}$/.test(part) &&
        Number(part) >= 0 &&
        Number(part) <= 255
    )
  ) {
    return true;
  }

  return (
    input.includes(':') &&
    /^[0-9a-f:]+$/i.test(
      input
    )
  );
};

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

const REGISTRATION_DRAFT_KEY = 'runtime_registration_draft';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://runtime-api-my3q.onrender.com');

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
  const navigate = useNavigate();

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

  const [
    customNameserverIps,
    setCustomNameserverIps,
  ] = useState<string[]>(
    ['', '', '', '']
  );

  const [
    postalSameAsPhysical,
    setPostalSameAsPhysical,
  ] = useState(false);

  const [nameserverError, setNameserverError] = useState<
    string | null
  >(null);
  const [isResolvingNameservers, setIsResolvingNameservers] =
    useState(false);

const [gateway, setGateway] =
  useState<Gateway>('ecocash_usd');

const [pesepayMethods, setPesepayMethods] =
  useState<PesePayMethod[]>([]);
const [pesepayMethodCode, setPesepayMethodCode] =
  useState('');
const [pesepayMethodsLoading, setPesepayMethodsLoading] =
  useState(false);
const [pesepayMethodsError, setPesepayMethodsError] =
  useState<string | null>(null);
const [pesepayPhone, setPesepayPhone] =
  useState('');

const [renewPrice, setRenewPrice] =
  useState<number | undefined>(
    undefined
  );

const [isProcessing, setIsProcessing] =
  useState(false);
const [acceptedCoZwTerms, setAcceptedCoZwTerms] = useState(false);

const [placedOrder, setPlacedOrder] =
  useState<{
    orderReference: string;
    paymentReference: string;
    amount: number;
    domain: string;
    gateway: Gateway;
    paymentId?: string;
    transactionStatus?: string;
  } | null>(null);

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
   * Check if this TLD has Runtime custom pricing
   * (including .com and other non-ZISPA TLDs)
   */
  const normalized = domain.trim().toLowerCase();
  const customTld = Object.keys(RUNTIME_ZW_PRICES)
    .sort((a, b) => b.length - a.length)
    .find((tld) => normalized.endsWith(tld));

  if (customTld) {
    setRenewPrice(
      RUNTIME_ZW_PRICES[customTld].renew
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
    setCustomNameserverIps(
      ['', '', '', '']
    );
    setPostalSameAsPhysical(
      false
    );
    setNameserverError(null);
    setIsResolvingNameservers(false);
    setGateway('ecocash_usd');
    setPesepayMethods([]);
    setPesepayMethodCode('');
    setPesepayMethodsError(null);
    setPesepayPhone('');
    setRenewPrice(undefined);
    setIsProcessing(false);
    setAcceptedCoZwTerms(false);
    setPlacedOrder(null);
  };

  const closeModal = () => {
    setRegistrationModalOpen(false);
    setPendingRegisterDomain(null);
    sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
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

        const savedDraft = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
        const draft = savedDraft
          ? JSON.parse(savedDraft) as {
              domain: string;
              registrantType: RegistrantType;
              registrantDetails: RegistrantDetails;
              useDefaultNameservers: boolean;
              customNameservers: string[];
              customNameserverIps?: string[];
              postalSameAsPhysical?: boolean;
              gateway: Gateway;
            }
          : null;

        if (draft?.domain === result.domain) {
          setRegistrantType(draft.registrantType);
          setRegistrantDetails(draft.registrantDetails);
          setUseDefaultNameservers(draft.useDefaultNameservers);
          setCustomNameservers(
            draft.customNameservers
          );
          setCustomNameserverIps(
            draft.customNameserverIps ||
              ['', '', '', '']
          );
          setPostalSameAsPhysical(
            Boolean(
              draft.postalSameAsPhysical
            )
          );
          setGateway(draft.gateway);
        }

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

        if (result.registrationEligible === false) {
          setSearchError(
            result.eligibilityReason ||
              `${result.domain} is not eligible for registration.`
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

        if (draft?.domain === result.domain) {
          setStep('payment');
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

  useEffect(() => {
    if (
      registrationModalOpen &&
      currentUser?.phone &&
      !pesepayPhone.trim()
    ) {
      setPesepayPhone(currentUser.phone);
    }
  }, [
    registrationModalOpen,
    currentUser,
    pesepayPhone,
  ]);

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
      !result.isAvailable ||
      result.registrationEligible === false
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
    setRegistrantDetails(
      (current) => ({
        ...current,
        [field]:
          value,
        ...(field ===
            'physical_address' &&
          postalSameAsPhysical
          ? {
              postal_address:
                value,
            }
          : {}),
      })
    );
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
        value: registrantDetails.org_name,
        message:
          'Organisation name is required. Use "Individual" for a personal registration.',
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

    if (
      registrantDetails.org_description
        .trim()
        .toLowerCase() ===
      registrantDetails.proposed_usage
        .trim()
        .toLowerCase()
    ) {
      return 'Organisation description and proposed domain use must be different. Describe what the organisation does, then select how the domain will be used.';
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

  const resolveCustomNameserverIps = async () => {
    const activeNameservers =
      customNameservers
        .map((value) =>
          value.trim().toLowerCase()
        )
        .filter(Boolean);

    if (activeNameservers.length === 0) {
      return [] as string[];
    }

    const existingIps =
      activeNameservers.map(
        (_, index) =>
          customNameserverIps[index]?.trim() || ''
      );

    if (
      existingIps.length === activeNameservers.length &&
      existingIps.every(isValidIpAddress)
    ) {
      return existingIps;
    }

    setIsResolvingNameservers(true);
    setNameserverError(null);

    try {
      const result = await postAuthenticated(
        '/api/nameservers/resolve',
        {
          nameservers: activeNameservers,
        }
      );

      const resolved = Array.isArray(result?.results)
        ? result.results
        : [];

      const resolvedIps =
        activeNameservers.map(
          (hostname) => {
            const match =
              resolved.find(
                (item: any) =>
                  String(
                    item?.hostname || ''
                  )
                    .trim()
                    .toLowerCase() ===
                  hostname
              );

            return String(
              match?.ip || ''
            ).trim();
          }
        );

      const failedIndex =
        resolvedIps.findIndex(
          (ip) =>
            !isValidIpAddress(ip)
        );

      if (failedIndex >= 0) {
        throw new Error(
          `Runtime could not resolve ${activeNameservers[failedIndex]} to an IP address. Please confirm the nameserver with your hosting or DNS provider.`
        );
      }

      setCustomNameserverIps([
        ...resolvedIps,
        ...Array(
          Math.max(
            0,
            4 - resolvedIps.length
          )
        ).fill(''),
      ].slice(0, 4));

      return resolvedIps;
    } finally {
      setIsResolvingNameservers(false);
    }
  };

  const continueFromNameservers = async () => {
    if (!useDefaultNameservers) {
      const active =
        customNameservers
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

      const validation =
        nameserverService
          .validateNameservers(
            active
          );

      if (!validation.valid) {
        setNameserverError(
          validation.error ||
            'Please check the nameservers you entered.'
        );
        return;
      }

      /*
       * ZISPA needs nameserver IP addresses in the registry template,
       * but clients should only need to know the hostnames supplied by
       * their hosting or DNS provider. Runtime resolves the IPs itself.
       *
       * If the visitor is not signed in yet, resolution is deferred to
       * completeOrder(), after authentication, so the public registration
       * flow is not blocked by an authenticated API call.
       */
      if (
        zispaRequired &&
        currentUser
      ) {
        try {
          await resolveCustomNameserverIps();
        } catch (error) {
          setNameserverError(
            error instanceof Error
              ? error.message
              : 'Runtime could not resolve these nameservers. Please confirm them with your hosting or DNS provider.'
          );
          return;
        }
      }
    }

    setNameserverError(null);
    setStep('payment');
  };

  const finalNameservers = () =>
    useDefaultNameservers
      ? [
          ...settings.default_nameservers,
        ]
      : customNameservers
          .map((value) =>
            value.trim()
          )
          .filter(Boolean);

  const finalNameserverIps = () => {
    if (useDefaultNameservers) {
      return settings
        .default_nameservers
        .map(
          (hostname) =>
            KNOWN_NAMESERVER_IPS[
              hostname
                .trim()
                .toLowerCase()
            ] ||
            ''
        );
    }

    return customNameservers
      .map(
        (
          hostname,
          index
        ) => ({
          hostname:
            hostname.trim(),
          ip:
            customNameserverIps[
              index
            ]?.trim() ||
            '',
        })
      )
      .filter(
        (entry) =>
          Boolean(
            entry.hostname
          )
      )
      .map(
        (entry) =>
          entry.ip
      );
  };

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

  const postAuthenticated = async (
    path: string,
    body: Record<string, unknown>
  ) => {
    const authUser =
      getAuth().currentUser;

    if (!authUser) {
      throw new Error(
        'Your session has expired. Please sign in again.'
      );
    }

    const token =
      await authUser.getIdToken();

    const response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body:
            JSON.stringify(body),
        }
      );

    let responseBody: any = null;

    try {
      responseBody =
        await response.json();
    } catch {
      // Keep the generic error below.
    }

    if (!response.ok) {
      throw new Error(
        responseBody?.message ||
        `Payment request failed (${response.status}).`
      );
    }

    return responseBody;
  };

  const getAuthenticated = async (
    path: string
  ) => {
    const authUser =
      getAuth().currentUser;

    if (!authUser) {
      throw new Error(
        'Your session has expired. Please sign in again.'
      );
    }

    const token =
      await authUser.getIdToken();

    const response =
      await fetch(
        `${API_BASE_URL}${path}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    let responseBody: any = null;

    try {
      responseBody =
        await response.json();
    } catch {
      // Use generic error below.
    }

    if (!response.ok) {
      throw new Error(
        responseBody?.message ||
        `Payment request failed (${response.status}).`
      );
    }

    return responseBody;
  };

  const verifyPesePayPayment = async (
    paymentId: string
  ) => {
    return postAuthenticated(
      '/api/payments/pesepay/verify',
      { paymentId }
    );
  };

  const waitForPesePayVerification = async (
    paymentId: string
  ) => {
    const maxAttempts = 40;

    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt += 1
    ) {
      const result =
        await verifyPesePayPayment(
          paymentId
        );

      if (result?.verified) {
        return result;
      }

      await new Promise((resolve) =>
        window.setTimeout(
          resolve,
          3000
        )
      );
    }

    return null;
  };

  useEffect(() => {
    if (
      !registrationModalOpen ||
      gateway !== 'pesepay' ||
      !currentUser
    ) {
      return;
    }

    let cancelled = false;

    const loadMethods = async () => {
      setPesepayMethodsLoading(true);
      setPesepayMethodsError(null);

      try {
        const result =
          await getAuthenticated(
            '/api/payments/pesepay/methods?currencyCode=USD'
          );

        if (cancelled) return;

        const methods =
          Array.isArray(result?.methods)
            ? result.methods
            : [];

        setPesepayMethods(methods);

        setPesepayMethodCode(
          (current) =>
            methods.some(
              (method: PesePayMethod) =>
                method.code === current
            )
              ? current
              : methods[0]?.code || ''
        );
      } catch (error) {
        if (cancelled) return;

        setPesepayMethods([]);
        setPesepayMethodCode('');
        setPesepayMethodsError(
          error instanceof Error
            ? error.message
            : 'Unable to load PesePay payment methods.'
        );
      } finally {
        if (!cancelled) {
          setPesepayMethodsLoading(false);
        }
      }
    };

    void loadMethods();

    return () => {
      cancelled = true;
    };
  }, [
    registrationModalOpen,
    gateway,
    currentUser,
  ]);

  const selectedPesePayMethod =
    pesepayMethods.find(
      (method) =>
        method.code ===
        pesepayMethodCode
    ) || null;

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

    const coZwEligibility = getCoZwRegistrationEligibility(
      availabilityResult.domain
    );

    if (!coZwEligibility.eligible) {
      showNotification(
        coZwEligibility.reason || 'This .co.zw domain is not eligible for registration.',
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

    if (
      availabilityResult.domain.toLowerCase().endsWith('.co.zw') &&
      !acceptedCoZwTerms
    ) {
      showNotification(
        'Please confirm the .co.zw registration terms before placing the order.',
        'error'
      );
      return;
    }

    if (zispaRequired) {
      const ownerError =
        validateRegistrant();

      if (ownerError) {
        showNotification(
          ownerError,
          'error'
        );
        setStep('owner');
        return;
      }
    }

    if (!currentUser) {
      sessionStorage.setItem(
        REGISTRATION_DRAFT_KEY,
        JSON.stringify({
          domain:
            availabilityResult.domain,
          registrantType,
          registrantDetails,
          useDefaultNameservers,
          customNameservers,
          customNameserverIps,
          postalSameAsPhysical,
          gateway,
        })
      );

      setRegistrationModalOpen(
        false
      );

      showNotification(
        'Please sign in to continue.',
        'info'
      );

      navigate('/login');
      return;
    }

    if (
      gateway === 'pesepay' &&
      !selectedPesePayMethod
    ) {
      showNotification(
        'Choose an available PesePay payment method.',
        'error'
      );
      return;
    }

    if (
      gateway === 'pesepay' &&
      selectedPesePayMethod?.requiresPhone &&
      !pesepayPhone.trim()
    ) {
      showNotification(
        `Enter the ${selectedPesePayMethod.name} phone number.`,
        'error'
      );
      return;
    }

    setIsProcessing(true);

    try {
      let nameserverIps =
        finalNameserverIps();

      if (
        zispaRequired &&
        !useDefaultNameservers
      ) {
        nameserverIps =
          await resolveCustomNameserverIps();
      }

      const result =
        await registerNewDomain(
          availabilityResult.domain,
          zispaRequired
            ? registrantType
            : 'myself',
          zispaRequired
            ? registrantDetails
            : basicOwnerDetails(),
          finalNameservers(),
          gateway,
          nameserverIps
        );

      if (gateway === 'pesepay') {
        const initiation =
          await postAuthenticated(
            '/api/payments/pesepay/initiate',
            {
              orderId:
                result.order.id,
              paymentMethodCode:
                selectedPesePayMethod!.code,
              customerPhoneNumber:
                selectedPesePayMethod!.requiresPhone
                  ? pesepayPhone.trim()
                  : currentUser.phone || '',
            }
          );

        const paymentId =
          String(
            initiation?.paymentId ||
            ''
          );

        if (!paymentId) {
          throw new Error(
            'Runtime could not create the PesePay transaction.'
          );
        }

        const transaction =
          initiation?.transaction ||
          {};

        setPlacedOrder({
          orderReference:
            result.order.reference,
          paymentReference:
            String(
              transaction.referenceNumber ||
              paymentId
            ),
          amount:
            result.order.total,
          domain:
            result.domain.domain_name,
          gateway:
            'pesepay',
          paymentId,
          transactionStatus:
            String(
              transaction.transactionStatus ||
              'INITIATED'
            ),
        });

        sessionStorage.removeItem(
          REGISTRATION_DRAFT_KEY
        );

        const flow =
          String(
            transaction.flow ||
            ''
          );

        if (
          flow === 'redirect' ||
          transaction.redirectRequired
        ) {
          if (!transaction.redirectUrl) {
            throw new Error(
              'PesePay did not return a checkout URL for this payment method.'
            );
          }

          sessionStorage.setItem(
            'runtime_pesepay_payment_id',
            paymentId
          );

          window.location.assign(
            String(
              transaction.redirectUrl
            )
          );

          return;
        }

        setStep('instructions');

        showNotification(
          `${selectedPesePayMethod!.name} payment request sent. Complete the payment prompt to continue.`,
          'info'
        );

        const verified =
          await waitForPesePayVerification(
            paymentId
          );

        if (verified?.verified) {
          setPlacedOrder(
            (previous) =>
              previous
                ? {
                    ...previous,
                    transactionStatus:
                      'SUCCESS',
                  }
                : previous
          );

          showNotification(
            'Payment confirmed successfully.',
            'success'
          );
        }

        return;
      }

      if (!result.payment) {
        throw new Error(
          'Manual payment could not be created.'
        );
      }

      setPlacedOrder({
        orderReference:
          result.order.reference,
        paymentReference:
          result.payment.reference,
        amount:
          result.payment.amount,
        domain:
          result.domain.domain_name,
        gateway:
          'ecocash_usd',
      });

      sessionStorage.removeItem(
        REGISTRATION_DRAFT_KEY
      );

      setStep('instructions');
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

  const openPaymentWhatsApp = () => {
    if (!placedOrder) {
      return;
    }

    const message =
      encodeURIComponent(
        [
          'Hi Runtime, I have paid for my domain order using EcoCash USD.',
          '',
          `Order: ${placedOrder.orderReference}`,
          `Domain: ${placedOrder.domain}`,
          `Amount: $${placedOrder.amount.toFixed(2)} USD`,
          '',
          'I am attaching my payment screenshot for verification.',
        ].join('\n')
      );

    window.open(
      `https://wa.me/263788350229?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const finishPaymentInstructions =
    () => {
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

      resetState();
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
      return;
    }

    if (step === 'instructions') {
      return;
    }
  };

  const canGoBack =
    step !== 'search' &&
    step !== 'instructions';

  const headerTitle =
    step === 'search'
      ? 'Register a domain'
      : step === 'owner'
        ? 'Registrant details'
        : step === 'nameservers'
          ? 'Nameservers'
          : step === 'payment'
            ? 'Review and payment'
            : placedOrder?.gateway === 'pesepay'
              ? 'PesePay payment'
              : 'EcoCash USD payment';

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
                      step === 'payment' ||
                      step === 'instructions'
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
                    (step === 'payment' || step === 'instructions')
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
                              ) : result.isAvailable && result.registrationEligible !== false ? (
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
                                    : result.isAvailable && result.registrationEligible === false
                                      ? result.eligibilityReason || 'Not eligible for registration'
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
                                result.registrationEligible !== false &&
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
                      required
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

                    <div>
                      <Field
                        label="Postal address"
                        required
                        disabled={
                          postalSameAsPhysical
                        }
                        value={
                          postalSameAsPhysical
                            ? registrantDetails.physical_address ?? ''
                            : registrantDetails.postal_address ?? ''
                        }
                        onChange={(value) =>
                          updateRegistrant(
                            'postal_address',
                            value
                          )
                        }
                      />

                      <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={
                            postalSameAsPhysical
                          }
                          onChange={(event) => {
                            const checked =
                              event.target.checked;

                            setPostalSameAsPhysical(
                              checked
                            );

                            if (checked) {
                              updateRegistrant(
                                'postal_address',
                                registrantDetails.physical_address
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-zinc-300 accent-[#3120ff]"
                        />
                        Postal address is the same as physical address
                      </label>
                    </div>

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

                  <div>
                    <Field
                      label="Organisation / activity description"
                      required
                      value={
                        registrantDetails.org_description ?? ''
                      }
                      placeholder="e.g. Clothing retailer, software company, school"
                      onChange={(value) =>
                        updateRegistrant(
                          'org_description',
                          value
                        )
                      }
                    />

                    <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">
                      Describe what the person, organisation or business does. Do not repeat the domain usage.
                    </p>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-zinc-700">
                      Proposed domain use *
                    </span>

                    <select
                      value={
                        registrantDetails.proposed_usage ?? ''
                      }
                      onChange={(event) =>
                        updateRegistrant(
                          'proposed_usage',
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition focus:border-[#3120ff]"
                    >
                      <option value="">
                        Select how the domain will be used
                      </option>
                      <option value="Website">
                        Website
                      </option>
                      <option value="Web application">
                        Web application
                      </option>
                      <option value="Online store">
                        Online store
                      </option>
                      <option value="Email services">
                        Email services
                      </option>
                      <option value="API / developer service">
                        API / developer service
                      </option>
                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </label>
                </div>
              )}

            {!preparingSelectedDomain &&
              step === 'nameservers' && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-950">
                      Nameservers
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Every domain needs at least two active nameservers. Use the nameservers from your hosting or DNS provider, or keep the Runtime defaults for now.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#3120ff]/15 bg-[#3120ff]/5 p-4">
                    <p className="text-xs font-semibold text-zinc-950">
                      About Runtime nameservers
                    </p>

                    <p className="mt-1.5 text-xs leading-5 text-zinc-600">
                      Domain registration does not currently include web hosting or self-service DNS hosting. Runtime&apos;s default nameservers keep your domain properly delegated while you decide where to host it.
                    </p>

                    <p className="mt-2 text-xs leading-5 text-zinc-600">
                      Already have hosting? Choose your provider&apos;s nameservers below. Need DNS only? Contact Runtime for free manual DNS setup. More DNS tools are coming soon.
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
                          Use Runtime defaults
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Good if you do not have hosting or DNS nameservers yet.
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
                          Use my hosting / DNS nameservers
                        </p>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          Recommended when your hosting or DNS provider has already given you nameservers.
                        </p>
                      </div>
                    </div>
                  </button>

                  {!useDefaultNameservers && (
                    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
                      {customNameservers.map(
                        (
                          value,
                          index
                        ) => (
                          <div
                            key={
                              index
                            }
                            className="grid gap-3"
                          >
                            <Field
                              label={`Nameserver ${index + 1}${
                                index < 2
                                  ? ' *'
                                  : ' (optional)'
                              }`}
                              value={
                                value
                              }
                              placeholder={`ns${index + 1}.example.com`}
                              mono
                              onChange={(
                                newValue
                              ) => {
                                const copy =
                                  [
                                    ...customNameservers,
                                  ];

                                copy[
                                  index
                                ] =
                                  newValue.toLowerCase();

                                setCustomNameservers(
                                  copy
                                );

                                const ipCopy =
                                  [
                                    ...customNameserverIps,
                                  ];

                                ipCopy[
                                  index
                                ] = '';

                                setCustomNameserverIps(
                                  ipCopy
                                );
                              }}
                            />
                          </div>
                        )
                      )}

                      {zispaRequired && (
                        <p className="text-[11px] leading-4 text-zinc-500">
                          Enter only the nameserver names from your hosting or DNS provider. Runtime will find their IP addresses automatically for the registry.
                        </p>
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
                          ? 'Runtime defaults'
                          : 'Hosting / DNS nameservers'
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

                  {selectedDomain.toLowerCase().endsWith('.co.zw') && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-950">
                        .co.zw registration terms
                      </p>
                      <p className="mt-2 text-xs leading-5 text-zinc-600">
                        By placing this order, you confirm that the information provided is correct, that you have the right to use this domain name, and that its registration and use will not infringe another party's rights or be used for an unlawful purpose. Registration remains subject to ZISPA's terms and requirements.
                      </p>
                      <label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-5 text-zinc-700">
                        <input
                          type="checkbox"
                          checked={acceptedCoZwTerms}
                          onChange={(event) => setAcceptedCoZwTerms(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-[#3120ff]"
                        />
                        <span>I confirm the information I provided is correct and I agree to the applicable .co.zw registration terms.</span>
                      </label>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-zinc-950">
                      Payment method
                    </h3>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <GatewayButton
                        active={
                          gateway ===
                          'ecocash_usd'
                        }
                        title="EcoCash USD"
                        description="Manual payment. Admin verifies your screenshot before processing."
                        onClick={() =>
                          setGateway(
                            'ecocash_usd'
                          )
                        }
                      />

                      <GatewayButton
                        active={
                          gateway ===
                          'pesepay'
                        }
                        title="PesePay"
                        description="Choose from the payment methods currently available through PesePay."
                        onClick={() =>
                          setGateway(
                            'pesepay'
                          )
                        }
                      />
                    </div>
                  </div>

                  {gateway ===
                    'ecocash_usd' && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <p className="text-sm font-semibold text-zinc-950">
                        How EcoCash USD works
                      </p>

                      <p className="mt-2 text-xs leading-5 text-zinc-500">
                        Place the order first. Runtime will then show the exact EcoCash USD payment details and your order reference. Your domain will appear in My Domains as awaiting payment until an admin confirms receipt.
                      </p>
                    </div>
                  )}

                  {gateway ===
                    'pesepay' && (
                    <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <div>
                        <p className="text-sm font-semibold text-zinc-950">
                          Pay with PesePay
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          Choose an available payment method. EcoCash and InnBucks use the seamless flow when PesePay supports it. Other methods continue securely on PesePay when a redirect is required.
                        </p>
                      </div>

                      {pesepayMethodsLoading && (
                        <p className="text-xs text-zinc-500">
                          Loading available payment methods...
                        </p>
                      )}

                      {pesepayMethodsError && (
                        <p className="text-xs text-red-600">
                          {pesepayMethodsError}
                        </p>
                      )}

                      {!pesepayMethodsLoading &&
                        !pesepayMethodsError &&
                        pesepayMethods.length === 0 && (
                        <p className="text-xs text-zinc-500">
                          No PesePay payment methods are currently available for USD.
                        </p>
                      )}

                      {pesepayMethods.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {pesepayMethods.map(
                            (method) => (
                              <GatewayButton
                                key={
                                  method.code
                                }
                                active={
                                  pesepayMethodCode ===
                                  method.code
                                }
                                title={
                                  method.name
                                }
                                description={
                                  method.seamless
                                    ? 'Pay without leaving Runtime.'
                                    : 'Continue securely on PesePay to complete payment.'
                                }
                                onClick={() =>
                                  setPesepayMethodCode(
                                    method.code
                                  )
                                }
                              />
                            )
                          )}
                        </div>
                      )}

                      {selectedPesePayMethod?.requiresPhone && (
                        <Field
                          label={`${selectedPesePayMethod.name} phone number`}
                          required
                          value={
                            pesepayPhone
                          }
                          placeholder="0771234567"
                          onChange={
                            setPesepayPhone
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

            {!preparingSelectedDomain &&
              step ===
                'instructions' &&
              placedOrder && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3120ff]/10 text-[#3120ff]">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-zinc-950">
                          {placedOrder.gateway ===
                          'pesepay'
                            ? placedOrder.transactionStatus ===
                              'SUCCESS'
                              ? 'Payment confirmed'
                              : 'Payment requested'
                            : 'Order created'}
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {placedOrder.gateway ===
                          'pesepay'
                            ? placedOrder.transactionStatus ===
                              'SUCCESS'
                              ? 'PesePay confirmed your payment. Runtime can now continue processing your domain registration.'
                              : selectedPesePayMethod
                              ? `Complete the ${selectedPesePayMethod.name} payment request. Runtime will verify the transaction directly with PesePay.`
                              : 'Complete the payment request. Runtime will verify the transaction directly with PesePay.'
                            : 'Your domain is now visible in My Domains as awaiting payment. Registration will only start after the payment is verified.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-zinc-200">
                    <SummaryRow
                      label="Order"
                      value={
                        placedOrder.orderReference
                      }
                      mono
                    />

                    <SummaryRow
                      label="Domain"
                      value={
                        placedOrder.domain
                      }
                      mono
                    />

                    {placedOrder.gateway ===
                    'ecocash_usd' ? (
                      <>
                        <SummaryRow
                          label="Send Money to"
                          value="0783827570"
                          mono
                        />

                        <SummaryRow
                          label="EcoCash name"
                          value="Ngaavongwe Ndasowampange"
                        />
                      </>
                    ) : (
                      <>
                        <SummaryRow
                          label="PesePay reference"
                          value={
                            placedOrder.paymentReference
                          }
                          mono
                        />

                        <SummaryRow
                          label="Status"
                          value={
                            placedOrder.transactionStatus ===
                            'SUCCESS'
                              ? 'Paid'
                              : 'Awaiting confirmation'
                          }
                        />
                      </>
                    )}

                    <div className="flex items-center justify-between gap-4 bg-zinc-50 px-4 py-4">
                      <span className="text-sm font-semibold text-zinc-950">
                        Amount
                      </span>

                      <span className="text-lg font-bold text-[#3120ff]">
                        $
                        {placedOrder.amount.toFixed(
                          2
                        )}{' '}
                        USD
                      </span>
                    </div>
                  </div>

                  {placedOrder.gateway ===
                  'ecocash_usd' ? (
                    <>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-semibold text-zinc-950">
                          After you pay
                        </p>

                        <p className="mt-2 text-xs leading-5 text-zinc-500">
                          Send the EcoCash payment screenshot to Runtime on WhatsApp. An admin will confirm the payment after checking that the money was received.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={
                          openPaymentWhatsApp
                        }
                        className="flex w-full items-center justify-center rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9]"
                      >
                        Send Screenshot on WhatsApp
                      </button>
                    </>
                  ) : (
                    placedOrder.transactionStatus !==
                      'SUCCESS' &&
                    placedOrder.paymentId && (
                      <button
                        type="button"
                        disabled={
                          isProcessing
                        }
                        onClick={async () => {
                          setIsProcessing(
                            true
                          );

                          try {
                            const verified =
                              await verifyPesePayPayment(
                                placedOrder.paymentId!
                              );

                            if (
                              verified?.verified
                            ) {
                              setPlacedOrder(
                                (previous) =>
                                  previous
                                    ? {
                                        ...previous,
                                        transactionStatus:
                                          'SUCCESS',
                                      }
                                    : previous
                              );

                              showNotification(
                                'Payment confirmed successfully.',
                                'success'
                              );
                            } else {
                              showNotification(
                                'Payment is not confirmed yet. Complete the EcoCash prompt and try again.',
                                'info'
                              );
                            }
                          } catch (error) {
                            showNotification(
                              error instanceof Error
                                ? error.message
                                : 'Unable to check payment status.',
                              'error'
                            );
                          } finally {
                            setIsProcessing(
                              false
                            );
                          }
                        }}
                        className="flex w-full items-center justify-center rounded-xl bg-[#3120ff] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isProcessing
                          ? 'Checking payment...'
                          : 'Check Payment Status'}
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={
                      finishPaymentInstructions
                    }
                    className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Go to My Domains
                  </button>
                </div>
              )}

          </div>

          {/* Fixed footer - always visible on mobile */}
          {!preparingSelectedDomain &&
            step !== 'search' &&
            step !== 'instructions' && (
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
                      disabled={
                        isResolvingNameservers
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3120ff] px-4 text-sm font-semibold text-white transition hover:bg-[#2819d9] disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                    >
                      {isResolvingNameservers
                        ? 'Checking nameservers...'
                        : 'Continue'}
                      {!isResolvingNameservers && (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  )}

                  {step === 'payment' && (
                    <button
                      type="button"
                      onClick={completeOrder}
                      disabled={
                        isProcessing ||
                        price === undefined ||
                        (selectedDomain.toLowerCase().endsWith('.co.zw') && !acceptedCoZwTerms)
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
                          {gateway === 'pesepay'
                            ? 'Pay with PesePay'
                            : 'Place Order'}
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
  disabled?: boolean;
  mono?: boolean;
};

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  disabled = false,
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
      disabled={disabled}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
      className={`w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#3120ff] disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 ${
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
  description: string;
  disabled?: boolean;
  onClick: () => void;
};

const GatewayButton: React.FC<GatewayButtonProps> = ({
  active,
  title,
  description,
  disabled = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
      active
        ? 'border-[#3120ff] bg-[#3120ff]/5 text-zinc-950'
        : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
    }`}
  >
    <p className="text-sm font-semibold">
      {title}
    </p>

    <p className="mt-1 text-xs font-normal leading-5 text-zinc-500">
      {description}
    </p>
  </button>
);
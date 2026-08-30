import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  User, 
  Domain, 
  Order, 
  Payment, 
  TldPricing, 
  RegistryRequest, 
  PlatformSettings,
  RegistryAction,
  DomainStatus,
  DomainHistoryItem,
  RegistrantDetails
} from '../types';
import { runtimePricingService } from '../services/RuntimePricingService';
import { registryService } from '../services/RegistryService';
import { orderService } from '../services/OrderService';
import { paymentService } from '../services/PaymentService';
import { registryTemplateService } from '../services/RegistryTemplateService';
import { firebaseAuthService } from '../services/FirebaseAuthService';
import { userService } from '../services/UserService';
import {
  domainRepository,
} from '../services/DomainRepository';

import {
  domainService,
} from '../services/DomainService';

import {
  orderRepository,
} from '../services/OrderRepository';

import {
  paymentRepository,
} from '../services/PaymentRepository';

import {
  adminDomainService,
  AssignDomainInput,
} from '../services/AdminDomainService';

import {
  adminAuditService,
} from '../services/AdminAuditService';

import {
  emailNotificationService,
} from '../services/EmailNotificationService';

import {
  checkoutRepository,
} from '../services/CheckoutRepository';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : '');

const callAdminPaymentApi =
  async (
    path: string,
    body: Record<string, unknown>
  ) => {
    const authUser =
      getAuth().currentUser;

    if (!authUser) {
      throw new Error(
        'Authentication required.'
      );
    }

    const token =
      await authUser.getIdToken();

    const response =
      await fetch(
        `${API_BASE_URL}/api/payments${path}`,
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

    let data: any = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
        `Payment action failed (${response.status}).`
      );
    }

    return data;
  };


interface StoreContextType {
  currentUser: User | null;
  authReady: boolean;
  users: User[];
  domains: Domain[];
  orders: Order[];
  payments: Payment[];
  pricing: TldPricing[];
  registryRequests: RegistryRequest[];
  settings: PlatformSettings;
  activeView: string;
  setActiveView: (view: string) => void;
  adminSubView: string;
  setAdminSubView: (subView: string) => void;
  dashboardSubView: string;
  setDashboardSubView: (subView: string) => void;
  registrationModalOpen: boolean;
  setRegistrationModalOpen: (open: boolean) => void;
  pendingRegisterDomain: string | null;
  setPendingRegisterDomain: (domain: string | null) => void;
  // Auth methods
  login: (
    email: string,
    password: string
  ) => Promise<void>;

  loginWithGoogle: () => Promise<void>;

  resetPassword: (
    email: string
  ) => Promise<void>;

  logout: () => Promise<void>;

  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<boolean>;

  updateCurrentUserProfile: (
    changes: Partial<User>
  ) => Promise<void>;
  
  // Domain actions
  registerNewDomain: (
    domainName: string, 
    registrantType: 'myself' | 'client', 
    ownerDetails: RegistrantDetails, 
    nameservers: string[],
    paymentGateway?: any,
    nameserverIps?: string[]
  ) => Promise<{
    success: boolean;
    domain: Domain;
    order: Order;
    payment?: Payment;
  }>;
  updateDomainNameservers: (
    domainId: string,
    nameservers: string[],
    nameserverIps?: string[]
  ) => Promise<void>;
  requestDomainModify: (domainId: string, updatedOwner: RegistrantDetails, nameservers: string[]) => void;
  requestDomainDelete: (domainId: string, confirmationText: string) => boolean;
  requestDomainTransfer: (domainName: string, authCode: string) => Promise<void>;
  updateDomainStatus: (
    domainId: string,
    status: DomainStatus
  ) => Promise<void>;
  renewDomain: (domainId: string, years: number, paymentGateway?: any) => Promise<void>;

  // Admin payment actions
  approveManualPayment: (
    paymentId: string,
    transactionId?: string
  ) => Promise<void>;
  rejectManualPayment: (
    paymentId: string,
    reason?: string
  ) => Promise<void>;

  replacePaidDomain: (
    domainId: string,
    replacementDomainName: string,
    reason?: string
  ) => Promise<Domain>;

  replacePaidDomainWithExisting: (
    domainId: string,
    existingDomainId: string,
    reason?: string
  ) => Promise<Domain>;

  // Order actions
  cancelOrder: (
    orderId: string
  ) => Promise<void>;

  deleteOrder: (
    orderId: string
  ) => Promise<void>;

  createPaymentForOrder: (
    orderId: string
  ) => Promise<Payment>;

  // Admin Registry actions
  submitRegistryRequest: (requestId: string) => Promise<void>;
  confirmRegistryRequest: (requestId: string) => void;
  createManualRegistryRequest: (domainId: string, action: RegistryAction) => void;
  // Admin Pricing actions
  updateTldPrice: (id: string, runtimePrice: number, renewalPrice: number, active: boolean) => void;
  syncUpstreamPrices: () => Promise<void>;
  // Settings
  updateSettings: (newSettings: Partial<PlatformSettings>) => void;
  // Notifications
  notification: { message: string; type: 'success' | 'info' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'error') => void;
  
  assignDomainToCustomer: (
    input: Omit<
      AssignDomainInput,
      'admin'
    >
  ) => Promise<Domain>;

  openCustomerAccount: (
    userId: string
  ) => Promise<void>;

  adminCustomerId:
    string | null;

  closeCustomerAccount:
    () => void;
  }

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SEED_SETTINGS: PlatformSettings = {
  default_nameservers: [
    'ns1.ngaatec.com',
    'ns2.ngaatec.com',
  ],
  registry_email_from: 'dns@ngaatec.com',
  registry_email_to: 'admin@zispa.org.zw',
  auto_submit_registry: false,
  platform_name: 'Runtime',
  operator_name: 'Ngaatec Private Limited',
  operator_phone: '+263783827570',
  support_email: 'support@runtime.co.zw',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [domains, setDomains] =
  useState<Domain[]>([]);
  
  const [orders, setOrders] = useState<Order[]>([]);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [pricing, setPricing] = useState<TldPricing[]>(() => {
    const saved = localStorage.getItem('runtime_pricing');
    return saved ? JSON.parse(saved) : runtimePricingService.getInitialPricing();
  });

  const [registryRequests, setRegistryRequests] = useState<RegistryRequest[]>([]);

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem('runtime_settings');

    if (!saved) {
      return SEED_SETTINGS;
    }

    try {
      const parsed = JSON.parse(saved);

      return {
        ...SEED_SETTINGS,
        ...parsed,

        // Runtime's current authoritative DNS defaults.
        default_nameservers: [
          'ns1.ngaatec.com',
          'ns2.ngaatec.com',
        ],

        // Current registrar dispatch details.
        registry_email_from: 'dns@ngaatec.com',
        registry_email_to: 'admin@zispa.org.zw',
      };
    } catch {
      return SEED_SETTINGS;
    }
  });

  const [activeView, setActiveViewState] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/admin')) return 'admin';
    if (path === '/pricing') return 'pricing';
    if (path === '/docs') return 'docs';
    if (path === '/platform') return 'platform';
    return 'home';
  });
  const [adminSubView, setAdminSubView] = useState<string>('dashboard'); // 'dashboard' | 'registry' | 'domains' | 'pricing' | 'orders' | 'nameservers' | 'settings' | 'future_services'
  const [dashboardSubView, setDashboardSubView] = useState<string>('overview'); // 'overview' | 'domains' | 'billing' | 'account' | 'build_projects' | 'build_deployments' | 'build_databases' | 'develop_keys' | 'develop_webhooks' | 'develop_logs'
  const [registrationModalOpen, setRegistrationModalOpen] = useState<boolean>(false);
  const [pendingRegisterDomain, setPendingRegisterDomain] = useState<string | null>(null);
  const [adminCustomerId, setAdminCustomerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
  return firebaseAuthService.onUserChanged(
    async (user) => {
      try {
        if (!user) {
          setCurrentUser(
            null
          );

          setAuthReady(
            true
          );

          return;
        }

        const profile =
          await userService.ensureUser(
            user
          );

        setCurrentUser(
          profile
        );
      } catch (
        error
      ) {
        console.error(
          'Failed to load user profile:',
          error
        );

        setCurrentUser(
          user
        );
      } finally {
        setAuthReady(
          true
        );
      }
    }
  );
}, []);

/*
 * ----------------------------------------------------------
 * LOAD USERS FOR SUPER ADMIN
 * ----------------------------------------------------------
 */

useEffect(() => {
  const loadUsers = async () => {
    // No logged-in user
    if (!currentUser) {
      setUsers([]);
      return;
    }

    // Only super admin should load all platform users
    if (currentUser.role !== 'super_admin') {
      setUsers([]);
      return;
    }

    try {
      const allUsers =
        await userService.getAllUsers();

      setUsers(allUsers);
    } catch (error) {
      console.error(
        'Failed to load admin users:',
        error
      );

      setUsers([]);
    }
  };

  loadUsers();
}, [currentUser]);

  const setActiveView = (view: string) => {
    const routes: Record<string, string> = {
      home: '/', pricing: '/pricing', docs: '/docs', platform: '/platform',
      dashboard: '/dashboard', admin: '/admin'
    };
    const nextPath = routes[view] || '/';
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    setActiveViewState(view);
  };

  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname;
      setActiveViewState(path.startsWith('/dashboard') ? 'dashboard' : path.startsWith('/admin') ? 'admin' : path === '/pricing' ? 'pricing' : path === '/docs' ? 'docs' : path === '/platform' ? 'platform' : 'home');
    };
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
  const loadDomains = async () => {
    if (!currentUser) {
      setDomains([]);
      return;
    }

    try {
      if (
        currentUser.role ===
        'super_admin'
      ) {
        const allDomains =
          await domainRepository.getAllDomains();

        setDomains(
          allDomains
        );

        return;
      }

      const userDomains =
        await domainRepository.getDomainsForUser(
          currentUser.id
        );

      setDomains(
        userDomains
      );
    } catch (error) {
      console.error(
        'Failed to load domains:',
        error
      );

      setDomains([]);
    }
  };

  loadDomains();
}, [currentUser]);

useEffect(() => {
  const loadOrders = async () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    try {
      const loadedOrders =
        currentUser.role === 'super_admin'
          ? await orderRepository.getAllOrders()
          : await orderRepository.getOrdersForUser(
              currentUser.id
            );

      setOrders(loadedOrders);
    } catch (error) {
      console.error(
        'Failed to load orders:',
        error
      );

      setOrders([]);
    }
  };

  void loadOrders();
}, [currentUser]);

useEffect(() => {
  const loadPayments = async () => {
    if (!currentUser) {
      setPayments([]);
      return;
    }

    try {
      const loadedPayments =
        currentUser.role === 'super_admin'
          ? await paymentRepository.getAllPayments()
          : await paymentRepository.getPaymentsForUser(
              currentUser.id
            );

      setPayments(loadedPayments);
    } catch (error) {
      console.error(
        'Failed to load payments:',
        error
      );

      setPayments([]);
    }
  };

  void loadPayments();
}, [currentUser]);

  // Sync to local storage
useEffect(() => {
    localStorage.setItem('runtime_pricing', JSON.stringify(pricing));
  }, [pricing]);
useEffect(() => {
    localStorage.setItem('runtime_settings', JSON.stringify(settings));
  }, [settings]);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const login = async (
  email: string,
  password: string
) => {
  const authUser =
    await firebaseAuthService.signIn(
      email,
      password
    );

  const profile =
    await userService.ensureUser(
      authUser
    );

  setCurrentUser(
    profile
  );

  setActiveView(
    'dashboard'
  );

  showNotification(
    `Welcome back, ${profile.name}`,
    'success'
  );
};

  const loginWithGoogle = async () => {
  const authUser =
    await firebaseAuthService.signInWithGoogle();

  const profile =
    await userService.ensureUser(
      authUser
    );

  setCurrentUser(
    profile
  );

  setActiveView(
    'dashboard'
  );
};

  const resetPassword = async (email: string) => {
    await firebaseAuthService.resetPassword(email);
    showNotification('Password reset email sent.', 'success');
  };

  const logout = async () => {
    await firebaseAuthService.signOut();
    setCurrentUser(null);
    setActiveView('home');
    showNotification('Logged out of Runtime session.', 'info');
  };

  

  const register = async (name: string, email: string, password: string) => {
    const user = await firebaseAuthService.signUp(name, email, password);
    if (user) {
      setCurrentUser(user);
      setActiveView('dashboard');
      showNotification(`Account created successfully for ${email}`, 'success');
      return true;
    }
    showNotification('Account created. Check your email to confirm it, then sign in.', 'info');
    return false;
  };

  const updateCurrentUserProfile = async (
  changes: Partial<User>
) => {
  if (!currentUser) {
    throw new Error(
      'You must be signed in to update your profile.'
    );
  }

  await userService.updateProfile(
    currentUser.id,
    changes
  );

  setCurrentUser((previous) => {
    if (!previous) {
      return previous;
    }

    return {
      ...previous,
      ...changes,
    };
  });

  showNotification(
    'Profile updated successfully.',
    'success'
  );
};

const getDomainOrderDetails = async (
  domainName: string
) => {
  const normalized = domainService.cleanDomain(domainName);

  const fixedPricing: Record<
    string,
    {
      register: number;
      renew: number;
      transfer: number;
    }
  > = {
    '.co.zw': {
      register: 2,
      renew: 2,
      transfer: 2,
    },
    '.org.zw': {
      register: 3,
      renew: 3,
      transfer: 3,
    },
    '.ac.zw': {
      register: 3,
      renew: 3,
      transfer: 3,
    },
  };

  const fixedTld = Object.keys(fixedPricing)
    .sort((a, b) => b.length - a.length)
    .find((tld) => normalized.endsWith(tld));

  if (fixedTld) {
    const prices = fixedPricing[fixedTld];

    return {
      tld: fixedTld,
      registrationPrice: prices.register,
      renewalPrice: prices.renew,
      transferPrice: prices.transfer,
      processingType: 'zispa' as const,
    };
  }

  const pricing = await domainService.getPricing();

  const match = [...pricing]
    .sort((a, b) => b.tld.length - a.tld.length)
    .find((item) => normalized.endsWith(item.tld));

  if (!match || match.register === undefined) {
    throw new Error(
      'This domain extension is not currently available for registration.'
    );
  }

  return {
    tld: match.tld,
    registrationPrice: match.register,
    renewalPrice: match.renew ?? match.register,
    transferPrice: match.transfer ?? match.register,
    processingType: 'manual' as const,
  };
};

  const registerNewDomain = async (
  domainName: string,
  registrantType: 'myself' | 'client',
  ownerDetails: RegistrantDetails,
  nameservers: string[],
  gateway: any = 'checkout',
  nameserverIps: string[] = []
) => {
  if (!currentUser) {
    throw new Error(
      'You must be signed in to register a domain.'
    );
  }

  const normalizedDomain =
    domainService.cleanDomain(
      domainName
    );

  const {
    tld,
    registrationPrice,
    renewalPrice,
    processingType,
  } =
    await getDomainOrderDetails(
      normalizedDomain
    );

  /*
   * Create the unpaid order first.
   */
  const order =
    orderService.createDomainRegistrationOrder(
      currentUser.id,
      currentUser.email,
      normalizedDomain,
      registrationPrice,
      'USD'
    );

  const now =
    new Date().toISOString();

  /*
   * PesePay payments are created by the
   * secure Runtime backend.
   *
   * Manual EcoCash payments continue to
   * be created here.
   */
  const payment =
    gateway === 'checkout' ||
    gateway === 'pesepay'
      ? undefined
      : await paymentService.processCheckout(
          order.id,
          registrationPrice,
          'USD',
          currentUser.id,
          gateway
        );

  /*
   * Create the pending domain.
   *
   * payment_id exists immediately for
   * manual payments. For PesePay it will
   * be created by the backend.
   */
  const pendingDomain = {
    id:
      'dom-' +
      Math.random()
        .toString(36)
        .substring(2, 10),

    domain_name:
      normalizedDomain,

    tld,

    user_id:
      currentUser.id,

    user_email:
      currentUser.email,

    status:
      'pending_payment',

    nameservers:
      nameservers.length > 0
        ? nameservers
        : [
            ...settings.default_nameservers,
          ],

    nameserver_ips:
      nameserverIps,

    auto_renew:
      true,

    renewal_price:
      renewalPrice,

    currency:
      'USD',

    registrant_type:
      registrantType,

    owner_details:
      ownerDetails,

    processing_type:
      processingType,

    registration_price:
      registrationPrice,

    order_id:
      order.id,

    ...(payment
      ? {
          payment_id:
            payment.id,
        }
      : {}),

    history: [
      {
        id:
          'hist-' +
          Math.random()
            .toString(36)
            .substring(2, 9),

        domain_id:
          normalizedDomain,

        action:
          'NEW' as const,

        description:
          `Order ${order.reference} created. Awaiting payment verification.`,

        status:
          'pending_payment',

        actor:
          currentUser.email,

        created_at:
          now,
      },
    ],

    created_at:
      now,

    updated_at:
      now,
  } as Domain & {
    processing_type:
      'zispa' | 'manual';

    registration_price:
      number;

    order_id:
      string;

    payment_id?:
      string;
  };

  /*
   * Persist checkout.
   *
   * PesePay:
   * order + domain only.
   *
   * Manual EcoCash:
   * order + payment + domain.
   */
  if (
    gateway === 'checkout' ||
    gateway === 'pesepay'
  ) {
    await checkoutRepository
      .createDomainRegistrationWithoutPayment(
        order,
        pendingDomain
      );
  } else {
    if (!payment) {
      throw new Error(
        'Payment could not be created.'
      );
    }

    await checkoutRepository
      .createDomainRegistration(
        order,
        payment,
        pendingDomain
      );
  }

  setOrders((prev) => [
    order,
    ...prev,
  ]);

  if (payment) {
    setPayments((prev) => [
      payment,
      ...prev,
    ]);
  }

  setDomains((prev) => [
    pendingDomain,
    ...prev,
  ]);

  emailNotificationService.notifyQuietly(
    'domain_order_created',
    {
      email:
        currentUser.email,

      name:
        ownerDetails.full_name ||
        currentUser.name,

      orderReference:
        order.reference,

      paymentReference:
        payment?.reference ||
        order.reference,

      domainName:
        pendingDomain.domain_name,

      amount:
        order.total,
    }
  );

  showNotification(
    `Order ${order.reference} created. Complete your payment to start registration.`,
    'success'
  );

  return {
    success: true,
    domain:
      pendingDomain,
    order,
    payment,
  };
};

  const updateDomainNameservers =
    async (
      domainId: string,
      nameservers: string[],
      nameserverIps: string[] = []
    ): Promise<void> => {
      const domain =
        domains.find(
          (item) =>
            item.id === domainId
        );

      if (!domain) {
        throw new Error(
          'Domain not found.'
        );
      }

      const normalizedNameservers =
        nameservers
          .map(
            (item) =>
              item
                .trim()
                .replace(/\.$/, '')
                .toLowerCase()
          )
          .filter(Boolean);

      const normalizedIps =
        nameserverIps
          .slice(
            0,
            normalizedNameservers.length
          )
          .map(
            (item) =>
              item.trim()
          );

      const currentNameservers =
        (domain.nameservers || [])
          .map(
            (item) =>
              item
                .trim()
                .replace(/\.$/, '')
                .toLowerCase()
          )
          .filter(Boolean);

      const currentIps =
        (domain.nameserver_ips || [])
          .slice(
            0,
            currentNameservers.length
          )
          .map(
            (item) =>
              item.trim()
          );

      const sameNameservers =
        JSON.stringify(
          currentNameservers
        ) ===
        JSON.stringify(
          normalizedNameservers
        );

      const sameIps =
        JSON.stringify(
          currentIps
        ) ===
        JSON.stringify(
          normalizedIps
        );

      if (
        sameNameservers &&
        sameIps
      ) {
        showNotification(
          'These nameservers are already saved.',
          'info'
        );
        return;
      }

      const now =
        new Date()
          .toISOString();

      const historyId =
        'hist-ns-' +
        crypto.randomUUID();

      const updated: Domain = {
        ...domain,
        nameservers:
          normalizedNameservers,
        nameserver_ips:
          normalizedIps,
        updated_at:
          now,
        history: [
          ...(domain.history || []),
          {
            id:
              historyId,
            domain_id:
              domain.id,
            action:
              'MODIFY' as const,
            description:
              'Nameserver change requested.',
            status:
              'pending',
            actor:
              currentUser?.email ||
              'customer',
            created_at:
              now,
          },
        ],
      };

      /*
       * IMPORTANT:
       * Persist first. Do not show success, create a registry request,
       * mutate local state or send email until Firestore confirms the save.
       */
      await domainRepository
        .updateDomain(
          domainId,
          {
            nameservers:
              updated.nameservers,
            nameserver_ips:
              updated.nameserver_ips,
            history:
              updated.history,
            updated_at:
              updated.updated_at,
          }
        );

      setDomains(
        (prev) =>
          prev.map(
            (item) =>
              item.id ===
              domainId
                ? updated
                : item
          )
      );

      if (
        (domain as any)
          .processing_type ===
          'zispa' ||
        domain.domain_name
          .toLowerCase()
          .endsWith('.co.zw')
      ) {
        const request =
          registryService
            .createRequest(
              updated,
              'M',
              currentUser
                ?.email ||
                'customer'
            );

        setRegistryRequests(
          (prev) => [
            request,
            ...prev,
          ]
        );
      }

      /*
       * Email is now sent only after the domain update is safely stored.
       * Backend nameserver-email dedupe protects against repeated requests.
       */
      emailNotificationService
        .notifyQuietly(
          'nameserver_change_requested',
          {
            email:
              domain.user_email,
            name:
              domain
                .owner_details
                ?.full_name,
            domainName:
              domain.domain_name,
            nameservers:
              normalizedNameservers,
          }
        );

      showNotification(
        'Nameserver change request received.',
        'success'
      );
    };

  const requestDomainModify = (
    domainId: string,
    updatedOwner: RegistrantDetails,
    nameservers: string[]
  ) => {
    const domain = domains.find((item) => item.id === domainId);

    if (!domain) {
      showNotification('Domain not found.', 'error');
      return;
    }

    const now = new Date().toISOString();

    const updated: Domain = {
      ...domain,
      owner_details: updatedOwner,
      nameservers,
      updated_at: now,
      history: [
        ...domain.history,
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: domain.id,
          action: 'MODIFY',
          description: 'Domain details update requested.',
          status: 'pending',
          actor: currentUser?.email || 'customer',
          created_at: now,
        },
      ],
    };

    setDomains((prev) =>
      prev.map((item) =>
        item.id === domainId ? updated : item
      )
    );

    void domainRepository
      .updateDomain(domainId, {
        owner_details: updated.owner_details,
        nameservers: updated.nameservers,
        history: updated.history,
        updated_at: updated.updated_at,
      })
      .catch((error) => {
        console.error('Failed to save domain modification:', error);
        showNotification(
          'Unable to save the domain update.',
          'error'
        );
      });

    if ((domain as any).processing_type === 'zispa') {
      const request = registryService.createRequest(
        updated,
        'M',
        currentUser?.email || 'customer'
      );

      setRegistryRequests((prev) => [
        request,
        ...prev,
      ]);
    }

    emailNotificationService.notifyQuietly(
      'domain_modify_requested',
      {
        email:
          domain.user_email,

        name:
          updatedOwner.full_name ||
          domain.owner_details
            ?.full_name,

        domainName:
          domain.domain_name,

        nameservers,
      }
    );

    showNotification(
      'Domain update request received.',
      'success'
    );
  };

  const requestDomainDelete = (
    domainId: string,
    confirmationText: string
  ): boolean => {
    const domain = domains.find((item) => item.id === domainId);

    if (!domain) {
      return false;
    }

    if (
      confirmationText.trim().toLowerCase() !==
      domain.domain_name.toLowerCase()
    ) {
      showNotification(
        `Confirmation mismatch. You must type "${domain.domain_name}" exactly.`,
        'error'
      );

      return false;
    }

    const now = new Date().toISOString();

    const updated: Domain = {
      ...domain,
      status: 'pending_delete',
      updated_at: now,
      history: [
        ...domain.history,
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: domain.id,
          action: 'DELETE',
          description: 'Domain cancellation request received.',
          status: 'pending_delete',
          actor: currentUser?.email || 'customer',
          created_at: now,
        },
      ],
    };

    setDomains((prev) =>
      prev.map((item) =>
        item.id === domainId ? updated : item
      )
    );

    void domainRepository
      .updateDomain(domainId, {
        status: updated.status,
        history: updated.history,
        updated_at: updated.updated_at,
      })
      .catch((error) => {
        console.error('Failed to save domain cancellation:', error);
        showNotification(
          'Unable to save the cancellation request.',
          'error'
        );
      });

    if ((domain as any).processing_type === 'zispa') {
      const request = registryService.createRequest(
        updated,
        'D',
        currentUser?.email || 'customer'
      );

      setRegistryRequests((prev) => [
        request,
        ...prev,
      ]);
    }

    emailNotificationService.notifyQuietly(
      'domain_delete_requested',
      {
        email:
          domain.user_email,

        name:
          domain.owner_details
            ?.full_name,

        domainName:
          domain.domain_name,
      }
    );

    showNotification(
      `Cancellation request for ${domain.domain_name} has been received.`,
      'info'
    );

    return true;
  };

  const requestDomainTransfer = async (
    domainName: string,
    authCode: string
  ) => {
    if (!currentUser) {
      throw new Error('You must be signed in to transfer a domain.');
    }

    const normalizedDomain = domainService.cleanDomain(domainName);

    const {
      tld,
      renewalPrice,
      transferPrice,
      processingType,
    } = await getDomainOrderDetails(normalizedDomain);

    const now = new Date().toISOString();

    const newDomain = {
      id: 'dom-' + Math.random().toString(36).substring(2, 10),
      domain_name: normalizedDomain,
      tld,
      user_id: currentUser.id,
      user_email: currentUser.email,
      status: 'pending_transfer' as DomainStatus,
      nameservers: [...settings.default_nameservers],
      auto_renew: true,
      renewal_price: renewalPrice,
      currency: 'USD',
      registrant_type: 'myself' as const,
      owner_details: {
        full_name: currentUser.name || 'Customer',
        org_name: currentUser.organisation || '',
        physical_address: '',
        postal_address: '',
        city: '',
        country: 'Zimbabwe',
        phone: currentUser.phone || '',
        email: currentUser.email,
        org_description: '',
        proposed_usage: '',
      },

      processing_type: processingType,
      registration_price: transferPrice,

      history: [
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: normalizedDomain,
          action: 'TRANSFER' as const,
          description: 'Domain transfer request received and is being processed.',
          status: 'pending_transfer',
          actor: currentUser.email,
          created_at: now,
        },
      ],

      created_at: now,
      updated_at: now,
    } as Domain & {
      processing_type: 'zispa' | 'manual';
      registration_price: number;
    };

    // authCode is intentionally not written into the customer-readable
    // domain record. A dedicated secure transfer-request store can be
    // added later for transfer secrets.
    void authCode;

    await domainRepository.createDomain(newDomain);

    if (processingType === 'zispa') {
      const request = registryService.createRequest(
        newDomain,
        'T',
        currentUser.email
      );

      setRegistryRequests((prev) => [
        request,
        ...prev,
      ]);
    }

    setDomains((prev) => [
      newDomain,
      ...prev,
    ]);

    emailNotificationService.notifyQuietly(
      'domain_transfer_requested',
      {
        email:
          currentUser.email,

        name:
          currentUser.name,

        domainName:
          normalizedDomain,
      }
    );

    showNotification(
      `Transfer request for ${normalizedDomain} has been received.`,
      'success'
    );
  };

  const updateDomainStatus =
    async (
      domainId: string,
      status: DomainStatus
    ): Promise<void> => {
      if (
        !currentUser ||
        currentUser.role !==
          'super_admin'
      ) {
        throw new Error(
          'Only a super admin can update domain status.'
        );
      }

      const domain =
        domains.find(
          (item) =>
            item.id ===
            domainId
        );

      if (!domain) {
        throw new Error(
          'Domain not found.'
        );
      }

      /*
       * IMPORTANT:
       * Do not update React state first.
       *
       * The previous implementation changed the domain in memory and
       * then attempted the Firestore write. If Firestore rejected it,
       * a cancelled/rejected domain could disappear from the UI even
       * though the database still contained the old status.
       *
       * The authenticated backend is authoritative here. It uses the
       * Admin SDK, persists the status first, and only then do we reload
       * the domain collection.
       */
      const result =
        await callAdminPaymentApi(
          '/admin/domain-status',
          {
            domainId,
            status,
          }
        );

      const refreshedDomains =
        await domainRepository
          .getAllDomains();

      setDomains(
        refreshedDomains
      );

      const updated =
        refreshedDomains.find(
          (item) =>
            item.id ===
            domainId
        );

      if (!updated) {
        throw new Error(
          'The domain status was saved but the updated domain could not be reloaded.'
        );
      }

      /*
       * Keep the existing activation email behaviour, but send only
       * after the backend has successfully persisted "active".
       */
      if (
        status === 'active'
      ) {
        emailNotificationService
          .notifyQuietly(
            'domain_activated',
            {
              email:
                updated.user_email,

              name:
                updated.owner_details
                  ?.full_name,

              domainName:
                updated.domain_name,

              registeredAt:
                updated.registered_at,

              renewalDate:
                updated.expires_at,
            }
          );
      }

      showNotification(
        status ===
          'registry_rejected'
          ? `${updated.domain_name} marked as registry rejected and moved to Archived / rejected.`
          : status ===
              'cancelled'
            ? `${updated.domain_name} cancelled and moved to Archived / rejected.`
            : status ===
                'active'
              ? `${updated.domain_name} is now active.`
              : `Domain status updated to ${status.replace(/_/g, ' ')}.`,
        'success'
      );

      void result;
    };

  const renewDomain = async (
  domainId: string,
  years: number,
  gateway: any = 'ecocash_usd'
) => {
  if (!currentUser) {
    throw new Error(
      'You must be signed in to renew a domain.'
    );
  }

  if (
    !Number.isInteger(years) ||
    years < 1 ||
    years > 10
  ) {
    throw new Error(
      'Choose between 1 and 10 renewal years.'
    );
  }

  if (
    gateway !== 'ecocash_usd'
  ) {
    throw new Error(
      'This payment method is not available yet.'
    );
  }

  const domain =
    domains.find(
      (item) =>
        item.id === domainId
    );

  if (!domain) {
    throw new Error(
      'Domain not found.'
    );
  }

  if (
    domain.user_id !==
      currentUser.id &&
    currentUser.role !==
      'super_admin'
  ) {
    throw new Error(
      'You cannot renew this domain.'
    );
  }

  if (
    domain.status !==
      'active' &&
    domain.status !==
      'expired'
  ) {
    throw new Error(
      'This domain cannot be renewed yet.'
    );
  }

  const yearlyRate =
    domain.renewal_price;

  if (
    typeof yearlyRate !==
      'number' ||
    yearlyRate <= 0
  ) {
    throw new Error(
      'Renewal pricing is unavailable for this domain.'
    );
  }

  const total =
    yearlyRate * years;

  /*
   * Create pending order.
   */
  const order =
    orderService.createDomainRegistrationOrder(
      currentUser.id,
      currentUser.email,
      domain.domain_name,
      total,
      domain.currency || 'USD'
    );

  /*
   * Convert the generic domain order
   * into a renewal order.
   */
  order.items = order.items.map(
    (item) => ({
      ...item,

      description:
        `Domain Renewal: ${domain.domain_name} (${years} ${
          years === 1
            ? 'Year'
            : 'Years'
        } @ $${yearlyRate.toFixed(
          2
        )}/yr)`,

      quantity:
        years,

      unit_price:
        yearlyRate,

      total,
    })
  );

  order.subtotal =
    total;

  order.total =
    total;

  /*
   * Internal renewal metadata.
   *
   * Admin uses this after payment
   * verification.
   */
  (
    order as Order & {
      purpose?: string;
      domain_id?: string;
      renewal_years?: number;
    }
  ).purpose =
    'domain_renewal';

  (
    order as Order & {
      domain_id?: string;
    }
  ).domain_id =
    domain.id;

  (
    order as Order & {
      renewal_years?: number;
    }
  ).renewal_years =
    years;

  /*
   * Create pending EcoCash payment.
   *
   * DO NOT verify here.
   */
  const payment =
    await paymentService.processCheckout(
      order.id,
      total,
      domain.currency ||
        'USD',
      currentUser.id,
      'ecocash_usd'
    );

  /*
   * Save only order + payment.
   *
   * DO NOT:
   * - mark order paid
   * - extend expiry
   * - change domain status
   */
  /*
   * Keep renewal order + payment consistent as well.
   * Both documents are created, or neither is.
   */
  await checkoutRepository
    .createOrderPayment(
      order,
      payment
    );

  setOrders((prev) => [
    order,
    ...prev,
  ]);

  setPayments((prev) => [
    payment,
    ...prev,
  ]);

  emailNotificationService.notifyQuietly(
    'renewal_order_created',
    {
      email:
        currentUser.email,

      name:
        currentUser.name,

      orderReference:
        order.reference,

      paymentReference:
        payment.reference,

      domainName:
        domain.domain_name,

      amount:
        total,

      years,
    }
  );

  showNotification(
    `Renewal order ${order.reference} created. Pay $${total.toFixed(
      2
    )} USD using EcoCash and send your screenshot to Runtime.`,
    'success'
  );
};

  const approveManualPayment =
    async (
      paymentId: string,
      transactionId?: string
    ) => {
      if (
        !currentUser ||
        currentUser.role !==
          'super_admin'
      ) {
        throw new Error(
          'Only a super admin can approve payments.'
        );
      }

      const payment =
        payments.find(
          (item) =>
            item.id ===
            paymentId
        );

      if (!payment) {
        throw new Error(
          'Payment not found.'
        );
      }

      if (
        payment.gateway !==
        'ecocash_usd'
      ) {
        throw new Error(
          'Only manual EcoCash USD payments can be approved manually.'
        );
      }

      const purpose =
        payment.purpose ===
        'wallet_topup'
          ? 'wallet_topup'
          : 'order_payment';

      /*
       * Runtime Credit top-ups intentionally have no order.
       * Only ordinary order payments require one.
       */
      const order =
        purpose ===
          'order_payment'
          ? orders.find(
              (item) =>
                item.id ===
                payment.order_id
            )
          : undefined;

      if (
        purpose ===
          'order_payment' &&
        !order
      ) {
        throw new Error(
          'The order linked to this payment was not found.'
        );
      }

      const result =
        await callAdminPaymentApi(
          '/admin/manual/approve',
          {
            paymentId,
            ...(transactionId
              ? { transactionId }
              : {}),
          }
        );

      /*
       * Backend settlement is authoritative for both:
       * - order_payment
       * - wallet_topup
       */
      const [
        refreshedPayments,
        refreshedOrders,
        refreshedDomains,
      ] =
        await Promise.all([
          paymentRepository
            .getAllPayments(),
          orderRepository
            .getAllOrders(),
          domainRepository
            .getAllDomains(),
        ]);

      setPayments(
        refreshedPayments
      );

      setOrders(
        refreshedOrders
      );

      setDomains(
        refreshedDomains
      );

      const approvedPayment =
        refreshedPayments.find(
          (item) =>
            item.id === paymentId
        ) || payment;

      /*
       * Wallet settlement is complete at this point.
       * There is deliberately no domain/order fulfillment.
       */
      if (
        purpose ===
        'wallet_topup'
      ) {
        showNotification(
          `Runtime Credit top-up of $${Number(
            approvedPayment.amount || 0
          ).toFixed(2)} approved.`,
          'success'
        );

        return;
      }

      /*
       * From here onward this is guaranteed to be an
       * order payment with an order.
       */
      if (!order) {
        return;
      }

      const paidOrder =
        refreshedOrders.find(
          (item) =>
            item.id === order.id
        ) || order;

      const fulfilledDomain =
        refreshedDomains.find(
          (item) =>
            item.id ===
              result?.fulfillment
                ?.resourceId ||
            (item as any)
              .order_id ===
              order.id ||
            item.id ===
              (order as any)
                .domain_id
        );

      if (
        (order as any).purpose ===
        'domain_renewal'
      ) {
        const years =
          Number(
            (order as any)
              .renewal_years || 1
          );

        if (fulfilledDomain) {
          emailNotificationService
            .notifyQuietly(
              'renewal_completed',
              {
                email:
                  fulfilledDomain
                    .user_email,
                name:
                  fulfilledDomain
                    .owner_details
                    ?.full_name,
                orderReference:
                  paidOrder.reference,
                paymentReference:
                  approvedPayment
                    .reference,
                domainName:
                  fulfilledDomain
                    .domain_name,
                amount:
                  approvedPayment
                    .amount,
                years,
                renewalDate:
                  fulfilledDomain
                    .expires_at,
              }
            );

          showNotification(
            `${fulfilledDomain.domain_name} renewed until ${
              fulfilledDomain.expires_at
                ? new Date(
                    fulfilledDomain.expires_at
                  ).toLocaleDateString()
                : 'its new renewal date'
            }.`,
            'success'
          );
        } else {
          showNotification(
            'Renewal payment approved.',
            'success'
          );
        }

        return;
      }

      if (!fulfilledDomain) {
        showNotification(
          'Payment approved. The paid order is ready for fulfillment.',
          'success'
        );

        return;
      }

      /*
       * Preserve the existing registry-queue UI behaviour.
       */
      if (
        (fulfilledDomain as any)
          .processing_type ===
        'zispa'
      ) {
        const existing =
          registryRequests.some(
            (request) =>
              request.domain_id ===
                fulfilledDomain.id &&
              request.action ===
                'N'
          );

        if (!existing) {
          const registryRequest =
            registryService.createRequest(
              fulfilledDomain,
              'N',
              currentUser.email
            );

          registryRequest.payment_reference =
            approvedPayment.reference;

          setRegistryRequests(
            (prev) => [
              registryRequest,
              ...prev,
            ]
          );
        }
      }

      emailNotificationService
        .notifyQuietly(
          'payment_approved',
          {
            email:
              fulfilledDomain
                .user_email,
            name:
              fulfilledDomain
                .owner_details
                ?.full_name,
            orderReference:
              paidOrder.reference,
            paymentReference:
              approvedPayment
                .reference,
            domainName:
              fulfilledDomain
                .domain_name,
            amount:
              approvedPayment.amount,
          }
        );

      showNotification(
        `Payment approved for ${fulfilledDomain.domain_name}. Registration can now be processed.`,
        'success'
      );
    };

  const replacePaidDomain =
    async (
      domainId: string,
      replacementDomainName: string,
      reason:
        string =
          'Registry rejected the original domain.'
    ): Promise<Domain> => {
      if (
        !currentUser ||
        currentUser.role !==
          'super_admin'
      ) {
        throw new Error(
          'Only a super admin can replace a paid domain.'
        );
      }

      const normalized =
        domainService.cleanDomain(
          replacementDomainName
        );

      if (
        !normalized ||
        !normalized.includes('.')
      ) {
        throw new Error(
          'Enter a valid replacement domain.'
        );
      }

      const originalDomain =
        domains.find(
          (item) =>
            item.id ===
            domainId
        );

      if (!originalDomain) {
        throw new Error(
          'Original domain not found.'
        );
      }

      const originalOrder =
        orders.find(
          (item) =>
            item.id ===
            originalDomain.order_id
        );

      const verifiedPayments =
        originalOrder
          ? payments.filter(
              (item) =>
                item.order_id ===
                  originalOrder.id &&
                item.status ===
                  'verified'
            )
          : [];

      const existingPaymentReference =
        verifiedPayments
          .map(
            (item) =>
              item.reference
          )
          .filter(Boolean)
          .join(', ') ||
        originalDomain.payment_id ||
        undefined;

      const result =
        await callAdminPaymentApi(
          '/admin/domain-replacement',
          {
            domainId,
            replacementDomainName:
              normalized,
            reason,
          }
        );

      const [
        refreshedPayments,
        refreshedOrders,
        refreshedDomains,
      ] =
        await Promise.all([
          paymentRepository
            .getAllPayments(),
          orderRepository
            .getAllOrders(),
          domainRepository
            .getAllDomains(),
        ]);

      setPayments(
        refreshedPayments
      );

      setOrders(
        refreshedOrders
      );

      setDomains(
        refreshedDomains
      );

      const replacement =
        refreshedDomains.find(
          (item) =>
            item.id ===
            result?.replacementDomain?.id
        );

      if (!replacement) {
        throw new Error(
          'Replacement domain was created but could not be reloaded.'
        );
      }

      emailNotificationService
        .notifyQuietly(
          'domain_replaced',
          {
            email:
              replacement.user_email,

            name:
              replacement.owner_details
                ?.full_name,

            domainName:
              replacement.domain_name,

            originalDomainName:
              originalDomain.domain_name,

            replacementDomainName:
              replacement.domain_name,

            orderReference:
              originalOrder?.reference,

            paymentReference:
              existingPaymentReference,

            additionalCharge:
              0,

            reason,
          }
        );

      showNotification(
        `${replacement.domain_name} now uses the existing paid order. No new payment was created.`,
        'success'
      );

      return replacement;
    };

  const replacePaidDomainWithExisting =
    async (
      domainId: string,
      existingDomainId: string,
      reason:
        string =
          'Registry rejected the original domain.'
    ): Promise<Domain> => {
      if (
        !currentUser ||
        currentUser.role !==
          'super_admin'
      ) {
        throw new Error(
          'Only a super admin can link an existing replacement domain.'
        );
      }

      const originalDomain =
        domains.find(
          (item) =>
            item.id ===
            domainId
        );

      if (!originalDomain) {
        throw new Error(
          'Original domain not found.'
        );
      }

      const existingDomain =
        domains.find(
          (item) =>
            item.id ===
            existingDomainId
        );

      if (!existingDomain) {
        throw new Error(
          'Existing replacement domain not found.'
        );
      }

      if (
        existingDomain.user_id !==
        originalDomain.user_id
      ) {
        throw new Error(
          'Both domains must belong to the same customer.'
        );
      }

      const originalOrder =
        orders.find(
          (item) =>
            item.id ===
            originalDomain.order_id
        );

      const verifiedPayments =
        originalOrder
          ? payments.filter(
              (item) =>
                item.order_id ===
                  originalOrder.id &&
                item.status ===
                  'verified'
            )
          : [];

      const existingPaymentReference =
        verifiedPayments
          .map(
            (item) =>
              item.reference
          )
          .filter(Boolean)
          .join(', ') ||
        originalDomain.payment_id ||
        undefined;

      const result =
        await callAdminPaymentApi(
          '/admin/domain-replacement',
          {
            domainId,
            existingDomainId:
              existingDomain.id,
            replacementDomainName:
              existingDomain.domain_name,
            reason,
          }
        );

      const [
        refreshedPayments,
        refreshedOrders,
        refreshedDomains,
      ] =
        await Promise.all([
          paymentRepository
            .getAllPayments(),
          orderRepository
            .getAllOrders(),
          domainRepository
            .getAllDomains(),
        ]);

      setPayments(
        refreshedPayments
      );
      setOrders(
        refreshedOrders
      );
      setDomains(
        refreshedDomains
      );

      const replacement =
        refreshedDomains.find(
          (item) =>
            item.id ===
            result?.replacementDomain?.id
        );

      if (!replacement) {
        throw new Error(
          'The existing domain was linked but could not be reloaded.'
        );
      }

      emailNotificationService
        .notifyQuietly(
          'domain_replaced',
          {
            email:
              replacement.user_email,
            name:
              replacement.owner_details
                ?.full_name,
            domainName:
              replacement.domain_name,
            originalDomainName:
              originalDomain.domain_name,
            replacementDomainName:
              replacement.domain_name,
            orderReference:
              originalOrder?.reference,
            paymentReference:
              existingPaymentReference,
            additionalCharge:
              0,
            reason,
          }
        );

      showNotification(
        `${replacement.domain_name} is now linked as the replacement. The existing paid order was reused and no new payment was created.`,
        'success'
      );

      return replacement;
    };


  const rejectManualPayment =
    async (
      paymentId: string,
      reason?: string
    ) => {
      if (
        !currentUser ||
        currentUser.role !==
          'super_admin'
      ) {
        throw new Error(
          'Only a super admin can reject payments.'
        );
      }

      const payment =
        payments.find(
          (item) =>
            item.id ===
            paymentId
        );

      if (!payment) {
        throw new Error(
          'Payment not found.'
        );
      }

      if (
        payment.gateway !==
        'ecocash_usd'
      ) {
        throw new Error(
          'Only manual EcoCash USD payments can be rejected manually.'
        );
      }

      const purpose =
        payment.purpose ===
        'wallet_topup'
          ? 'wallet_topup'
          : 'order_payment';

      const rejectedOrder =
        purpose ===
          'order_payment'
          ? orders.find(
              (item) =>
                item.id ===
                payment.order_id
            )
          : undefined;

      await callAdminPaymentApi(
        '/admin/manual/reject',
        {
          paymentId,
          reason:
            reason ||
            'Payment could not be verified.',
        }
      );

      const [
        refreshedPayments,
        refreshedOrders,
      ] =
        await Promise.all([
          paymentRepository
            .getAllPayments(),
          orderRepository
            .getAllOrders(),
        ]);

      setPayments(
        refreshedPayments
      );

      setOrders(
        refreshedOrders
      );

      const rejected =
        refreshedPayments.find(
          (item) =>
            item.id === paymentId
        ) || payment;

      /*
       * A rejected wallet top-up has no order to reopen
       * and no domain email workflow to run.
       */
      if (
        purpose ===
        'wallet_topup'
      ) {
        showNotification(
          'Runtime Credit top-up rejected.',
          'info'
        );

        return;
      }

      const rejectedDomain =
        rejectedOrder
          ? domains.find(
              (item) =>
                (item as any)
                  .order_id ===
                  rejectedOrder.id ||
                item.id ===
                  (rejectedOrder as any)
                    .domain_id
            )
          : undefined;

      if (rejectedOrder) {
        emailNotificationService
          .notifyQuietly(
            'payment_rejected',
            {
              email:
                rejectedDomain
                  ?.user_email ||
                rejectedOrder
                  .user_email,
              name:
                rejectedDomain
                  ?.owner_details
                  ?.full_name,
              orderReference:
                rejectedOrder
                  .reference,
              paymentReference:
                rejected.reference,
              domainName:
                rejectedDomain
                  ?.domain_name ||
                rejectedOrder
                  .items?.[0]
                  ?.reference_id ||
                'Runtime order',
              amount:
                rejected.amount,
              reason:
                reason ||
                'Payment could not be verified.',
            }
          );
      }

      showNotification(
        'Payment rejected. The order remains open for another payment attempt.',
        'info'
      );
    };

  /*
   * ----------------------------------------------------------
   * ORDER CANCELLATION / DELETION
   * ----------------------------------------------------------
   *
   * Customer cancellation intentionally updates ONLY the order.
   * This matches the current Firestore rule which permits a
   * customer to change only:
   *   status -> cancelled
   *   updated_at
   *
   * It does not directly mutate payments or domain records.
   */
  const createPaymentForOrder = async (
    orderId: string
  ): Promise<Payment> => {
    if (!currentUser) {
      throw new Error(
        'You must be signed in to continue payment.'
      );
    }

    if (
      currentUser.role ===
      'super_admin'
    ) {
      throw new Error(
        'The customer must continue payment from their own account.'
      );
    }

    const order =
      orders.find(
        (item) =>
          item.id ===
          orderId
      );

    if (!order) {
      throw new Error(
        'Order not found.'
      );
    }

    const ownsOrder =
      order.user_id ===
        currentUser.id ||
      order.user_email ===
        currentUser.email;

    if (!ownsOrder) {
      throw new Error(
        'You cannot create a payment for this order.'
      );
    }

    if (
      ![
        'pending',
        'unpaid',
        'payment_pending',
      ].includes(
        String(order.status)
      )
    ) {
      if (
        order.status ===
        'cancelled'
      ) {
        throw new Error(
          'This order was cancelled. Please place a new order.'
        );
      }

      throw new Error(
        'A new payment cannot be created for this order.'
      );
    }

    /*
     * Check Firestore as well as local state so a stale
     * browser cannot accidentally create a duplicate
     * payment for the same order.
     */
    const storedPayments =
      await paymentRepository
        .getPaymentsForOrder(
          order.id
        );

    const existingPayment =
      storedPayments.find(
        (item) =>
          item.status !==
          'rejected'
      );

    if (existingPayment) {
      setPayments(
        (previous) => {
          const alreadyLoaded =
            previous.some(
              (item) =>
                item.id ===
                existingPayment.id
            );

          return alreadyLoaded
            ? previous
            : [
                existingPayment,
                ...previous,
              ];
        }
      );

      return existingPayment;
    }

    const payment =
      await paymentService
        .processCheckout(
          order.id,
          order.total,
          order.currency ||
            'USD',
          order.user_id,
          'ecocash_usd'
        );

    await paymentRepository
      .createPayment(
        payment
      );

    setPayments(
      (previous) => [
        payment,
        ...previous,
      ]
    );

    showNotification(
      `Payment setup restored for order ${order.reference}.`,
      'success'
    );

    return payment;
  };


  const cancelOrder = async (
    orderId: string
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error(
        'You must be signed in to cancel an order.'
      );
    }

    const order =
      orders.find(
        (item) =>
          item.id === orderId
      );

    if (!order) {
      throw new Error(
        'Order not found.'
      );
    }

    const isAdmin =
      currentUser.role ===
      'super_admin';

    const ownsOrder =
      order.user_id ===
        currentUser.id ||
      order.user_email ===
        currentUser.email;

    if (
      !isAdmin &&
      !ownsOrder
    ) {
      throw new Error(
        'You cannot cancel this order.'
      );
    }

    const cancellableStatuses = [
      'pending',
      'unpaid',
      'payment_pending',
    ];

    if (
      !cancellableStatuses.includes(
        String(order.status)
      )
    ) {
      if (
        order.status ===
        'cancelled'
      ) {
        throw new Error(
          'This order is already cancelled.'
        );
      }

      if (
        order.status ===
        'paid'
      ) {
        throw new Error(
          'Paid orders cannot be cancelled directly. Please contact support.'
        );
      }

      throw new Error(
        'This order cannot be cancelled.'
      );
    }

    const now =
      new Date()
        .toISOString();

    /*
     * IMPORTANT:
     * Send only fields allowed by the customer
     * Firestore update rule.
     */
    await orderRepository
      .updateOrder(
        order.id,
        {
          status:
            'cancelled' as any,

          updated_at:
            now,
        }
      );

    const cancelledOrder: Order =
      {
        ...order,

        status:
          'cancelled' as any,

        updated_at:
          now,
      };

    setOrders(
      (previous) =>
        previous.map(
          (item) =>
            item.id ===
            order.id
              ? cancelledOrder
              : item
        )
    );

    if (isAdmin) {
      await adminAuditService.log({
        admin_user_id:
          currentUser.id,

        admin_email:
          currentUser.email,

        target_user_id:
          order.user_id,

        target_user_email:
          order.user_email,

        action:
          'ORDER_CANCELLED',

        resource_type:
          'order',

        resource_id:
          order.id,

        resource_name:
          order.reference,

        before: {
          status:
            order.status,
        },

        after: {
          status:
            'cancelled',
        },

        description:
          `Order ${order.reference} was cancelled by an administrator.`,
      });
    }

    emailNotificationService.notifyQuietly(
      'order_cancelled',
      {
        email:
          order.user_email,

        name:
          users.find(
            (user) =>
              user.id ===
              order.user_id
          )?.name,

        orderReference:
          order.reference,

        domainName:
          order.items?.[0]
            ?.reference_id ||
          'Runtime order',

        amount:
          order.total,
      }
    );

    showNotification(
      `Order ${order.reference} cancelled.`,
      'success'
    );
  };


  const deleteOrder = async (
    orderId: string
  ): Promise<void> => {
    if (
      !currentUser ||
      currentUser.role !==
        'super_admin'
    ) {
      throw new Error(
        'Only a super admin can delete orders.'
      );
    }

    const order =
      orders.find(
        (item) =>
          item.id === orderId
      );

    if (!order) {
      throw new Error(
        'Order not found.'
      );
    }

    if (
      order.status !==
      'cancelled'
    ) {
      throw new Error(
        'Only cancelled orders can be permanently deleted.'
      );
    }

    /*
     * A cancelled registration order can leave its pending
     * domain/payment records behind. Remove those linked
     * abandoned records before deleting the order.
     *
     * This is intentionally limited to pending registration
     * domains. Renewal orders must never delete the real domain.
     */
    const linkedDomain =
      domains.find(
        (item) =>
          (item as any).order_id ===
            order.id
      );

    const linkedPayments =
      payments.filter(
        (item) =>
          item.order_id ===
          order.id
      );

    if (
      linkedDomain &&
      linkedDomain.status ===
        'pending_payment'
    ) {
      await domainRepository
        .deleteDomain(
          linkedDomain.id
        );
    }

    for (
      const linkedPayment
      of linkedPayments
    ) {
      await paymentRepository
        .deletePayment(
          linkedPayment.id
        );
    }

    await adminAuditService.log({
      admin_user_id:
        currentUser.id,

      admin_email:
        currentUser.email,

      target_user_id:
        order.user_id,

      target_user_email:
        order.user_email,

      action:
        'ORDER_DELETED',

      resource_type:
        'order',

      resource_id:
        order.id,

      resource_name:
        order.reference,

      before: {
        status:
          order.status,

        linked_domain:
          linkedDomain
            ?.domain_name,

        linked_payments:
          linkedPayments.map(
            (item) =>
              item.reference
          ),
      },

      description:
        `Cancelled order ${order.reference} was permanently deleted by an administrator.`,
    });

    await orderRepository
      .deleteOrder(
        order.id
      );

    if (
      linkedDomain &&
      linkedDomain.status ===
        'pending_payment'
    ) {
      setDomains(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              linkedDomain.id
          )
      );
    }

    setPayments(
      (previous) =>
        previous.filter(
          (item) =>
            item.order_id !==
            order.id
        )
    );

    setOrders(
      (previous) =>
        previous.filter(
          (item) =>
            item.id !==
            order.id
        )
    );

    showNotification(
      linkedDomain &&
      linkedDomain.status ===
        'pending_payment'
        ? `Order ${order.reference} and its abandoned domain request were deleted.`
        : `Order ${order.reference} deleted.`,
      'success'
    );
  };


  const submitRegistryRequest = async (requestId: string) => {
    const target = registryRequests.find(r => r.id === requestId);
    if (!target) return;

    const res = await registryService.submitToRegistry(target);
    setRegistryRequests(prev => prev.map(r => r.id === requestId ? res.updatedRequest : r));
    
    // Also record in domain history
    setDomains(prev => prev.map(d => {
      if (d.id === target.domain_id || d.domain_name === target.domain_name) {
        const updatedDomain = {
          ...d,
          updated_at: new Date().toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 9),
              domain_id: d.id,
              action: (target.action === 'N' ? 'NEW' : target.action === 'M' ? 'MODIFY' : target.action === 'D' ? 'DELETE' : 'TRANSFER') as DomainHistoryItem['action'],
              description: 'Registrar processing step completed.',
              status: 'submitted',
              actor: currentUser?.email || 'admin',
              created_at: new Date().toISOString(),
            }
          ]
        };

        void domainRepository.updateDomain(d.id, {
          history: updatedDomain.history,
          updated_at: updatedDomain.updated_at,
        }).catch((error) => {
          console.error('Failed to persist registry history:', error);
        });

        return updatedDomain;
      }
      return d;
    }));

    showNotification(res.message, 'success');
  };

  const confirmRegistryRequest = (requestId: string) => {
    const target = registryRequests.find(r => r.id === requestId);
    if (!target) return;

    const updated = registryService.confirmRegistration(target);
    setRegistryRequests(prev => prev.map(r => r.id === requestId ? updated : r));

    // Update the domain status accordingly
    setDomains(prev => prev.map(d => {
      if (d.id === target.domain_id || d.domain_name === target.domain_name) {
        let newStatus: DomainStatus = 'active';
        if (target.action === 'D') {
          newStatus = 'cancelled';
        }

        const now = new Date();
        const nextYear = new Date(now);
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        const updatedDomain: Domain = {
          ...d,
          status: newStatus,
          registered_at: d.registered_at || now.toISOString(),
          expires_at: d.expires_at || nextYear.toISOString(),
          updated_at: now.toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 9),
              domain_id: d.id,
              action: target.action === 'N' ? 'NEW' : target.action === 'M' ? 'MODIFY' : target.action === 'D' ? 'DELETE' : 'TRANSFER',
              description:
                target.action === 'D'
                  ? 'Domain cancellation completed.'
                  : 'Domain processing completed successfully.',
              status: 'confirmed',
              actor: currentUser?.email || 'admin',
              created_at: now.toISOString(),
            }
          ]
        };

        void domainRepository.updateDomain(d.id, {
          status: updatedDomain.status,
          registered_at: updatedDomain.registered_at,
          expires_at: updatedDomain.expires_at,
          history: updatedDomain.history,
          updated_at: updatedDomain.updated_at,
        }).catch((error) => {
          console.error('Failed to persist domain confirmation:', error);
        });

        return updatedDomain;
      }
      return d;
    }));

    if (
      target.action === 'N' ||
      target.action === 'T'
    ) {
      const activatedDomain =
        domains.find(
          (item) =>
            item.id ===
              target.domain_id ||
            item.domain_name ===
              target.domain_name
        );

      if (
        activatedDomain
      ) {
        emailNotificationService.notifyQuietly(
          'domain_activated',
          {
            email:
              activatedDomain
                .user_email,

            name:
              activatedDomain
                .owner_details
                ?.full_name,

            domainName:
              activatedDomain
                .domain_name,

            registeredAt:
              activatedDomain
                .registered_at,

            renewalDate:
              activatedDomain
                .expires_at,
          }
        );
      }
    }

    showNotification(`Domain update for ${target.domain_name} completed.`, 'success');
  };

  const createManualRegistryRequest = (domainId: string, action: RegistryAction) => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return;

    const req = registryService.createRequest(domain, action, currentUser?.email || 'admin');
    setRegistryRequests(prev => [req, ...prev]);
    showNotification(`Manual domain registry ${action} request created for ${domain.domain_name}.`, 'info');
  };

  const updateTldPrice = (id: string, runtimePrice: number, renewalPrice: number, active: boolean) => {
    setPricing(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          runtime_registration_price: runtimePrice,
          runtime_renewal_price: renewalPrice,
          active,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    }));
    showNotification('TLD pricing updated successfully in database.', 'success');
  };

  const syncUpstreamPrices = async () => {
    showNotification('Syncing domain prices from Ngaatec...', 'info');
    await new Promise(r => setTimeout(r, 600));
    setPricing(prev => prev.map(p => ({
      ...p,
      upstream_price: 1.80,
      updated_at: new Date().toISOString(),
    })));
    showNotification('Domain pricing synchronized.', 'success');
  };

  const updateSettings = (newSettings: Partial<PlatformSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    showNotification('Platform settings updated.', 'success');
  };

  const assignDomainToCustomer = async (
    input: Omit<AssignDomainInput, 'admin'>
  ): Promise<Domain> => {
    if (
      !currentUser ||
      currentUser.role !== 'super_admin'
    ) {
      throw new Error(
        'Administrator permission required.'
      );
    }

    const domain =
      await adminDomainService.assignDomain({
        ...input,
        admin: currentUser,
      });

    setDomains(
      (previous) => [
        domain,
        ...previous,
      ]
    );

    emailNotificationService.notifyQuietly(
      'domain_assigned',
      {
        email:
          domain.user_email,

        name:
          domain.owner_details
            ?.full_name ||
          input.customer.name,

        domainName:
          domain.domain_name,

        registeredAt:
          domain.registered_at,

        renewalDate:
          domain.expires_at,
      }
    );

    showNotification(
      `${domain.domain_name} assigned to ${input.customer.email}.`,
      'success'
    );

    return domain;
  };

  const openCustomerAccount = async (
  userId: string
): Promise<void> => {
  if (
    !currentUser ||
    currentUser.role !== 'super_admin'
  ) {
    showNotification(
      'Administrator permission required.',
      'error'
    );

    return;
  }

  const customer =
    users.find(
      (user) =>
        user.id === userId
    );

  if (!customer) {
    showNotification(
      'Customer not found.',
      'error'
    );

    return;
  }

  /*
   * Open the account immediately.
   * Audit logging must never block navigation.
   */
  setAdminCustomerId(
    customer.id
  );

  setAdminSubView(
    'customer_account'
  );

  /*
   * Audit separately.
   */
  try {
    await adminAuditService.log({
      admin_user_id:
        currentUser.id,

      admin_email:
        currentUser.email,

      target_user_id:
        customer.id,

      target_user_email:
        customer.email,

      action:
        'CUSTOMER_ACCOUNT_OPENED',

      resource_type:
        'customer',

      resource_id:
        customer.id,

      resource_name:
        customer.email,

      description:
        `${currentUser.email} opened the customer account for ${customer.email}.`,
    });
  } catch (error) {
    console.error(
      'Failed to record admin customer access:',
      error
    );
  }
};

  const closeCustomerAccount = () => {
    setAdminCustomerId(
      null
    );

    setAdminSubView(
      'customers'
    );
  };

  return (
    <StoreContext.Provider value={{
      currentUser,
      authReady,
      users,
      domains,
      orders,
      payments,
      pricing,
      registryRequests,
      settings,
      activeView,
      setActiveView,
      adminSubView,
      setAdminSubView,
      dashboardSubView,
      setDashboardSubView,
      registrationModalOpen,
      setRegistrationModalOpen,
      pendingRegisterDomain,
      setPendingRegisterDomain,
      login,
      loginWithGoogle,
      resetPassword,
      logout,
      register,
      updateCurrentUserProfile,
      registerNewDomain,
      updateDomainNameservers,
      requestDomainModify,
      requestDomainDelete,
      requestDomainTransfer,
      updateDomainStatus,
      renewDomain,
      approveManualPayment,
      rejectManualPayment,
      replacePaidDomain,
      replacePaidDomainWithExisting,
      cancelOrder,
      deleteOrder,
      createPaymentForOrder,
      submitRegistryRequest,
      confirmRegistryRequest,
      createManualRegistryRequest,
      updateTldPrice,
      syncUpstreamPrices,
      updateSettings,
      assignDomainToCustomer,
      openCustomerAccount,
      adminCustomerId,
      closeCustomerAccount,
      notification,
      showNotification,
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
import React, { createContext, useContext, useState, useEffect } from 'react';
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
    paymentGateway?: any
  ) => Promise<{
    success: boolean;
    domain: Domain;
    order: Order;
    payment: Payment;
  }>;
  updateDomainNameservers: (domainId: string, nameservers: string[]) => void;
  requestDomainModify: (domainId: string, updatedOwner: RegistrantDetails, nameservers: string[]) => void;
  requestDomainDelete: (domainId: string, confirmationText: string) => boolean;
  requestDomainTransfer: (domainName: string, authCode: string) => Promise<void>;
  updateDomainStatus: (domainId: string, status: DomainStatus) => void;
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

  // Order actions
  cancelOrder: (
    orderId: string
  ) => Promise<void>;

  deleteOrder: (
    orderId: string
  ) => Promise<void>;

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
    gateway: any = 'ecocash_usd'
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
     * The order exists before payment.
     * It remains pending until an admin
     * verifies the money received.
     */
    const order =
      orderService.createDomainRegistrationOrder(
        currentUser.id,
        currentUser.email,
        normalizedDomain,
        registrationPrice,
        'USD'
      );

    /*
     * Creating a payment is NOT payment verification.
     */
    const payment =
      await paymentService.processCheckout(
        order.id,
        registrationPrice,
        'USD',
        currentUser.id,
        gateway
      );

    const now =
      new Date().toISOString();

    /*
     * The domain is created immediately so the customer
     * can see the order in My Domains.
     *
     * pending_payment means Runtime has NOT started
     * registration processing yet.
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

      payment_id:
        payment.id,

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

      payment_id:
        string;
    };

    /*
     * Persist all three records.
     *
     * No registry request is created here.
     * No order is marked paid here.
     */
    await orderRepository.createOrder(
      order
    );

    await paymentRepository.createPayment(
      payment
    );

    await domainRepository.createDomain(
      pendingDomain
    );

    setOrders((prev) => [
      order,
      ...prev,
    ]);

    setPayments((prev) => [
      payment,
      ...prev,
    ]);

    setDomains((prev) => [
      pendingDomain,
      ...prev,
    ]);

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

  const updateDomainNameservers = (
    domainId: string,
    nameservers: string[]
  ) => {
    const domain = domains.find((item) => item.id === domainId);

    if (!domain) {
      showNotification('Domain not found.', 'error');
      return;
    }

    const now = new Date().toISOString();

    const updated = {
      ...domain,
      nameservers,
      updated_at: now,
      history: [
        ...domain.history,
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: domain.id,
          action: 'MODIFY' as const,
          description: 'Nameserver change requested.',
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
        nameservers: updated.nameservers,
        history: updated.history,
        updated_at: updated.updated_at,
      })
      .catch((error) => {
        console.error('Failed to save nameserver update:', error);
        showNotification(
          'Unable to save the nameserver change.',
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

    showNotification(
      `Transfer request for ${normalizedDomain} has been received.`,
      'success'
    );
  };

  const updateDomainStatus = (
    domainId: string,
    status: DomainStatus
  ) => {
    const domain = domains.find(
      (item) => item.id === domainId
    );

    if (!domain) {
      showNotification(
        'Domain not found.',
        'error'
      );
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    let registeredAt =
      domain.registered_at;

    let expiresAt =
      domain.expires_at;

    /*
     * A purchase date is not treated as the registration date.
     * The registration/renewal cycle begins when an admin marks
     * the domain active for the first time.
     */
    if (
      status === 'active' &&
      !registeredAt
    ) {
      registeredAt =
        nowIso;

      const firstExpiry =
        new Date(now);

      firstExpiry.setFullYear(
        firstExpiry.getFullYear() +
          1
      );

      expiresAt =
        firstExpiry.toISOString();
    }

    const updated: Domain = {
      ...domain,
      status,
      registered_at:
        registeredAt,
      expires_at:
        expiresAt,
      updated_at:
        nowIso,
      history: [
        ...domain.history,
        {
          id:
            'hist-' +
            Math.random()
              .toString(36)
              .substring(2, 9),
          domain_id:
            domain.id,
          action:
            'STATUS_CHANGE',
          description:
            status === 'active'
              ? 'Domain registration completed and the domain is now active.'
              : `Domain status changed to ${status.replace(/_/g, ' ')}.`,
          status,
          actor:
            currentUser?.email ||
            'admin',
          created_at:
            nowIso,
        },
      ],
    };

    setDomains((prev) =>
      prev.map((item) =>
        item.id === domainId
          ? updated
          : item
      )
    );

    void domainRepository
      .updateDomain(
        domainId,
        {
          status:
            updated.status,
          registered_at:
            updated.registered_at,
          expires_at:
            updated.expires_at,
          history:
            updated.history,
          updated_at:
            updated.updated_at,
        }
      )
      .catch((error) => {
        console.error(
          'Failed to persist domain status:',
          error
        );

        showNotification(
          'Unable to save the domain status.',
          'error'
        );
      });

    showNotification(
      status === 'active'
        ? `${domain.domain_name} is now active.`
        : `Domain status updated to ${status.replace(/_/g, ' ')}.`,
      'success'
    );
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
  await orderRepository.createOrder(
    order
  );

  await paymentRepository.createPayment(
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
        payment.status ===
        'verified'
      ) {
        showNotification(
          'This payment is already verified.',
          'info'
        );
        return;
      }

      const order =
        orders.find(
          (item) =>
            item.id ===
            payment.order_id
        );

      if (!order) {
        throw new Error(
          'The order linked to this payment was not found.'
        );
      }

      /*
       * ----------------------------------------------------------
       * DOMAIN RENEWAL PAYMENT
       * ----------------------------------------------------------
       */
      if (
        (order as any).purpose ===
        'domain_renewal'
      ) {
        const domainId =
          (order as any).domain_id;

        const years =
          Number(
            (order as any)
              .renewal_years || 1
          );

        const domain =
          domains.find(
            (item) =>
              item.id === domainId
          );

        if (!domain) {
          throw new Error(
            'Renewal domain not found.'
          );
        }

        const approvedPayment =
          paymentService
            .approveManualPayment(
              payment,
              currentUser.id,
              transactionId
            );

        const paidOrder =
          orderService.markPaid(
            order
          );

        const now =
          new Date();

        const existingExpiry =
          domain.expires_at
            ? new Date(
                domain.expires_at
              )
            : null;

        /*
         * Early renewal:
         * extend current expiry.
         *
         * Expired domain:
         * start from today.
         */
        const baseDate =
          existingExpiry &&
          existingExpiry.getTime() >
            now.getTime()
            ? new Date(
                existingExpiry
              )
            : new Date(now);

        const newExpiry =
          new Date(baseDate);

        newExpiry.setFullYear(
          newExpiry.getFullYear() +
            years
        );

        const nowIso =
          now.toISOString();

        const updatedDomain: Domain =
          {
            ...domain,

            status:
              'active',

            expires_at:
              newExpiry.toISOString(),

            updated_at:
              nowIso,

            history: [
              ...domain.history,

              {
                id:
                  'hist-' +
                  Math.random()
                    .toString(36)
                    .substring(2, 9),

                domain_id:
                  domain.id,

                action:
                  'RENEWAL',

                description:
                  `Renewal payment confirmed. Domain renewed for ${years} ${
                    years === 1
                      ? 'year'
                      : 'years'
                  }.`,

                status:
                  'confirmed',

                actor:
                  currentUser.email,

                created_at:
                  nowIso,
              },
            ],
          };

        await paymentRepository.updatePayment(
          payment.id,
          approvedPayment
        );

        await orderRepository.updateOrder(
          order.id,
          paidOrder
        );

        await domainRepository.updateDomain(
          domain.id,
          {
            status:
              updatedDomain.status,

            expires_at:
              updatedDomain.expires_at,

            history:
              updatedDomain.history,

            updated_at:
              updatedDomain.updated_at,
          }
        );

        setPayments((prev) =>
          prev.map((item) =>
            item.id ===
            payment.id
              ? approvedPayment
              : item
          )
        );

        setOrders((prev) =>
          prev.map((item) =>
            item.id ===
            order.id
              ? paidOrder
              : item
          )
        );

        setDomains((prev) =>
          prev.map((item) =>
            item.id ===
            domain.id
              ? updatedDomain
              : item
          )
        );

        showNotification(
          `${domain.domain_name} renewed until ${newExpiry.toLocaleDateString()}.`,
          'success'
        );

        return;
      }

      const domain =
        domains.find(
          (item) =>
            (item as any)
              .order_id ===
              order.id
        );

      if (!domain) {
        throw new Error(
          'The domain linked to this order was not found.'
        );
      }

      const approvedPayment =
        paymentService.approveManualPayment(
          payment,
          currentUser.id,
          transactionId
        );

      const paidOrder =
        orderService.markPaid(
          order
        );

      const now =
        new Date().toISOString();

      const updatedDomain: Domain = {
        ...domain,

        status:
          'pending_registration',

        updated_at:
          now,

        history: [
          ...domain.history,
          {
            id:
              'hist-' +
              Math.random()
                .toString(36)
                .substring(2, 9),

            domain_id:
              domain.id,

            action:
              'STATUS_CHANGE',

            description:
              'Payment verified. Domain registration is now being processed.',

            status:
              'pending_registration',

            actor:
              currentUser.email,

            created_at:
              now,
          },
        ],
      };

      await paymentRepository.updatePayment(
        payment.id,
        approvedPayment
      );

      await orderRepository.updateOrder(
        order.id,
        paidOrder
      );

      await domainRepository.updateDomain(
        domain.id,
        {
          status:
            updatedDomain.status,
          history:
            updatedDomain.history,
          updated_at:
            updatedDomain.updated_at,
        }
      );

      setPayments((prev) =>
        prev.map((item) =>
          item.id ===
          payment.id
            ? approvedPayment
            : item
        )
      );

      setOrders((prev) =>
        prev.map((item) =>
          item.id ===
          order.id
            ? paidOrder
            : item
        )
      );

      setDomains((prev) =>
        prev.map((item) =>
          item.id ===
          domain.id
            ? updatedDomain
            : item
        )
      );

      /*
       * Only after payment approval do Zimbabwe
       * registry domains enter the registry queue.
       */
      if (
        (domain as any)
          .processing_type ===
        'zispa'
      ) {
        const existing =
          registryRequests.some(
            (request) =>
              request.domain_id ===
                domain.id &&
              request.action ===
                'N'
          );

        if (!existing) {
          const registryRequest =
            registryService.createRequest(
              updatedDomain,
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

      showNotification(
        `Payment approved for ${domain.domain_name}. Registration can now be processed.`,
        'success'
      );
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

      const rejected =
        paymentService.rejectManualPayment(
          payment,
          currentUser.id,
          reason
        );

      await paymentRepository.updatePayment(
        payment.id,
        rejected
      );

      setPayments((prev) =>
        prev.map((item) =>
          item.id ===
          payment.id
            ? rejected
            : item
        )
      );

      showNotification(
        'Payment marked as not verified.',
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

    await orderRepository
      .deleteOrder(
        order.id
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
      `Order ${order.reference} deleted.`,
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
      cancelOrder,
      deleteOrder,
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
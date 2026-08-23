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
  ) => Promise<{ success: boolean; domain: Domain; order: Order }>;
  updateDomainNameservers: (domainId: string, nameservers: string[]) => void;
  requestDomainModify: (domainId: string, updatedOwner: RegistrantDetails, nameservers: string[]) => void;
  requestDomainDelete: (domainId: string, confirmationText: string) => boolean;
  requestDomainTransfer: (domainName: string, authCode: string) => Promise<void>;
  updateDomainStatus: (domainId: string, status: DomainStatus) => void;
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
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const SEED_USERS: User[] = [
  {
    id: 'usr-customer-1',
    name: 'Ngaa Ndasowa',
    email: 'ngaandasowa@gmail.com',
    role: 'customer',
    organisation: 'Runtime Digital Ventures',
    phone: '+263 77 192 3844',
    email_verified_at: '2026-01-10T08:00:00Z',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'usr-admin-1',
    name: 'Root Administrator',
    email: 'admin@runtime.co.zw',
    role: 'super_admin',
    organisation: 'Runtime Cloud Infrastructure',
    phone: '+263 242 700000',
    email_verified_at: '2025-12-01T00:00:00Z',
    created_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'usr-reg-admin',
    name: 'domain registry Desk Officer',
    email: 'registry-ops@runtime.co.zw',
    role: 'registry_admin',
    organisation: 'Runtime Registrar Ops',
    phone: '+263 77 444 5555',
    email_verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'usr-bill-admin',
    name: 'Finance & Billing',
    email: 'billing@runtime.co.zw',
    role: 'billing_admin',
    organisation: 'Runtime Finance',
    phone: '+263 242 700001',
    email_verified_at: '2026-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
  }
];

const SEED_DOMAINS: Domain[] = [
  {
    id: 'dom-1',
    domain_name: 'innovate.co.zw',
    tld: '.co.zw',
    user_id: 'usr-customer-1',
    user_email: 'ngaandasowa@gmail.com',
    status: 'active',
    nameservers: ['ns1.runtime.co.zw', 'ns2.runtime.co.zw'],
    auto_renew: true,
    registered_at: '2026-01-15T10:00:00Z',
    expires_at: '2027-01-15T10:00:00Z',
    renewal_price: 2.00,
    currency: 'USD',
    registrant_type: 'myself',
    owner_details: {
      full_name: 'Ngaa Ndasowa',
      org_name: 'Innovate Labs Zimbabwe',
      physical_address: '100 Samora Machel Avenue, Harare',
      postal_address: 'P.O. Box 4492, Harare',
      city: 'Harare',
      country: 'Zimbabwe',
      phone: '+263 77 192 3844',
      email: 'ngaandasowa@gmail.com',
      org_description: 'Software development & artificial intelligence research',
      proposed_usage: 'Core product website, developer APIs, and corporate email.',
    },
    history: [
      {
        id: 'hist-1',
        domain_id: 'dom-1',
        action: 'NEW',
        description: 'Submitted to domain registry by Runtime registrar',
        status: 'submitted',
        actor: 'dns@runtime.co.zw',
        created_at: '2026-01-15T10:15:00Z',
      },
      {
        id: 'hist-2',
        domain_id: 'dom-1',
        action: 'NEW',
        description: 'Confirmed and zone delegated by domain registry',
        status: 'confirmed',
        actor: 'admin@registry.org.zw',
        created_at: '2026-01-15T14:30:00Z',
      }
    ],
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T14:30:00Z',
  },
  {
    id: 'dom-2',
    domain_name: 'payflow.co.zw',
    tld: '.co.zw',
    user_id: 'usr-customer-1',
    user_email: 'ngaandasowa@gmail.com',
    status: 'pending_registration',
    nameservers: ['ns1.runtime.co.zw', 'ns2.runtime.co.zw'],
    auto_renew: true,
    renewal_price: 2.00,
    currency: 'USD',
    registrant_type: 'client',
    owner_details: {
      full_name: 'Tendai Mutasa',
      org_name: 'Payflow Fintech Zimbabwe Ltd',
      physical_address: '14 Baines Avenue, Harare',
      postal_address: 'P.O. Box CY 129, Causeway, Harare',
      city: 'Harare',
      country: 'Zimbabwe',
      phone: '+263 71 888 9999',
      email: 'finance@payflow.co.zw',
      org_description: 'Mobile payment integration and merchant acquiring',
      proposed_usage: 'Fintech merchant portal and payment checkout endpoints.',
    },
    history: [
      {
        id: 'hist-3',
        domain_id: 'dom-2',
        action: 'NEW',
        description: 'Order paid ($2.00). domain application generated and awaiting registrar submission.',
        status: 'ready',
        actor: 'system',
        created_at: '2026-08-19T09:00:00Z',
      }
    ],
    created_at: '2026-08-19T09:00:00Z',
    updated_at: '2026-08-19T09:00:00Z',
  },
  {
    id: 'dom-3',
    domain_name: 'cloudscale.co.zw',
    tld: '.co.zw',
    user_id: 'usr-customer-1',
    user_email: 'ngaandasowa@gmail.com',
    status: 'active',
    nameservers: ['ns1.runtime.co.zw', 'ns2.runtime.co.zw', 'ns3.runtime.co.zw'],
    auto_renew: false,
    registered_at: '2025-09-10T12:00:00Z',
    expires_at: '2026-09-10T12:00:00Z', // Expiring in 21 days
    renewal_price: 2.00,
    currency: 'USD',
    registrant_type: 'myself',
    owner_details: {
      full_name: 'Ngaa Ndasowa',
      org_name: 'CloudScale Infrastructure',
      physical_address: '7th Floor, Joina City, Harare',
      postal_address: 'P.O. Box 550, Harare',
      city: 'Harare',
      country: 'Zimbabwe',
      phone: '+263 77 192 3844',
      email: 'ngaandasowa@gmail.com',
      org_description: 'Cloud computing and serverless platform',
      proposed_usage: 'Production cluster DNS endpoints and application delivery.',
    },
    history: [
      {
        id: 'hist-4',
        domain_id: 'dom-3',
        action: 'NEW',
        description: 'domain application confirmed.',
        status: 'confirmed',
        actor: 'admin@registry.org.zw',
        created_at: '2025-09-10T15:00:00Z',
      }
    ],
    created_at: '2025-09-10T12:00:00Z',
    updated_at: '2025-09-10T15:00:00Z',
  }
];

const SEED_SETTINGS: PlatformSettings = {
  default_nameservers: [
    'ns1.runtime.co.zw',
    'ns2.runtime.co.zw',
    'ns3.runtime.co.zw',
    'ns4.runtime.co.zw',
  ],
  registry_email_from: 'dns@runtime.co.zw',
  registry_email_to: 'admin@registry.org.zw',
  auto_submit_registry: false,
  platform_name: 'Runtime',
  operator_name: 'Runtime Private Limited',
  operator_phone: '+263 242 700000',
  support_email: 'support@runtime.co.zw',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [domains, setDomains] =
  useState<Domain[]>([]);
  
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('runtime_orders');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'ord-101',
        user_id: 'usr-customer-1',
        user_email: 'ngaandasowa@gmail.com',
        reference: 'RT-ORD-882190',
        subtotal: 2.00,
        discount: 0,
        total: 2.00,
        currency: 'USD',
        status: 'paid',
        paid_at: '2026-01-15T10:05:00Z',
        created_at: '2026-01-15T10:00:00Z',
        updated_at: '2026-01-15T10:05:00Z',
        items: [
          {
            id: 'item-1',
            order_id: 'ord-101',
            item_type: 'domain_registration',
            reference_id: 'innovate.co.zw',
            description: 'Domain Registration: innovate.co.zw (1 Year)',
            quantity: 1,
            unit_price: 2.00,
            total: 2.00,
          }
        ]
      },
      {
        id: 'ord-102',
        user_id: 'usr-customer-1',
        user_email: 'ngaandasowa@gmail.com',
        reference: 'RT-ORD-449120',
        subtotal: 2.00,
        discount: 0,
        total: 2.00,
        currency: 'USD',
        status: 'paid',
        paid_at: '2026-08-19T09:02:00Z',
        created_at: '2026-08-19T09:00:00Z',
        updated_at: '2026-08-19T09:02:00Z',
        items: [
          {
            id: 'item-2',
            order_id: 'ord-102',
            item_type: 'domain_registration',
            reference_id: 'payflow.co.zw',
            description: 'Domain Registration: payflow.co.zw (1 Year)',
            quantity: 1,
            unit_price: 2.00,
            total: 2.00,
          }
        ]
      }
    ];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('runtime_payments');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'pay-1',
        order_id: 'ord-101',
        user_id: 'ngaandasowa@gmail.com',
        reference: 'PAY-ZW889102',
        amount: 2.00,
        currency: 'USD',
        gateway: 'paynow',
        status: 'verified',
        verified_at: '2026-01-15T10:05:00Z',
        created_at: '2026-01-15T10:00:00Z',
      },
      {
        id: 'pay-2',
        order_id: 'ord-102',
        user_id: 'ngaandasowa@gmail.com',
        reference: 'PAY-ZW441299',
        amount: 2.00,
        currency: 'USD',
        gateway: 'ecocash',
        status: 'verified',
        verified_at: '2026-08-19T09:02:00Z',
        created_at: '2026-08-19T09:00:00Z',
      }
    ];
  });

  const [pricing, setPricing] = useState<TldPricing[]>(() => {
    const saved = localStorage.getItem('runtime_pricing');
    return saved ? JSON.parse(saved) : runtimePricingService.getInitialPricing();
  });

  const [registryRequests, setRegistryRequests] = useState<RegistryRequest[]>(() => {
    const saved = localStorage.getItem('runtime_registry_requests');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'reg-001',
        domain_id: 'dom-2',
        domain_name: 'payflow.co.zw',
        action: 'N',
        generated_template: registryTemplateService.generateTemplate(SEED_DOMAINS[1], 'N'),
        status: 'ready',
        email_subject: 'NEW: payflow.co.zw',
        customer_email: 'ngaandasowa@gmail.com',
        payment_reference: 'PAY-ZW441299',
        created_at: '2026-08-19T09:02:00Z',
        updated_at: '2026-08-19T09:02:00Z',
      },
      {
        id: 'reg-002',
        domain_id: 'dom-1',
        domain_name: 'innovate.co.zw',
        action: 'N',
        generated_template: registryTemplateService.generateTemplate(SEED_DOMAINS[0], 'N'),
        status: 'confirmed',
        submitted_at: '2026-01-15T10:15:00Z',
        confirmed_at: '2026-01-15T14:30:00Z',
        submitted_by: 'dns@runtime.co.zw',
        email_subject: 'NEW: innovate.co.zw',
        registry_response_notes: 'domain registry confirmation received. Delegation completed.',
        customer_email: 'ngaandasowa@gmail.com',
        payment_reference: 'PAY-ZW889102',
        created_at: '2026-01-15T10:05:00Z',
        updated_at: '2026-01-15T14:30:00Z',
      }
    ];
  });

  const [settings, setSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem('runtime_settings');
    return saved ? JSON.parse(saved) : SEED_SETTINGS;
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('runtime_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('runtime_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('runtime_pricing', JSON.stringify(pricing));
  }, [pricing]);

  useEffect(() => {
    localStorage.setItem('runtime_registry_requests', JSON.stringify(registryRequests));
  }, [registryRequests]);

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
    gateway: any = 'paynow'
  ) => {
    if (!currentUser) {
      throw new Error('You must be signed in to register a domain.');
    }

    const normalizedDomain = domainService.cleanDomain(domainName);

    const {
      tld,
      registrationPrice,
      renewalPrice,
      processingType,
    } = await getDomainOrderDetails(normalizedDomain);

    // 1. Create order
    const order = orderService.createDomainRegistrationOrder(
      currentUser.id,
      currentUser.email,
      normalizedDomain,
      registrationPrice,
      'USD'
    );

    // 2. Prototype payment flow.
    // Replace this with real gateway verification before production.
    const payment = await paymentService.processCheckout(
      order.id,
      registrationPrice,
      'USD',
      currentUser.email,
      gateway
    );

    const paidOrder = orderService.markPaid(order);

    const now = new Date().toISOString();

    // 3. Create one unified domain record for every TLD.
    const newDomain = {
      id: 'dom-' + Math.random().toString(36).substring(2, 10),
      domain_name: normalizedDomain,
      tld,
      user_id: currentUser.id,
      user_email: currentUser.email,
      status: 'pending_registration' as DomainStatus,
      nameservers:
        nameservers.length > 0
          ? nameservers
          : [...settings.default_nameservers],
      auto_renew: true,
      renewal_price: renewalPrice,
      currency: 'USD',
      registrant_type: registrantType,
      owner_details: ownerDetails,

      // Internal operational fields.
      // Keep these out of customer-facing components.
      processing_type: processingType,
      registration_price: registrationPrice,

      history: [
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: normalizedDomain,
          action: 'NEW' as const,
          description: `Order ${order.reference} received. Domain registration is being processed.`,
          status: 'ready',
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

    // 4. Save the domain to Firestore first.
    await domainRepository.createDomain(newDomain);

    // 5. Only Zimbabwe registry TLDs create an internal registry request.
    if (processingType === 'zispa') {
      const registryRequest = registryService.createRequest(
        newDomain,
        'N',
        'system'
      );

      registryRequest.payment_reference = payment.reference;

      setRegistryRequests((prev) => [
        registryRequest,
        ...prev,
      ]);
    }

    // 6. Keep the current prototype order/payment state for now.
    setOrders((prev) => [paidOrder, ...prev]);
    setPayments((prev) => [payment, ...prev]);
    setDomains((prev) => [newDomain, ...prev]);

    showNotification(
      `Your domain order for ${normalizedDomain} has been received and is being processed.`,
      'success'
    );

    return {
      success: true,
      domain: newDomain,
      order: paidOrder,
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

  const updateDomainStatus = (domainId: string, status: DomainStatus) => {
    const domain = domains.find((item) => item.id === domainId);

    if (!domain) {
      showNotification('Domain not found.', 'error');
      return;
    }

    const now = new Date().toISOString();
    const updated: Domain = {
      ...domain,
      status,
      updated_at: now,
      history: [
        ...domain.history,
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 9),
          domain_id: domain.id,
          action: 'STATUS_CHANGE',
          description: `Domain status changed to ${status}.`,
          status,
          actor: currentUser?.email || 'admin',
          created_at: now,
        },
      ],
    };

    setDomains((prev) =>
      prev.map((item) => (item.id === domainId ? updated : item))
    );

    void domainRepository.updateDomain(domainId, {
      status: updated.status,
      history: updated.history,
      updated_at: updated.updated_at,
    }).catch((error) => {
      console.error('Failed to persist domain status:', error);
      showNotification('Unable to save the domain status.', 'error');
    });
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
      submitRegistryRequest,
      confirmRegistryRequest,
      createManualRegistryRequest,
      updateTldPrice,
      syncUpstreamPrices,
      updateSettings,
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
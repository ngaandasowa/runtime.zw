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
  RegistrantDetails
} from '../types';
import { runtimePricingService } from '../services/RuntimePricingService';
import { registryService } from '../services/RegistryService';
import { orderService } from '../services/OrderService';
import { paymentService } from '../services/PaymentService';
import { registryTemplateService } from '../services/RegistryTemplateService';
import { firebaseAuthService } from '../services/FirebaseAuthService';

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
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
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
  requestDomainTransfer: (domainName: string, authCode: string) => void;
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
  support_email: 'support@runtime.co.zw',
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [users] = useState<User[]>(SEED_USERS);
  const [domains, setDomains] = useState<Domain[]>(() => {
    const saved = localStorage.getItem('runtime_domains');
    return saved ? JSON.parse(saved) : SEED_DOMAINS;
  });
  
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

  useEffect(() => firebaseAuthService.onUserChanged(user => {
    setCurrentUser(user);
    setAuthReady(true);
  }), []);

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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('runtime_domains', JSON.stringify(domains));
  }, [domains]);

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

  const login = async (email: string, password: string, remember: boolean) => {
    const user = await firebaseAuthService.signIn(email, password, remember);
    setCurrentUser(user);
    setActiveView('dashboard');
    showNotification(`Welcome back, ${email}`, 'success');
  };

  const loginWithGoogle = async () => {
    const user = await firebaseAuthService.signInWithGoogle();
    setCurrentUser(user);
    setActiveView('dashboard');
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

  const registerNewDomain = async (
    domainName: string,
    registrantType: 'myself' | 'client',
    ownerDetails: RegistrantDetails,
    nameservers: string[],
    gateway: any = 'paynow'
  ) => {
    const user = currentUser || {
      id: 'usr-guest',
      email: ownerDetails.email,
      name: ownerDetails.full_name,
      role: 'customer' as const,
      created_at: new Date().toISOString()
    };

    const tld = ['.co.zw', '.org.zw', '.ac.zw'].find(candidate => domainName.toLowerCase().endsWith(candidate)) || '.co.zw';
    const price = tld === '.ac.zw' ? 3.00 : 2.00;

    // 1. Create order
    const order = orderService.createDomainRegistrationOrder(user.id, user.email, domainName, price, 'USD');
    
    // 2. Process payment (simulated server-side verified payment)
    const payment = await paymentService.processCheckout(order.id, price, 'USD', user.email, gateway);
    const paidOrder = orderService.markPaid(order);

    // 3. Create Domain entity in pending_registration status
    const newDomain: Domain = {
      id: 'dom-' + Math.random().toString(36).substring(2, 8),
      domain_name: domainName,
      tld,
      user_id: user.id,
      user_email: user.email,
      status: 'pending_registration',
      nameservers: nameservers.length > 0 ? nameservers : [...settings.default_nameservers],
      auto_renew: true,
      renewal_price: price,
      currency: 'USD',
      registrant_type: registrantType,
      owner_details: ownerDetails,
      history: [
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 7),
          domain_id: domainName,
          action: 'NEW',
          description: `Order ${order.reference} confirmed ($${price.toFixed(2)}). Registration request prepared.`,
          status: 'ready',
          actor: user.email,
          created_at: new Date().toISOString(),
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 4. Create Registry Request for domain registry queue
    const regReq = registryService.createRequest(newDomain, 'N', 'system');
    regReq.payment_reference = payment.reference;

    // Update state
    setOrders(prev => [paidOrder, ...prev]);
    setPayments(prev => [payment, ...prev]);
    setDomains(prev => [newDomain, ...prev]);
    setRegistryRequests(prev => [regReq, ...prev]);

    showNotification(`Domain ${domainName} ordered & queued for domain registry submission!`, 'success');
    return { success: true, domain: newDomain, order: paidOrder };
  };

  const updateDomainNameservers = (domainId: string, nameservers: string[]) => {
    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
        const updated = {
          ...d,
          nameservers,
          updated_at: new Date().toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 7),
              domain_id: d.id,
              action: 'MODIFY' as const,
              description: `Nameservers updated to: ${nameservers.join(', ')}`,
              status: 'pending',
              actor: currentUser?.email || 'customer',
              created_at: new Date().toISOString(),
            }
          ]
        };
        // Also queue domain registry modify request
        const req = registryService.createRequest(updated, 'M', currentUser?.email || 'customer');
        setRegistryRequests(r => [req, ...r]);
        return updated;
      }
      return d;
    }));
    showNotification('Nameservers updated and domain registry MODIFY request queued.', 'success');
  };

  const requestDomainModify = (domainId: string, updatedOwner: RegistrantDetails, nameservers: string[]) => {
    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
        const updated: Domain = {
          ...d,
          owner_details: updatedOwner,
          nameservers,
          updated_at: new Date().toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 7),
              domain_id: d.id,
              action: 'MODIFY',
              description: 'Domain details / registrant record modification requested.',
              status: 'pending',
              actor: currentUser?.email || 'admin',
              created_at: new Date().toISOString(),
            }
          ]
        };
        const req = registryService.createRequest(updated, 'M', currentUser?.email || 'admin');
        setRegistryRequests(r => [req, ...r]);
        return updated;
      }
      return d;
    }));
    showNotification('Domain modification request created.', 'success');
  };

  const requestDomainDelete = (domainId: string, confirmationText: string): boolean => {
    const domain = domains.find(d => d.id === domainId);
    if (!domain) return false;

    if (confirmationText.trim().toLowerCase() !== domain.domain_name.toLowerCase()) {
      showNotification(`Confirmation mismatch. You must type "${domain.domain_name}" exactly.`, 'error');
      return false;
    }

    setDomains(prev => prev.map(d => {
      if (d.id === domainId) {
        const updated: Domain = {
          ...d,
          status: 'pending_delete',
          updated_at: new Date().toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 7),
              domain_id: d.id,
              action: 'DELETE',
              description: 'DELETE request issued with typed confirmation. Queued for domain registry cancellation.',
              status: 'pending_delete',
              actor: currentUser?.email || 'admin',
              created_at: new Date().toISOString(),
            }
          ]
        };
        const req = registryService.createRequest(updated, 'D', currentUser?.email || 'admin');
        setRegistryRequests(r => [req, ...r]);
        return updated;
      }
      return d;
    }));

    showNotification(`Delete request for ${domain.domain_name} queued for domain registry dispatch.`, 'info');
    return true;
  };

  const requestDomainTransfer = (domainName: string, authCode: string) => {
    const newDomain: Domain = {
      id: 'dom-' + Math.random().toString(36).substring(2, 8),
      domain_name: domainName,
      tld: '.co.zw',
      user_id: currentUser?.id || 'usr-cust',
      user_email: currentUser?.email || 'customer@runtime.co.zw',
      status: 'pending_transfer',
      nameservers: [...settings.default_nameservers],
      auto_renew: true,
      renewal_price: 2.00,
      currency: 'USD',
      registrant_type: 'myself',
      owner_details: {
        full_name: currentUser?.name || 'Customer',
        org_name: currentUser?.organisation || 'Organisation',
        physical_address: 'Harare, Zimbabwe',
        postal_address: 'P.O. Box Harare',
        city: 'Harare',
        country: 'Zimbabwe',
        phone: currentUser?.phone || '+263 77 123 4567',
        email: currentUser?.email || 'customer@runtime.co.zw',
        org_description: 'Domain transfer into Runtime platform',
        proposed_usage: 'Production infrastructure and cloud routing',
      },
      history: [
        {
          id: 'hist-' + Math.random().toString(36).substring(2, 7),
          domain_id: domainName,
          action: 'TRANSFER',
          description: `Domain transfer initiated with auth key. Awaiting domain registry confirmation.`,
          status: 'pending_transfer',
          actor: currentUser?.email || 'customer',
          created_at: new Date().toISOString(),
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const req = registryService.createRequest(newDomain, 'T', currentUser?.email || 'customer');
    setDomains(prev => [newDomain, ...prev]);
    setRegistryRequests(prev => [req, ...prev]);
    showNotification(`Transfer request for ${domainName} submitted.`, 'success');
  };

  const submitRegistryRequest = async (requestId: string) => {
    const target = registryRequests.find(r => r.id === requestId);
    if (!target) return;

    const res = await registryService.submitToRegistry(target);
    setRegistryRequests(prev => prev.map(r => r.id === requestId ? res.updatedRequest : r));
    
    // Also record in domain history
    setDomains(prev => prev.map(d => {
      if (d.id === target.domain_id || d.domain_name === target.domain_name) {
        return {
          ...d,
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 7),
              domain_id: d.id,
              action: target.action === 'N' ? 'NEW' : target.action === 'M' ? 'MODIFY' : target.action === 'D' ? 'DELETE' : 'TRANSFER',
              description: `Email dispatched to admin@registry.org.zw from dns@runtime.co.zw (${target.email_subject})`,
              status: 'submitted',
              actor: currentUser?.email || 'dns@runtime.co.zw',
              created_at: new Date().toISOString(),
            }
          ]
        };
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

        return {
          ...d,
          status: newStatus,
          registered_at: d.registered_at || now.toISOString(),
          expires_at: d.expires_at || nextYear.toISOString(),
          updated_at: now.toISOString(),
          history: [
            ...d.history,
            {
              id: 'hist-' + Math.random().toString(36).substring(2, 7),
              domain_id: d.id,
              action: target.action === 'N' ? 'NEW' : target.action === 'M' ? 'MODIFY' : target.action === 'D' ? 'DELETE' : 'TRANSFER',
              description: `domain registry confirmation verified. Action ${target.action} is now active.`,
              status: 'confirmed',
              actor: 'admin@registry.org.zw',
              created_at: now.toISOString(),
            }
          ]
        };
      }
      return d;
    }));

    showNotification(`Registry action for ${target.domain_name} (${target.action}) confirmed!`, 'success');
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
    showNotification('Syncing upstream prices from clientzone.runtime.co.zw...', 'info');
    await new Promise(r => setTimeout(r, 600));
    setPricing(prev => prev.map(p => ({
      ...p,
      upstream_price: 1.80,
      updated_at: new Date().toISOString(),
    })));
    showNotification('Upstream pricing synchronized with Runtime registrar proxy.', 'success');
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
      registerNewDomain,
      updateDomainNameservers,
      requestDomainModify,
      requestDomainDelete,
      requestDomainTransfer,
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

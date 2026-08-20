export type UserRole = 'super_admin' | 'registry_admin' | 'billing_admin' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organisation?: string;
  phone?: string;
  email_verified_at?: string | null;
  created_at: string;
}

export type RegistrantType = 'myself' | 'client';

export interface RegistrantDetails {
  full_name: string;
  org_name?: string;
  physical_address: string;
  postal_address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  org_description: string;
  proposed_usage: string;
}

export type DomainStatus = 
  | 'pending' 
  | 'pending_registration' 
  | 'active' 
  | 'pending_transfer' 
  | 'pending_delete' 
  | 'expired' 
  | 'cancelled' 
  | 'suspended';

export interface DomainHistoryItem {
  id: string;
  domain_id: string;
  action: 'NEW' | 'MODIFY' | 'TRANSFER' | 'DELETE' | 'RENEWAL' | 'STATUS_CHANGE';
  description: string;
  status: string;
  actor: string;
  created_at: string;
}

export interface Domain {
  id: string;
  domain_name: string;
  tld: string;
  user_id: string;
  user_email: string;
  status: DomainStatus;
  nameservers: string[];
  auto_renew: boolean;
  registered_at?: string;
  expires_at?: string;
  renewal_price: number;
  currency: string;
  registrant_type: RegistrantType;
  owner_details: RegistrantDetails;
  history: DomainHistoryItem[];
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  item_type: 'domain_registration' | 'domain_renewal' | 'domain_transfer' | 'cloud_compute' | 'database' | 'storage' | 'application_hosting' | 'api_usage';
  reference_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Order {
  id: string;
  user_id: string;
  user_email: string;
  reference: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export type PaymentStatus = 'pending' | 'verified' | 'failed';
export type PaymentGateway = 'paynow' | 'ecocash' | 'innbucks' | 'stripe_card' | 'bank_transfer';

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  reference: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  verified_at?: string;
  created_at: string;
}

export interface TldPricing {
  id: string;
  tld: string;
  upstream_price: number;
  runtime_registration_price: number;
  runtime_renewal_price: number;
  registry_cost: number;
  currency: string;
  active: boolean;
  updated_at: string;
}

export type ZispaAction = 'N' | 'M' | 'D' | 'T';
export type RegistryRequestStatus = 'draft' | 'ready' | 'submitted' | 'awaiting_confirmation' | 'confirmed' | 'failed' | 'cancelled';

export interface RegistryRequest {
  id: string;
  domain_id: string;
  domain_name: string;
  action: ZispaAction;
  generated_template: string;
  status: RegistryRequestStatus;
  submitted_at?: string;
  confirmed_at?: string;
  submitted_by?: string;
  email_subject: string;
  registry_response_notes?: string;
  customer_email: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  default_nameservers: string[];
  registry_email_from: string;
  registry_email_to: string;
  auto_submit_zispa: boolean;
  platform_name: string;
  operator_name: string;
  support_email: string;
}

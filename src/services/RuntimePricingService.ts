import { TldPricing } from '../types';

export class RuntimePricingService {
  /**
   * Default initial TLD pricing catalog
   */
  private initialPricing: TldPricing[] = [
    {
      id: 'price-co-zw',
      tld: '.co.zw',
      upstream_price: 1.80,
      runtime_registration_price: 2.00, // Explicitly fixed at $2.00/year
      runtime_renewal_price: 2.00,
      registry_cost: 1.50,
      currency: 'USD',
      active: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'price-org-zw',
      tld: '.org.zw',
      upstream_price: 1.80,
      runtime_registration_price: 3.00,
      runtime_renewal_price: 3.00,
      registry_cost: 1.50,
      currency: 'USD',
      active: true,
      updated_at: new Date().toISOString(),
    },
    {
      id: 'price-ac-zw',
      tld: '.ac.zw',
      upstream_price: 1.80,
      runtime_registration_price: 3.00,
      runtime_renewal_price: 3.00,
      registry_cost: 1.50,
      currency: 'USD',
      active: true,
      updated_at: new Date().toISOString(),
    }
  ];

  getInitialPricing(): TldPricing[] {
    return this.initialPricing;
  }

  getTldPrice(tld: string, pricingList: TldPricing[]): number {
    const item = pricingList.find(p => p.tld.toLowerCase() === tld.toLowerCase() && p.active);
    return item ? item.runtime_registration_price : 2.00;
  }

  calculateMargin(pricing: TldPricing): number {
    return Math.round((pricing.runtime_registration_price - pricing.registry_cost) * 100) / 100;
  }
}

export const runtimePricingService = new RuntimePricingService();

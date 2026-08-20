export interface DomainAvailabilityResult {
  domain: string;
  sld: string;
  tld: string;
  isAvailable: boolean;
  price: number;
  currency: string;
  reason?: string;
  restrictions?: string[];
}

export interface DomainAvailabilityProvider {
  check(domain: string): Promise<DomainAvailabilityResult>;
}

/**
 * Standard ZISPA / Ngaatec Domain Availability Provider
 * Validates syntax, reserved namespaces, and registry state
 */
export class ZispaDomainAvailabilityProvider implements DomainAvailabilityProvider {
  // Known reserved or registered domains for realistic simulation
  private takenDomains = new Set([
    'google.co.zw',
    'ecocash.co.zw',
    'econet.co.zw',
    'herald.co.zw',
    'cbz.co.zw',
    'runtime.co.zw',
    'ngaatec.co.zw',
    'techzim.co.zw',
    'gov.zw',
    'parliament.co.zw',
    'reservebank.co.zw',
    'paynow.co.zw',
    'liquid.co.zw',
    'zesa.co.zw'
  ]);

  async check(domain: string): Promise<DomainAvailabilityResult> {
    const cleanDomain = domain.trim().toLowerCase();
    
    // Normalize domain with default .co.zw if not provided
    let sld = cleanDomain;
    let tld = '.co.zw';

    if (cleanDomain.includes('.')) {
      const parts = cleanDomain.split('.');
      sld = parts[0];
      tld = '.' + parts.slice(1).join('.');
    }

    const fullDomain = `${sld}${tld}`;

    // RFC & ZISPA syntax rules validation
    if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(sld)) {
      return {
        domain: fullDomain,
        sld,
        tld,
        isAvailable: false,
        price: 2.0,
        currency: 'USD',
        reason: 'Invalid domain name format. Only letters, numbers, and hyphens (not at beginning or end) are allowed.',
      };
    }

    if (sld.length < 2) {
      return {
        domain: fullDomain,
        sld,
        tld,
        isAvailable: false,
        price: 2.0,
        currency: 'USD',
        reason: 'Domain name must be at least 2 characters.',
      };
    }

    // Simulate network latency like real registry lookup
    await new Promise((resolve) => setTimeout(resolve, 300));

    const isTaken = this.takenDomains.has(fullDomain);

    return {
      domain: fullDomain,
      sld,
      tld,
      isAvailable: !isTaken,
      price: 2.0, // Fixed $2.00/yr for .co.zw
      currency: 'USD',
      reason: isTaken ? 'This domain is currently registered in the ZISPA registry.' : undefined,
    };
  }
}

export class DomainAvailabilityService {
  private provider: DomainAvailabilityProvider;

  constructor(provider?: DomainAvailabilityProvider) {
    this.provider = provider || new ZispaDomainAvailabilityProvider();
  }

  setProvider(provider: DomainAvailabilityProvider) {
    this.provider = provider;
  }

  async checkAvailability(domain: string): Promise<DomainAvailabilityResult> {
    return this.provider.check(domain);
  }
}

export const domainAvailabilityService = new DomainAvailabilityService();

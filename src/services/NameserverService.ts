export class NameserverService {
  private defaultNameservers: string[] = [
    'ns1.runtime.co.zw',
    'ns2.runtime.co.zw',
    'ns3.runtime.co.zw',
    'ns4.runtime.co.zw',
  ];

  getDefaultNameservers(): string[] {
    return [...this.defaultNameservers];
  }

  validateNameservers(nameservers: string[]): { valid: boolean; error?: string } {
    const cleaned = nameservers.map(n => n.trim()).filter(Boolean);

    if (cleaned.length < 2) {
      return {
        valid: false,
        error: 'At least two (2) nameservers are required for domain delegation under domain registry policy.',
      };
    }

    if (cleaned.length > 4) {
      return {
        valid: false,
        error: 'A maximum of four (4) nameservers are supported.',
      };
    }

    // Hostname regex validation
    const hostnameRegex = /^([a-zA-Z0-9_]{1}[a-zA-Z0-9_-]{0,62}){1}(\.[a-zA-Z0-9_]{1}[a-zA-Z0-9_-]{0,62})+$/;

    for (const ns of cleaned) {
      if (!hostnameRegex.test(ns)) {
        return {
          valid: false,
          error: `Invalid nameserver hostname format: "${ns}". Expected format: ns1.example.com`,
        };
      }
    }

    // Check duplicates
    const unique = new Set(cleaned.map(n => n.toLowerCase()));
    if (unique.size !== cleaned.length) {
      return {
        valid: false,
        error: 'Primary and secondary nameservers must be distinct hostnames.',
      };
    }

    return { valid: true };
  }
}

export const nameserverService = new NameserverService();

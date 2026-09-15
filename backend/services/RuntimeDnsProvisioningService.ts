import { promises as dns } from 'node:dns';

import {
  adminDb,
} from '../firebaseAdmin.js';

import {
  cloudflareDnsService,
} from './CloudflareDnsService.js';

const LEGACY_RUNTIME_DEFAULT_NAMESERVERS = [
  'ns1.ngaatec.com',
  'ns2.ngaatec.com',
];

const normalizeNameservers = (
  value: unknown
): string[] =>
  Array.isArray(value)
    ? value
        .map((item) =>
          String(item || '')
            .trim()
            .replace(/\.$/, '')
            .toLowerCase()
        )
        .filter(Boolean)
    : [];

const sameNameservers = (
  left: string[],
  right: string[]
) =>
  left.length === right.length &&
  left.every(
    (value, index) =>
      value === right[index]
  );

const resolveOne = async (
  hostname: string
): Promise<string> => {
  try {
    const ipv4 =
      await dns.resolve4(hostname);

    if (ipv4[0]) {
      return ipv4[0];
    }
  } catch {
    // Fall back to IPv6.
  }

  try {
    const ipv6 =
      await dns.resolve6(hostname);

    if (ipv6[0]) {
      return ipv6[0];
    }
  } catch {
    // Report below.
  }

  throw new Error(
    `Unable to resolve Cloudflare nameserver ${hostname}.`
  );
};

export type RuntimeDnsProvisioningResult = {
  handled: boolean;
  domainId: string;
  domainName?: string;
  reason?: string;
  zoneId?: string;
  zoneStatus?: string;
  nameservers?: string[];
  nameserverIps?: string[];
};

class RuntimeDnsProvisioningService {
  async provisionPaidRegistration(
    domainId: string
  ): Promise<RuntimeDnsProvisioningResult> {
    const cleanDomainId =
      String(domainId || '').trim();

    if (!cleanDomainId) {
      return {
        handled: false,
        domainId: '',
        reason: 'No domain ID was supplied.',
      };
    }

    const domainRef =
      adminDb
        .collection('domains')
        .doc(cleanDomainId);

    const snapshot =
      await domainRef.get();

    if (!snapshot.exists) {
      return {
        handled: false,
        domainId: cleanDomainId,
        reason: 'Domain document was not found.',
      };
    }

    const domain = snapshot.data()!;
    const domainName =
      cloudflareDnsService.normalizeDomain(
        domain.domain_name
      );

    if (!domainName) {
      return {
        handled: false,
        domainId: cleanDomainId,
        reason: 'Domain name is missing.',
      };
    }

    const currentNameservers =
      normalizeNameservers(
        domain.nameservers
      );

    const dnsProvider =
      String(
        domain.dns_provider || ''
      )
        .trim()
        .toLowerCase();

    /*
     * Production migration rule:
     * - A newly registered domain that still carries Runtime's old
     *   default pair means the customer selected "Runtime DNS - Free".
     * - A domain already marked cloudflare is safe to resume/retry.
     * - Any other nameservers are customer-supplied and MUST NOT be
     *   replaced automatically.
     *
     * This also protects every existing live domain that still uses
     * old/custom DNS because this service is called only from a fully
     * paid domain_registration fulfillment result.
     */
    const selectedRuntimeDns =
      dnsProvider === 'cloudflare' ||
      dnsProvider === 'runtime' ||
      sameNameservers(
        currentNameservers,
        LEGACY_RUNTIME_DEFAULT_NAMESERVERS
      );

    if (!selectedRuntimeDns) {
      return {
        handled: false,
        domainId: cleanDomainId,
        domainName,
        reason:
          'Customer selected custom nameservers. Runtime DNS provisioning skipped.',
      };
    }

    const now =
      new Date().toISOString();

    try {
      const zone =
        await cloudflareDnsService
          .createZone(domainName);

      const nameservers =
        normalizeNameservers(
          zone.name_servers
        );

      if (nameservers.length < 2) {
        throw new Error(
          'Cloudflare did not return at least two assigned nameservers.'
        );
      }

      const nameserverIps =
        await Promise.all(
          nameservers.map(resolveOne)
        );

      const zoneStatus =
        String(
          zone.status || 'pending'
        )
          .trim()
          .toLowerCase();

      await domainRef.set(
        {
          dns_provider: 'cloudflare',
          dns_status:
            zoneStatus === 'active'
              ? 'active'
              : 'pending',
          nameservers,
          nameserver_ips:
            nameserverIps,
          cloudflare: {
            ...(domain.cloudflare || {}),
            zone_id: zone.id,
            status:
              zoneStatus || 'pending',
            provisioned_at:
              domain.cloudflare
                ?.provisioned_at || now,
            ...(zoneStatus === 'active'
              ? {
                  activated_at:
                    domain.cloudflare
                      ?.activated_at || now,
                }
              : {}),
            last_synced_at: now,
            last_error: null,
          },
          updated_at: now,
        },
        { merge: true }
      );

      return {
        handled: true,
        domainId: cleanDomainId,
        domainName,
        zoneId: zone.id,
        zoneStatus:
          zoneStatus || 'pending',
        nameservers,
        nameserverIps,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to provision Runtime DNS.';

      await domainRef.set(
        {
          dns_provider: 'cloudflare',
          dns_status:
            'provisioning_failed',
          cloudflare: {
            ...(domain.cloudflare || {}),
            last_error: message,
            last_attempt_at: now,
          },
          updated_at: now,
        },
        { merge: true }
      );

      throw error;
    }
  }
}

export const runtimeDnsProvisioningService =
  new RuntimeDnsProvisioningService();

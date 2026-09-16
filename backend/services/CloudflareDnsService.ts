import nodeFetch from 'node-fetch';

const CLOUDFLARE_API_BASE =
  'https://api.cloudflare.com/client/v4';

type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{
    code?: number;
    message?: string;
  }>;
  messages?: Array<{
    code?: number;
    message?: string;
  }>;
};

export type CloudflareZone = {
  id: string;
  name: string;
  status?: string;
  name_servers?: string[];
  original_name_servers?: string[];
  activated_on?: string | null;
};

export type CloudflareDnsRecord = {
  id: string; type: string; name: string; content: string; ttl: number;
  proxied?: boolean; proxiable?: boolean; priority?: number;
  data?: { priority?: number; weight?: number; port?: number; target?: string };
  created_on?: string; modified_on?: string;
};
export type CloudflareDnsRecordInput = {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'CAA' | 'SRV';
  name: string; content: string; ttl?: number; proxied?: boolean; priority?: number;
  data?: { priority: number; weight: number; port: number; target: string };
};

const normalizeDomain = (
  value: unknown
) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');

const getConfig = () => {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID
      ?.trim();

  const apiToken =
    process.env.CLOUDFLARE_API_TOKEN
      ?.trim();

  if (!accountId || !apiToken) {
    throw new Error(
      'Cloudflare DNS is not configured.'
    );
  }

  return {
    accountId,
    apiToken,
  };
};

const cloudflareRequest =
  async <T>(
    path: string,
    init: {
      method?: string;
      body?: unknown;
    } = {}
  ): Promise<T> => {
    const {
      apiToken,
    } = getConfig();

    const response =
      await nodeFetch(
        `${CLOUDFLARE_API_BASE}${path}`,
        {
          method:
            init.method || 'GET',
          headers: {
            Authorization:
              `Bearer ${apiToken}`,
            Accept:
              'application/json',
            ...(init.body !== undefined
              ? {
                  'Content-Type':
                    'application/json',
                }
              : {}),
          },
          ...(init.body !== undefined
            ? {
                body:
                  JSON.stringify(
                    init.body
                  ),
              }
            : {}),
        }
      );

    let payload:
      CloudflareEnvelope<T> | null =
        null;

    try {
      payload =
        await response.json() as
          CloudflareEnvelope<T>;
    } catch {
      payload = null;
    }

    if (
      !response.ok ||
      !payload ||
      payload.success !== true
    ) {
      const message =
        payload?.errors
          ?.map(
            (item) =>
              item.message
          )
          .filter(Boolean)
          .join('; ') ||
        `Cloudflare API request failed with HTTP ${response.status}.`;

      throw new Error(message);
    }

    return payload.result;
  };

export const cloudflareDnsService = {
  normalizeDomain,

  isConfigured() {
    try {
      getConfig();
      return true;
    } catch {
      return false;
    }
  },

  async verifyToken() {
    return cloudflareRequest<{
      id: string;
      status: string;
      expires_on?: string;
      not_before?: string;
    }>(
      '/user/tokens/verify'
    );
  },

  async listZone(
    domainName: string
  ): Promise<CloudflareZone | null> {
    const {
      accountId,
    } = getConfig();

    const domain =
      normalizeDomain(
        domainName
      );

    const zones =
      await cloudflareRequest<
        CloudflareZone[]
      >(
        `/zones?name=${encodeURIComponent(
          domain
        )}&account.id=${encodeURIComponent(
          accountId
        )}&per_page=20`
      );

    return (
      zones.find(
        (zone) =>
          normalizeDomain(
            zone.name
          ) === domain
      ) ||
      null
    );
  },

  async createZone(
    domainName: string
  ): Promise<CloudflareZone> {
    const {
      accountId,
    } = getConfig();

    const domain =
      normalizeDomain(
        domainName
      );

    if (!domain) {
      throw new Error(
        'A domain name is required.'
      );
    }

    /*
     * Idempotency/safety:
     * never create a duplicate zone if Runtime
     * already provisioned this domain.
     */
    const existing =
      await this.listZone(
        domain
      );

    if (existing) {
      return existing;
    }

    return cloudflareRequest<
      CloudflareZone
    >(
      '/zones',
      {
        method: 'POST',
        body: {
          account: {
            id: accountId,
          },
          name: domain,
          type: 'full',
        },
      }
    );
  },

  async getZone(
    zoneId: string
  ): Promise<CloudflareZone> {
    return cloudflareRequest<CloudflareZone>(`/zones/${encodeURIComponent(zoneId)}`);
  },
  async listDnsRecords(zoneId: string): Promise<CloudflareDnsRecord[]> {
    return cloudflareRequest<CloudflareDnsRecord[]>(`/zones/${encodeURIComponent(zoneId)}/dns_records?per_page=100&order=type&direction=asc`);
  },

  async triggerDnsScan(zoneId: string): Promise<unknown> {
    return cloudflareRequest<unknown>(
      `/zones/${encodeURIComponent(zoneId)}/dns_records/scan/trigger`,
      { method: 'POST' }
    );
  },

  async listScannedDnsRecords(zoneId: string): Promise<CloudflareDnsRecord[]> {
    return cloudflareRequest<CloudflareDnsRecord[]>(
      `/zones/${encodeURIComponent(zoneId)}/dns_records/scan/review`
    );
  },

  async reviewScannedDnsRecords(
    zoneId: string,
    accepts: CloudflareDnsRecord[],
    rejects: CloudflareDnsRecord[]
  ): Promise<unknown> {
    return cloudflareRequest<unknown>(
      `/zones/${encodeURIComponent(zoneId)}/dns_records/scan/review`,
      {
        method: 'POST',
        body: { accepts, rejects },
      }
    );
  },
  async createDnsRecord(zoneId: string, input: CloudflareDnsRecordInput): Promise<CloudflareDnsRecord> {
    return cloudflareRequest<CloudflareDnsRecord>(`/zones/${encodeURIComponent(zoneId)}/dns_records`, { method: 'POST', body: input });
  },
  async updateDnsRecord(zoneId: string, recordId: string, input: CloudflareDnsRecordInput): Promise<CloudflareDnsRecord> {
    return cloudflareRequest<CloudflareDnsRecord>(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: 'PUT', body: input });
  },
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<{ id: string }> {
    return cloudflareRequest<{ id: string }>(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
  },
};

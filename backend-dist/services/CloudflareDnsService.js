import nodeFetch from 'node-fetch';
const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';
const normalizeDomain = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');
const getConfig = () => {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
        ?.trim();
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
        ?.trim();
    if (!accountId || !apiToken) {
        throw new Error('Cloudflare DNS is not configured.');
    }
    return {
        accountId,
        apiToken,
    };
};
const cloudflareRequest = async (path, init = {}) => {
    const { apiToken, } = getConfig();
    const response = await nodeFetch(`${CLOUDFLARE_API_BASE}${path}`, {
        method: init.method || 'GET',
        headers: {
            Authorization: `Bearer ${apiToken}`,
            Accept: 'application/json',
            ...(init.body !== undefined
                ? {
                    'Content-Type': 'application/json',
                }
                : {}),
        },
        ...(init.body !== undefined
            ? {
                body: JSON.stringify(init.body),
            }
            : {}),
    });
    let payload = null;
    try {
        payload =
            await response.json();
    }
    catch {
        payload = null;
    }
    if (!response.ok ||
        !payload ||
        payload.success !== true) {
        const message = payload?.errors
            ?.map((item) => item.message)
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
        }
        catch {
            return false;
        }
    },
    async verifyToken() {
        return cloudflareRequest('/user/tokens/verify');
    },
    async listZone(domainName) {
        const { accountId, } = getConfig();
        const domain = normalizeDomain(domainName);
        const zones = await cloudflareRequest(`/zones?name=${encodeURIComponent(domain)}&account.id=${encodeURIComponent(accountId)}&per_page=20`);
        return (zones.find((zone) => normalizeDomain(zone.name) === domain) ||
            null);
    },
    async createZone(domainName) {
        const { accountId, } = getConfig();
        const domain = normalizeDomain(domainName);
        if (!domain) {
            throw new Error('A domain name is required.');
        }
        /*
         * Idempotency/safety:
         * never create a duplicate zone if Runtime
         * already provisioned this domain.
         */
        const existing = await this.listZone(domain);
        if (existing) {
            return existing;
        }
        return cloudflareRequest('/zones', {
            method: 'POST',
            body: {
                account: {
                    id: accountId,
                },
                name: domain,
                type: 'full',
            },
        });
    },
    async getZone(zoneId) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}`);
    },
    async listDnsRecords(zoneId) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records?per_page=100&order=type&direction=asc`);
    },
    async triggerDnsScan(zoneId) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records/scan/trigger`, { method: 'POST' });
    },
    async listScannedDnsRecords(zoneId) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records/scan/review`);
    },
    async reviewScannedDnsRecords(zoneId, accepts, rejects) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records/scan/review`, {
            method: 'POST',
            body: { accepts, rejects },
        });
    },
    async createDnsRecord(zoneId, input) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records`, { method: 'POST', body: input });
    },
    async updateDnsRecord(zoneId, recordId, input) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: 'PUT', body: input });
    },
    async deleteDnsRecord(zoneId, recordId) {
        return cloudflareRequest(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`, { method: 'DELETE' });
    },
};

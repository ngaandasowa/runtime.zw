import { isIP } from 'node:net';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin.js';
import { CloudflareDnsRecordInput } from './CloudflareDnsService.js';

export const DNS_TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'CAA', 'SRV']);
export const PROXY_TYPES = new Set(['A', 'AAAA', 'CNAME']);

const s = (value: unknown) => String(value ?? '').trim();

export function normalizeRecordName(value: unknown, domain: string) {
  const name = s(value).toLowerCase().replace(/\.$/, '');
  if (!name || name === '@') return domain;
  if (name === domain || name.endsWith(`.${domain}`)) return name;
  if (!/^[a-z0-9_*.-]+$/i.test(name)) throw new Error('Enter a valid DNS record name.');
  return `${name}.${domain}`;
}

function hostname(value: unknown, label: string) {
  const host = s(value).toLowerCase().replace(/\.$/, '');
  if (!host || host.length > 253 || !/^[a-z0-9._-]+$/i.test(host)) {
    throw new Error(`${label} must be a valid hostname.`);
  }
  return host;
}

function integer(value: unknown, label: string, min = 0, max = 65535) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

function normalizeTtl(value: unknown) {
  const raw = Number(value ?? 1);
  if (raw === 1) return 1;
  if (!Number.isInteger(raw) || raw < 60 || raw > 86400) {
    throw new Error('TTL must be Auto or between 60 and 86400 seconds.');
  }
  return raw;
}

export function dnsInput(body: any, domain: string): CloudflareDnsRecordInput {
  const type = s(body?.type).toUpperCase();
  if (!DNS_TYPES.has(type)) {
    throw new Error('Supported record types are A, AAAA, CNAME, MX, TXT, CAA and SRV.');
  }

  const ttl = normalizeTtl(body?.ttl);
  const name = normalizeRecordName(body?.name, domain);
  const value = s(body?.value ?? body?.content);

  if (type === 'A' && isIP(value) !== 4) throw new Error('Value must be a valid IPv4 address.');
  if (type === 'AAAA' && isIP(value) !== 6) throw new Error('Value must be a valid IPv6 address.');

  if (type === 'CNAME') {
    const target = hostname(value, 'CNAME value');
    if (target === name) throw new Error('A CNAME cannot point to itself.');
  }

  if (type === 'MX') hostname(value, 'MX value');
  if ((type === 'TXT' || type === 'CAA') && !value) throw new Error(`${type} value is required.`);

  if (type === 'SRV') {
    const target = hostname(body?.target ?? value, 'SRV target');
    const priority = integer(body?.priority, 'SRV priority');
    const weight = integer(body?.weight, 'SRV weight');
    const port = integer(body?.port, 'SRV port');

    return {
      type: 'SRV',
      name,
      content: `${weight} ${port} ${target}`,
      ttl,
      proxied: false,
      data: { priority, weight, port, target },
    };
  }

  if (!value) throw new Error('Record value is required.');

  const input: CloudflareDnsRecordInput = {
    type: type as CloudflareDnsRecordInput['type'],
    name,
    content: value,
    ttl,
    proxied: PROXY_TYPES.has(type) ? Boolean(body?.proxied) : false,
  };

  if (type === 'MX') {
    input.priority = integer(body?.priority, 'MX priority');
    input.proxied = false;
  }

  return input;
}

export async function dnsAudit(input: {
  domainId: string;
  domainName: string;
  actorUid: string;
  actorEmail?: string;
  actorRole: 'customer' | 'admin';
  action: 'create' | 'update' | 'delete';
  recordId?: string;
  record?: any;
}) {
  await adminDb.collection('dns_activity').add({
    ...input,
    created_at: FieldValue.serverTimestamp(),
  });
}

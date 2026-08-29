import {
  Domain,
  RegistrantDetails,
  User,
} from '../types';

import {
  domainRepository,
} from './DomainRepository';

import {
  adminAuditService,
} from './AdminAuditService';

export interface AssignDomainInput {
  customer: User;

  domainName: string;

  registrationPrice: number;
  renewalPrice: number;

  registeredAt: string;
  expiresAt: string;

  nameservers: string[];
  nameserverIps?: string[];

  ownerDetails:
    RegistrantDetails;

  admin: User;
}

const getTld = (
  domain: string
) => {
  const normalized =
    domain
      .trim()
      .toLowerCase();

  const supported = [
    '.org.zw',
    '.ac.zw',
    '.co.zw',
  ];

  const match =
    supported.find(
      (tld) =>
        normalized.endsWith(
          tld
        )
    );

  if (match) {
    return match;
  }

  const parts =
    normalized.split('.');

  return parts.length > 1
    ? `.${parts.slice(1).join('.')}`
    : '';
};

class AdminDomainService {
  async assignDomain(
    input: AssignDomainInput
  ): Promise<Domain> {
    if (
      input.admin.role !==
      'super_admin'
    ) {
      throw new Error(
        'Administrator permission required.'
      );
    }

    const domainName =
      input.domainName
        .trim()
        .toLowerCase();

    if (!domainName) {
      throw new Error(
        'Domain name is required.'
      );
    }

    if (
      input.nameservers.length <
      2
    ) {
      throw new Error(
        'At least two nameservers are required.'
      );
    }

    const now =
      new Date().toISOString();

    const domainId =
      `dom-${crypto.randomUUID()}`;

    const domain: Domain = {
      id:
        domainId,

      domain_name:
        domainName,

      tld:
        getTld(
          domainName
        ),

      user_id:
        input.customer.id,

      user_email:
        input.customer.email,

      status:
        'active',

      nameservers:
        input.nameservers,

      nameserver_ips:
        input.nameserverIps ||
        [],

      auto_renew:
        false,

      registration_price:
        input.registrationPrice,

      renewal_price:
        input.renewalPrice,

      currency:
        'USD',

      registrant_type:
        'myself',

      owner_details:
        input.ownerDetails,

      registered_at:
        input.registeredAt,

      expires_at:
        input.expiresAt,

      history: [
        {
          id:
            `hist-${crypto.randomUUID()}`,

          domain_id:
            domainId,

          action:
            'NEW',

          description:
            'Domain manually assigned to customer by Runtime administrator.',

          status:
            'confirmed',

          actor:
            input.admin.email,

          created_at:
            now,
        },
      ],

      created_at:
        now,

      updated_at:
        now,
    };

    await domainRepository
      .createDomain(
        domain
      );

    await adminAuditService.log({
      admin_user_id:
        input.admin.id,

      admin_email:
        input.admin.email,

      target_user_id:
        input.customer.id,

      target_user_email:
        input.customer.email,

      action:
        'DOMAIN_ASSIGNED',

      resource_type:
        'domain',

      resource_id:
        domain.id,

      resource_name:
        domain.domain_name,

      after: {
        status:
          domain.status,

        registered_at:
          domain.registered_at,

        expires_at:
          domain.expires_at,

        nameservers:
          domain.nameservers,

        registration_price:
          domain.registration_price,

        renewal_price:
          domain.renewal_price,
      },

      description:
        `${domain.domain_name} was manually assigned to ${input.customer.email}.`,
    });

    return domain;
  }
}

export const adminDomainService =
  new AdminDomainService();
export type WhoisContact = {
  name?: string;
  organization?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type WhoisDetails = {
  domain?: string;

  status?: string[];

  registrar?: string;
  registrarUrl?: string;
  registrarWhoisServer?: string;
  registrarIanaId?: string;

  createdDate?: string;
  updatedDate?: string;
  expiryDate?: string;

  nameservers?: string[];

  dnssec?: string;

  registrant?: WhoisContact;
  administrative?: WhoisContact;
  technical?: WhoisContact;

  raw?: unknown;
};

export type DomainAvailabilityResult = {
  domain: string;
  isAvailable: boolean;
  reason?: string;
  price?: number;
  checkingFailed?: boolean;
  registrationEligible?: boolean;
  eligibilityReason?: string;
  registryApprovalRequired?: boolean;
  whois?: WhoisDetails;
};

export type DomainPricingRow = {
  tld: string;
  register?: number;
  renew?: number;
  transfer?: number;
};

import { analyticsService } from './AnalyticsService';

export const getCoZwRegistrationEligibility = (rawDomain: string) => {
  const domain = rawDomain.trim().toLowerCase().replace(/\.$/, '');

  if (!domain.endsWith('.co.zw')) {
    return { eligible: true, registryApprovalRequired: false };
  }

  const label = domain.slice(0, -'.co.zw'.length);

  // Operational ZISPA restriction communicated to Runtime:
  // one- and two-character .co.zw names are not accepted for registration.
  if (label.length < 3) {
    return {
      eligible: false,
      registryApprovalRequired: true,
      reason: '.co.zw domain names must contain at least 3 characters before .co.zw.',
    };
  }

  return { eligible: true, registryApprovalRequired: true };
};

const API_BASE =
  'https://clientzone.ngaatec.com/api-proxy.php';

export const RUNTIME_ZW_PRICES: Record<
  string,
  {
    register: number;
    renew: number;
    transfer: number;
  }
> = {
  '.co.zw': {
    register: 2,
    renew: 2,
    transfer: 2,
  },

   '.com': {
    register: 14,
    renew: 14,
    transfer: 15,
  },

  '.org.zw': {
    register: 3,
    renew: 3,
    transfer: 3,
  },

  '.ac.zw': {
    register: 3,
    renew: 3,
    transfer: 3,
  },
};

export const MANUAL_ZW_TLDS = [
  '.org.zw',
  '.ac.zw',
] as const;  

export const POPULAR_EXTENSIONS = [
  '.co.zw',
  '.com',

];

class DomainService {
  private pricingCache: DomainPricingRow[] | null = null;

  /*
   * ------------------------------------------------------------
   * CLEAN DOMAIN INPUT
   * ------------------------------------------------------------
   */

  cleanDomain(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('?')[0]
      .split('#')[0]
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/^\.+|\.+$/g, '')
      .replace(/\.{2,}/g, '.');
  }

  /*
   * ------------------------------------------------------------
   * PRICE PARSER
   * ------------------------------------------------------------
   */

  private parsePrice(value: unknown) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isNaN(value)
        ? undefined
        : value;
    }

    const parsed = parseFloat(
      String(value).replace(/[^0-9.]/g, '')
    );

    return Number.isNaN(parsed)
      ? undefined
      : parsed;
  }

  /*
   * ------------------------------------------------------------
   * LOAD ALL DOMAIN PRICING
   * ------------------------------------------------------------
   */

  async getPricing(
    forceRefresh = false
  ): Promise<DomainPricingRow[]> {
    if (
      this.pricingCache &&
      !forceRefresh
    ) {
      return this.pricingCache;
    }

    const response = await fetch(
      `${API_BASE}?action=GetTLDPricing`
    );

    if (!response.ok) {
      throw new Error(
        'Unable to load domain pricing'
      );
    }

    const data =
      await response.json();

    const pricingObject =
      data?.pricing ??
      data?.data?.pricing ??
      data?.result?.pricing ??
      {};

    const rows: DomainPricingRow[] =
      Object.entries(
        pricingObject
      ).map(
        ([rawTld, rawPricing]: [
          string,
          any
        ]) => {
          /*
           * Your WHMCS proxy can return:
           *
           * com
           *
           * instead of:
           *
           * .com
           */
          const tld =
            rawTld.startsWith('.')
              ? rawTld.toLowerCase()
              : `.${rawTld.toLowerCase()}`;

          return {
            tld,

            register: this.parsePrice(
              rawPricing?.register?.[
                '1'
              ] ??
                rawPricing?.register?.[
                  1
                ] ??
                rawPricing?.registration?.[
                  '1'
                ] ??
                rawPricing?.registration?.[
                  1
                ]
            ),

            renew: this.parsePrice(
              rawPricing?.renew?.['1'] ??
                rawPricing?.renew?.[1] ??
                rawPricing?.renewal?.[
                  '1'
                ] ??
                rawPricing?.renewal?.[1]
            ),

            transfer: this.parsePrice(
              rawPricing?.transfer?.[
                '1'
              ] ??
                rawPricing?.transfer?.[1]
            ),
          };
        }
      );

    /*
     * Keep the popular TLDs first.
     */
    rows.sort((a, b) => {
      const aIndex =
        POPULAR_EXTENSIONS.indexOf(
          a.tld
        );

      const bIndex =
        POPULAR_EXTENSIONS.indexOf(
          b.tld
        );

      if (
        aIndex !== -1 &&
        bIndex !== -1
      ) {
        return aIndex - bIndex;
      }

      if (aIndex !== -1) {
        return -1;
      }

      if (bIndex !== -1) {
        return 1;
      }

      return a.tld.localeCompare(
        b.tld
      );
    });

    this.pricingCache = rows;

    return rows;
  }

  /*
   * ------------------------------------------------------------
   * SUPPORTED TLDS
   * ------------------------------------------------------------
   */

  async getSupportedTlds() {
    const pricing =
      await this.getPricing();

    return pricing.map(
      (item) => item.tld
    );
  }

  /*
   * ------------------------------------------------------------
   * GET DOMAIN PRICE
   * ------------------------------------------------------------
   */

  async getDomainPrice(
  domain: string
): Promise<number | undefined> {
  const normalized =
    this.cleanDomain(domain);

  /*
   * Runtime-controlled Zimbabwe pricing
   * must always override upstream pricing.
   */
  const fixedTld =
    Object.keys(
      RUNTIME_ZW_PRICES
    )
      .sort(
        (a, b) =>
          b.length -
          a.length
      )
      .find((tld) =>
        normalized.endsWith(
          tld
        )
      );

  if (fixedTld) {
    return (
      RUNTIME_ZW_PRICES[
        fixedTld
      ].register
    );
  }

  /*
   * Everything else comes from
   * the Ngaatec pricing API.
   */
  try {
    const pricing =
      await this.getPricing();

    const match =
      [...pricing]
        .sort(
          (a, b) =>
            b.tld.length -
            a.tld.length
        )
        .find((item) =>
          normalized.endsWith(
            item.tld
          )
        );

    return match?.register;
  } catch (error) {
    console.warn(
      'Unable to get domain price:',
      error
    );

    return undefined;
  }
}

  /*
   * ------------------------------------------------------------
   * DOES THE USER INPUT INCLUDE AN EXTENSION?
   * ------------------------------------------------------------
   */

  async hasExtension(
    domain: string
  ) {
    const cleaned =
      this.cleanDomain(domain);

    if (!cleaned.includes('.')) {
      return false;
    }

    try {
      const tlds =
        await this.getSupportedTlds();

      if (
        tlds.some((tld) =>
          cleaned.endsWith(tld)
        )
      ) {
        return true;
      }
    } catch {
      /*
       * We still allow the fallback below if
       * pricing cannot be loaded.
       */
    }

    /*
     * Allow full domains that are not
     * currently configured in WHMCS.
     *
     * example.dev
     * example.co.za
     */
    const parts =
      cleaned.split('.');

    return (
      parts.length >= 2 &&
      parts.every(
        (part) =>
          part.length > 0
      )
    );
  }

  /*
   * ------------------------------------------------------------
   * CLEAN RAW WHOIS TEXT
   * ------------------------------------------------------------
   */

  private cleanWhoisText(
    text: string
  ) {
    if (!text) {
      return '';
    }

    return text
      .replace(
        /<br\s*\/?>/gi,
        '\n'
      )
      .replace(
        /<[^>]*>/g,
        ''
      )
      .replace(/\r/g, '');
  }

  /*
   * ------------------------------------------------------------
   * EXTRACT VALUE FROM A WHOIS LINE
   * ------------------------------------------------------------
   */

  private getWhoisValue(
    line: string,
    patterns: RegExp[]
  ) {
    for (
      const pattern of patterns
    ) {
      const match =
        line.match(pattern);

      if (match?.[1]) {
        const value =
          match[1].trim();

        if (
          value &&
          value.toUpperCase() !==
            'REDACTED FOR PRIVACY'
        ) {
          return value;
        }
      }
    }

    return undefined;
  }

  /*
   * ------------------------------------------------------------
   * DETERMINE DOMAIN AVAILABILITY
   * ------------------------------------------------------------
   */

  private parseAvailability(
    data: any
  ): boolean | null {
    if (!data) {
      return null;
    }

    /*
     * Primary WHMCS DomainWhois response.
     */
    if (
      typeof data.status ===
      'string'
    ) {
      const status =
        data.status
          .trim()
          .toLowerCase();

      if (
        status === 'available'
      ) {
        return true;
      }

      if (
        status ===
          'unavailable' ||
        status ===
          'registered' ||
        status === 'taken'
      ) {
        return false;
      }
    }

    /*
     * Support alternative proxy responses.
     */
    if (
      typeof data.available ===
      'boolean'
    ) {
      return data.available;
    }

    if (
      typeof data.isAvailable ===
      'boolean'
    ) {
      return data.isAvailable;
    }

    /*
     * Inspect the actual WHOIS text.
     */
    if (
      typeof data.whois ===
      'string'
    ) {
      const whois =
        this.cleanWhoisText(
          data.whois
        ).toLowerCase();

      /*
       * Common responses for an
       * unregistered domain.
       */
      if (
        whois.includes(
          'no match'
        ) ||
        whois.includes(
          'not found'
        ) ||
        whois.includes(
          'no entries found'
        ) ||
        whois.includes(
          'no entry found'
        ) ||
        whois.includes(
          'no data found'
        ) ||
        whois.includes(
          'no object found'
        ) ||
        whois.includes(
          'domain not found'
        ) ||
        whois.includes(
          'available for registration'
        )
      ) {
        return true;
      }

      /*
       * Substantial WHOIS records indicate
       * an already registered domain.
       */
      if (
        whois.includes(
          'domain name:'
        ) ||
        whois.includes(
          'registrar:'
        ) ||
        whois.includes(
          'name server:'
        ) ||
        whois.includes(
          'nameserver:'
        ) ||
        whois.includes(
          'creation date:'
        ) ||
        whois.includes(
          'registry expiry date:'
        )
      ) {
        return false;
      }
    }

    return null;
  }

  /*
   * ------------------------------------------------------------
   * PARSE RAW WHOIS DETAILS
   * ------------------------------------------------------------
   */

  private parseWhoisDetails(
    data: any,
    domain: string
  ): WhoisDetails {
    /*
     * Your DomainWhois proxy returns the useful
     * information as raw text inside data.whois.
     */
    const rawWhois =
      typeof data?.whois ===
      'string'
        ? data.whois
        : typeof data?.data?.whois ===
            'string'
          ? data.data.whois
          : '';

    const clean =
      this.cleanWhoisText(
        rawWhois
      );

    const lines = clean
      .split('\n')
      .map((line) =>
        line.trim()
      )
      .filter(Boolean);

    const details: WhoisDetails =
      {
        domain,
        status: [],
        nameservers: [],
        raw: rawWhois,
      };

    const registrant: WhoisContact =
      {};

    const administrative: WhoisContact =
      {};

    const technical: WhoisContact =
      {};

    /*
     * Multiple address lines are possible.
     */
    const registrantStreet: string[] =
      [];

    const adminStreet: string[] =
      [];

    const technicalStreet: string[] =
      [];

    for (const line of lines) {
      /*
       * ----------------------------------------------------------
       * DOMAIN
       * ----------------------------------------------------------
       */

      const domainName =
        this.getWhoisValue(
          line,
          [
            /^Domain Name:\s*(.+)/i,
            /^Domain:\s*(.+)/i,
          ]
        );

      if (domainName) {
        details.domain =
          domainName.toLowerCase();

        continue;
      }

     /*
      * ----------------------------------------------------------
      * STATUS
      * ----------------------------------------------------------
      */

      const domainStatus =
        this.getWhoisValue(
          line,
          [
            /^Domain Status:\s*(.+)/i,
            /^Status:\s*(.+)/i,
          ]
        );

      if (domainStatus) {
        // Remove ICANN/EPP reference URLs from the raw WHOIS status
        const cleanedStatus = domainStatus
          .replace(/https?:\/\/\S+/gi, '')
          .trim();

        // Convert technical EPP statuses into cleaner labels
        const statusLabels: Record<string, string> = {
          clientTransferProhibited: 'Transfer Locked',
          clientDeleteProhibited: 'Deletion Locked',
          clientUpdateProhibited: 'Update Locked',
          clientRenewProhibited: 'Renewal Locked',
          clientHold: 'On Hold',

          serverTransferProhibited: 'Transfer Locked by Registry',
          serverDeleteProhibited: 'Deletion Locked by Registry',
          serverUpdateProhibited: 'Update Locked by Registry',
          serverRenewProhibited: 'Renewal Locked by Registry',
          serverHold: 'On Hold by Registry',

          pendingTransfer: 'Transfer Pending',
          pendingDelete: 'Deletion Pending',
          pendingRenew: 'Renewal Pending',
          pendingUpdate: 'Update Pending',
          pendingCreate: 'Registration Pending',

          ok: 'Active',
          active: 'Active',
        };

        const formattedStatus =
          statusLabels[cleanedStatus] ??
          cleanedStatus;

        details.status ??= [];

        if (
          formattedStatus &&
          !details.status.includes(
            formattedStatus
          )
        ) {
          details.status.push(
            formattedStatus
          );
        }

        continue;
      }

      /*
       * ----------------------------------------------------------
       * REGISTRAR
       * ----------------------------------------------------------
       */

      const registrar =
        this.getWhoisValue(
          line,
          [
            /^Registrar:\s*(.+)/i,
            /^Registrar Name:\s*(.+)/i,
          ]
        );

      if (registrar) {
        details.registrar =
          registrar;

        continue;
      }

      const registrarUrl =
        this.getWhoisValue(
          line,
          [
            /^Registrar URL:\s*(.+)/i,
            /^Registrar Website:\s*(.+)/i,
          ]
        );

      if (registrarUrl) {
        details.registrarUrl =
          registrarUrl;

        continue;
      }

      const whoisServer =
        this.getWhoisValue(
          line,
          [
            /^Registrar WHOIS Server:\s*(.+)/i,
            /^WHOIS Server:\s*(.+)/i,
          ]
        );

      if (whoisServer) {
        details.registrarWhoisServer =
          whoisServer;

        continue;
      }

      const registrarIanaId =
        this.getWhoisValue(
          line,
          [
            /^Registrar IANA ID:\s*(.+)/i,
            /^IANA ID:\s*(.+)/i,
          ]
        );

      if (registrarIanaId) {
        details.registrarIanaId =
          registrarIanaId;

        continue;
      }

      /*
       * ----------------------------------------------------------
       * DATES
       * ----------------------------------------------------------
       */

      const createdDate =
        this.getWhoisValue(
          line,
          [
            /^Creation Date:\s*(.+)/i,
            /^Created On:\s*(.+)/i,
            /^Created:\s*(.+)/i,
            /^Registration Date:\s*(.+)/i,
            /^Registered On:\s*(.+)/i,
          ]
        );

      if (createdDate) {
        details.createdDate =
          createdDate;

        continue;
      }

      const updatedDate =
        this.getWhoisValue(
          line,
          [
            /^Updated Date:\s*(.+)/i,
            /^Last Updated:\s*(.+)/i,
            /^Modified Date:\s*(.+)/i,
            /^Last Modified:\s*(.+)/i,
          ]
        );

      if (updatedDate) {
        details.updatedDate =
          updatedDate;

        continue;
      }

      const expiryDate =
        this.getWhoisValue(
          line,
          [
            /^Registry Expiry Date:\s*(.+)/i,
            /^Expiry Date:\s*(.+)/i,
            /^Expiration Date:\s*(.+)/i,
            /^Expires On:\s*(.+)/i,
            /^Expiry:\s*(.+)/i,
          ]
        );

      if (expiryDate) {
        details.expiryDate =
          expiryDate;

        continue;
      }

      /*
       * ----------------------------------------------------------
       * NAMESERVERS
       * ----------------------------------------------------------
       */

      const nameserver =
        this.getWhoisValue(
          line,
          [
            /^Name Server:\s*(.+)/i,
            /^Nameserver:\s*(.+)/i,
            /^Name Servers?:\s*(.+)/i,
            /^nserver:\s*(.+)/i,
          ]
        );

      if (nameserver) {
        /*
         * Example:
         *
         * nserver: ns1.example.com 192.168.1.1
         *
         * Keep only the hostname.
         */
        const hostname =
          nameserver
            .split(/\s+/)[0]
            .toLowerCase();

        details.nameservers ??=
          [];

        if (
          hostname &&
          !details.nameservers.includes(
            hostname
          )
        ) {
          details.nameservers.push(
            hostname
          );
        }

        continue;
      }

      /*
       * ----------------------------------------------------------
       * DNSSEC
       * ----------------------------------------------------------
       */

      const dnssec =
        this.getWhoisValue(
          line,
          [
            /^DNSSEC:\s*(.+)/i,
          ]
        );

      if (dnssec) {
        details.dnssec =
          dnssec;

        continue;
      }

      /*
       * ----------------------------------------------------------
       * REGISTRANT
       * ----------------------------------------------------------
       */

      const registrantName =
        this.getWhoisValue(
          line,
          [
            /^Registrant Name:\s*(.+)/i,
          ]
        );

      if (registrantName) {
        registrant.name =
          registrantName;

        continue;
      }

      const registrantOrganization =
        this.getWhoisValue(
          line,
          [
            /^Registrant Organization:\s*(.+)/i,
            /^Registrant Organisation:\s*(.+)/i,
            /^Registrant Org:\s*(.+)/i,
            /^Registrant:\s*(.+)/i,
          ]
        );

      if (
        registrantOrganization
      ) {
        registrant.organization =
          registrantOrganization;

        continue;
      }

      const registrantEmail =
        this.getWhoisValue(
          line,
          [
            /^Registrant Email:\s*(.+)/i,
          ]
        );

      if (registrantEmail) {
        registrant.email =
          registrantEmail;

        continue;
      }

      const registrantPhone =
        this.getWhoisValue(
          line,
          [
            /^Registrant Phone:\s*(.+)/i,
          ]
        );

      if (registrantPhone) {
        registrant.phone =
          registrantPhone;

        continue;
      }

      const registrantAddress =
        this.getWhoisValue(
          line,
          [
            /^Registrant Street:\s*(.+)/i,
            /^Registrant Address:\s*(.+)/i,
          ]
        );

      if (registrantAddress) {
        registrantStreet.push(
          registrantAddress
        );

        continue;
      }

      const registrantCity =
        this.getWhoisValue(
          line,
          [
            /^Registrant City:\s*(.+)/i,
          ]
        );

      if (registrantCity) {
        registrant.city =
          registrantCity;

        continue;
      }

      const registrantState =
        this.getWhoisValue(
          line,
          [
            /^Registrant State\/Province:\s*(.+)/i,
            /^Registrant Province:\s*(.+)/i,
            /^Registrant State:\s*(.+)/i,
          ]
        );

      if (registrantState) {
        registrant.state =
          registrantState;

        continue;
      }

      const registrantPostal =
        this.getWhoisValue(
          line,
          [
            /^Registrant Postal Code:\s*(.+)/i,
            /^Registrant Postcode:\s*(.+)/i,
            /^Registrant ZIP:\s*(.+)/i,
          ]
        );

      if (registrantPostal) {
        registrant.postalCode =
          registrantPostal;

        continue;
      }

      const registrantCountry =
        this.getWhoisValue(
          line,
          [
            /^Registrant Country:\s*(.+)/i,
          ]
        );

      if (registrantCountry) {
        registrant.country =
          registrantCountry;

        continue;
      }

      /*
       * ----------------------------------------------------------
       * ADMINISTRATIVE CONTACT
       * ----------------------------------------------------------
       */

      const adminName =
        this.getWhoisValue(
          line,
          [
            /^Admin Name:\s*(.+)/i,
            /^Administrative Contact Name:\s*(.+)/i,
          ]
        );

      if (adminName) {
        administrative.name =
          adminName;

        continue;
      }

      const adminOrganization =
        this.getWhoisValue(
          line,
          [
            /^Admin Organization:\s*(.+)/i,
            /^Admin Organisation:\s*(.+)/i,
            /^Administrative Organization:\s*(.+)/i,
          ]
        );

      if (
        adminOrganization
      ) {
        administrative.organization =
          adminOrganization;

        continue;
      }

      const adminEmail =
        this.getWhoisValue(
          line,
          [
            /^Admin Email:\s*(.+)/i,
            /^Administrative Contact Email:\s*(.+)/i,
          ]
        );

      if (adminEmail) {
        administrative.email =
          adminEmail;

        continue;
      }

      const adminPhone =
        this.getWhoisValue(
          line,
          [
            /^Admin Phone:\s*(.+)/i,
            /^Administrative Contact Phone:\s*(.+)/i,
          ]
        );

      if (adminPhone) {
        administrative.phone =
          adminPhone;

        continue;
      }

      const adminAddress =
        this.getWhoisValue(
          line,
          [
            /^Admin Street:\s*(.+)/i,
            /^Admin Address:\s*(.+)/i,
          ]
        );

      if (adminAddress) {
        adminStreet.push(
          adminAddress
        );

        continue;
      }

      const adminCity =
        this.getWhoisValue(
          line,
          [
            /^Admin City:\s*(.+)/i,
          ]
        );

      if (adminCity) {
        administrative.city =
          adminCity;

        continue;
      }

      const adminState =
        this.getWhoisValue(
          line,
          [
            /^Admin State\/Province:\s*(.+)/i,
            /^Admin Province:\s*(.+)/i,
            /^Admin State:\s*(.+)/i,
          ]
        );

      if (adminState) {
        administrative.state =
          adminState;

        continue;
      }

      const adminPostal =
        this.getWhoisValue(
          line,
          [
            /^Admin Postal Code:\s*(.+)/i,
            /^Admin Postcode:\s*(.+)/i,
          ]
        );

      if (adminPostal) {
        administrative.postalCode =
          adminPostal;

        continue;
      }

      const adminCountry =
        this.getWhoisValue(
          line,
          [
            /^Admin Country:\s*(.+)/i,
          ]
        );

      if (adminCountry) {
        administrative.country =
          adminCountry;

        continue;
      }

      /*
       * ----------------------------------------------------------
       * TECHNICAL CONTACT
       * ----------------------------------------------------------
       */

      const technicalName =
        this.getWhoisValue(
          line,
          [
            /^Tech Name:\s*(.+)/i,
            /^Technical Contact Name:\s*(.+)/i,
          ]
        );

      if (technicalName) {
        technical.name =
          technicalName;

        continue;
      }

      const technicalOrganization =
        this.getWhoisValue(
          line,
          [
            /^Tech Organization:\s*(.+)/i,
            /^Tech Organisation:\s*(.+)/i,
            /^Technical Organization:\s*(.+)/i,
          ]
        );

      if (
        technicalOrganization
      ) {
        technical.organization =
          technicalOrganization;

        continue;
      }

      const technicalEmail =
        this.getWhoisValue(
          line,
          [
            /^Tech Email:\s*(.+)/i,
            /^Technical Contact Email:\s*(.+)/i,
          ]
        );

      if (technicalEmail) {
        technical.email =
          technicalEmail;

        continue;
      }

      const technicalPhone =
        this.getWhoisValue(
          line,
          [
            /^Tech Phone:\s*(.+)/i,
            /^Technical Contact Phone:\s*(.+)/i,
          ]
        );

      if (technicalPhone) {
        technical.phone =
          technicalPhone;

        continue;
      }

      const technicalAddress =
        this.getWhoisValue(
          line,
          [
            /^Tech Street:\s*(.+)/i,
            /^Tech Address:\s*(.+)/i,
          ]
        );

      if (technicalAddress) {
        technicalStreet.push(
          technicalAddress
        );

        continue;
      }

      const technicalCity =
        this.getWhoisValue(
          line,
          [
            /^Tech City:\s*(.+)/i,
          ]
        );

      if (technicalCity) {
        technical.city =
          technicalCity;

        continue;
      }

      const technicalState =
        this.getWhoisValue(
          line,
          [
            /^Tech State\/Province:\s*(.+)/i,
            /^Tech Province:\s*(.+)/i,
            /^Tech State:\s*(.+)/i,
          ]
        );

      if (technicalState) {
        technical.state =
          technicalState;

        continue;
      }

      const technicalPostal =
        this.getWhoisValue(
          line,
          [
            /^Tech Postal Code:\s*(.+)/i,
            /^Tech Postcode:\s*(.+)/i,
          ]
        );

      if (technicalPostal) {
        technical.postalCode =
          technicalPostal;

        continue;
      }

      const technicalCountry =
        this.getWhoisValue(
          line,
          [
            /^Tech Country:\s*(.+)/i,
          ]
        );

      if (technicalCountry) {
        technical.country =
          technicalCountry;

        continue;
      }
    }

    /*
     * ------------------------------------------------------------
     * FALLBACK EXTRACTION
     * ------------------------------------------------------------
     *
     * Some registry WHOIS servers use slightly unusual
     * formatting. These expressions give us a second chance
     * to find the most important information.
     */

    if (!details.registrar) {
      const match =
        clean.match(
          /Registrar:\s*([^\n]+)/i
        );

      if (
        match?.[1] &&
        match[1]
          .trim()
          .toUpperCase() !==
          'REDACTED FOR PRIVACY'
      ) {
        details.registrar =
          match[1].trim();
      }
    }

    if (!details.createdDate) {
      const match =
        clean.match(
          /(?:Creation Date|Created On|Created|Registration Date|Registered On):\s*([^\n]+)/i
        );

      if (match?.[1]) {
        details.createdDate =
          match[1].trim();
      }
    }

    if (!details.updatedDate) {
      const match =
        clean.match(
          /(?:Updated Date|Last Updated|Modified Date|Last Modified):\s*([^\n]+)/i
        );

      if (match?.[1]) {
        details.updatedDate =
          match[1].trim();
      }
    }

    if (!details.expiryDate) {
      const match =
        clean.match(
          /(?:Registry Expiry Date|Expiry Date|Expiration Date|Expires On|Expiry):\s*([^\n]+)/i
        );

      if (match?.[1]) {
        details.expiryDate =
          match[1].trim();
      }
    }

    /*
     * ------------------------------------------------------------
     * MULTIPLE CONTACT ADDRESS LINES
     * ------------------------------------------------------------
     */

    if (
      registrantStreet.length
    ) {
      registrant.street =
        registrantStreet.join(
          ', '
        );
    }

    if (adminStreet.length) {
      administrative.street =
        adminStreet.join(', ');
    }

    if (
      technicalStreet.length
    ) {
      technical.street =
        technicalStreet.join(
          ', '
        );
    }

    /*
     * ------------------------------------------------------------
     * ADD CONTACTS ONLY IF INFORMATION EXISTS
     * ------------------------------------------------------------
     */

    const hasContactValues = (
      contact: WhoisContact
    ) => {
      return Object.values(
        contact
      ).some(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ''
      );
    };

    if (
      hasContactValues(
        registrant
      )
    ) {
      details.registrant =
        registrant;
    }

    if (
      hasContactValues(
        administrative
      )
    ) {
      details.administrative =
        administrative;
    }

    if (
      hasContactValues(
        technical
      )
    ) {
      details.technical =
        technical;
    }

    /*
     * ------------------------------------------------------------
     * CLEAN ARRAYS
     * ------------------------------------------------------------
     */

    details.nameservers = [
      ...new Set(
        details.nameservers ??
          []
      ),
    ];

    details.status = [
      ...new Set(
        details.status ?? []
      ),
    ];

    return details;
  }

  /*
   * ------------------------------------------------------------
   * CHECK ONE DOMAIN
   * ------------------------------------------------------------
   */

  async checkAvailability(
    rawDomain: string
  ): Promise<DomainAvailabilityResult> {
    const domain =
      this.cleanDomain(
        rawDomain
      );

    // Track domain check
    analyticsService.trackDomainCheck(
      domain,
      false
    ); // We'll update this after we know availability

    if (
      !domain ||
      !domain.includes('.')
    ) {
      return {
        domain,
        isAvailable: false,
        checkingFailed: true,
        reason:
          'Please enter a complete domain name',
      };
    }

    try {
      const response = await fetch(
        `${API_BASE}?action=DomainWhois&domain=${encodeURIComponent(
          domain
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `WHOIS returned ${response.status}`
        );
      }

      const data =
        await response.json();

      /*
       * Keep this while testing.
       *
       * It is useful for checking the exact
       * response from different registries.
       */
      console.log(
        `DomainWhois response for ${domain}:`,
        data
      );

      /*
       * WHMCS explicit error.
       */
      if (
        data?.result ===
        'error'
      ) {
        throw new Error(
          data?.message ||
            'WHOIS lookup failed'
        );
      }

      const availability =
        this.parseAvailability(
          data
        );

      const price =
        await this.getDomainPrice(
          domain
        );

      /*
       * Parse the raw data.whois string into
       * structured data for your WHOIS page.
       */
      const whois =
        this.parseWhoisDetails(
          data,
          domain
        );

      if (
        availability === null
      ) {
        return {
          domain,
          isAvailable: false,
          checkingFailed: true,
          reason:
            'Unable to confirm domain status',
          price,
          whois,
        };
      }

      const eligibility = getCoZwRegistrationEligibility(domain);

      // Track domain availability
      analyticsService.trackDomainCheck(
        domain,
        availability
      );

      return {
        domain,
        isAvailable: availability,
        price,
        whois,
        registrationEligible: availability ? eligibility.eligible : false,
        eligibilityReason: availability ? eligibility.reason : undefined,
        registryApprovalRequired:
          availability && eligibility.registryApprovalRequired,
        reason: availability
          ? eligibility.eligible
            ? eligibility.registryApprovalRequired
              ? 'Available to apply for registration'
              : 'Available for registration'
            : eligibility.reason
          : 'Already registered',
      };
    } catch (error) {
      console.error(
        `WHOIS lookup failed for ${domain}:`,
        error
      );

      return {
        domain,
        isAvailable: false,
        checkingFailed: true,

        reason:
          error instanceof Error
            ? error.message
            : 'Unable to check domain',
      };
    }
  }

  /*
   * ------------------------------------------------------------
   * SEARCH DOMAIN(S)
   * ------------------------------------------------------------
   *
   * Input:
   *
   * runtime
   *
   * checks:
   *
   * runtime.co.zw
   * runtime.com
   * runtime.net
   * runtime.org
   *
   *
   * Input:
   *
   * runtime.africa
   *
   * checks only:
   *
   * runtime.africa
   * ------------------------------------------------------------
   */

  async searchDomains(
    rawInput: string
  ): Promise<
    DomainAvailabilityResult[]
  > {
    const input =
      this.cleanDomain(
        rawInput
      );

    // Track domain search
    analyticsService.trackDomainSearch(
      input,
      'registration'
    );

    if (!input) {
      return [];
    }

    const fullDomain =
      await this.hasExtension(
        input
      );

    if (fullDomain) {
      return [
        await this.checkAvailability(
          input
        ),
      ];
    }

    const domains =
      POPULAR_EXTENSIONS.map(
        (extension) =>
          `${input}${extension}`
      );

    /*
     * Promise.allSettled prevents one failed
     * registry lookup from breaking every
     * result.
     */
    const checks =
      await Promise.allSettled(
        domains.map((domain) =>
          this.checkAvailability(
            domain
          )
        )
      );

    return checks.map(
      (result, index) => {
        if (
          result.status ===
          'fulfilled'
        ) {
          return result.value;
        }

        return {
          domain:
            domains[index],
          isAvailable: false,
          checkingFailed: true,
          reason:
            'Unable to check domain',
        };
      }
    );
  }

  /*
   * ------------------------------------------------------------
   * REGISTRATION URL
   * ------------------------------------------------------------
   */

  getRegistrationUrl(
    domain: string
  ) {
    const cleaned =
      this.cleanDomain(
        domain
      );

    const parts =
      cleaned.split('.');

    const sld =
      parts.shift() ?? '';

    const tld =
      parts.length
        ? `.${parts.join('.')}`
        : '';

    return (
      'https://clientzone.ngaatec.com/cart.php' +
      `?a=add&domain=register&sld=${encodeURIComponent(
        sld
      )}&tld=${encodeURIComponent(
        tld
      )}`
    );
  }

  /*
   * ------------------------------------------------------------
   * TRANSFER URL
   * ------------------------------------------------------------
   */

  getTransferUrl(
    domain: string
  ) {
    const cleaned =
      this.cleanDomain(
        domain
      );

    const parts =
      cleaned.split('.');

    const sld =
      parts.shift() ?? '';

    const tld =
      parts.length
        ? `.${parts.join('.')}`
        : '';

    return (
      'https://clientzone.ngaatec.com/cart.php' +
      `?a=add&domain=transfer&sld=${encodeURIComponent(
        sld
      )}&tld=${encodeURIComponent(
        tld
      )}`
    );
  }

  /*
   * ------------------------------------------------------------
   * TRANSFER DOMAIN
   * ------------------------------------------------------------
   */

  transferDomain(
    domain: string
  ) {
    // Track domain transfer initiation
    analyticsService.trackDomainTransfer(
      domain
    );

    window.location.href =
      this.getTransferUrl(
        domain
      );
  }

  /*
   * ------------------------------------------------------------
   * REGISTER DOMAIN DIRECTLY THROUGH WHMCS
   *
   * Your Hero currently uses your registration
   * modal instead, but this can be reused later.
   * ------------------------------------------------------------
   */

  registerDomain(
    domain: string
  ) {
    // Track domain registration initiation
    analyticsService.trackDomainRegistration(
      domain
    );

    window.location.href =
      this.getRegistrationUrl(
        domain
      );
  }

  /*
   * ------------------------------------------------------------
   * CLEAR PRICING CACHE
   *
   * Useful if pricing is changed while the
   * application is still open.
   * ------------------------------------------------------------
   */

  clearPricingCache() {
    this.pricingCache =
      null;
  }
}

export const domainService =
  new DomainService();
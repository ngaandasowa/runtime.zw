import {
  Domain,
  RegistryAction,
} from '../types';

const REGISTRAR = {
  handle: 'Ngaatec',
  organisation: 'Ngaatec Private Limited',
  physicalAddress: '13 Nyenze Crescent, Zengeza 1',
  postalAddress: '13 Nyenze Crescent, Zengeza 1',
  city: 'Chitungwiza',
  country: 'Zimbabwe',

  adminName: 'Ngaavongwe Ndasowampange',
  adminPhone: '+26373827570',
  adminEmail: 'admin@ngaatec.com',

  technicalName: 'Ngaavongwe Ndasowampange',
  technicalPhone: '+263783827570',
  technicalEmail: 'support@ngaatec.com',
};

const KNOWN_NAMESERVER_IPS: Record<string, string> = {
  'ns1.ngaatec.com': '148.163.100.131',
  'ns2.ngaatec.com': '148.163.100.132',
};

const value = (
  input?: string
) =>
  (input || '').trim();

export class RegistryTemplateService {
  generateTemplate(
    domain: Domain,
    action: RegistryAction
  ): string {
    const owner =
      domain.owner_details;

    const ns1 =
      value(
        domain.nameservers[0]
      );

    const ns2 =
      value(
        domain.nameservers[1]
      );

    const ns3 =
      value(
        domain.nameservers[2]
      );

    const ns4 =
      value(
        domain.nameservers[3]
      );

    const suppliedIps =
      Array.isArray(
        domain.nameserver_ips
      )
        ? domain.nameserver_ips
        : [];

    const resolveNameserverIp = (
      hostname: string,
      index: number
    ) =>
      value(
        suppliedIps[index]
      ) ||
      KNOWN_NAMESERVER_IPS[
        hostname.toLowerCase()
      ] ||
      '';

    const ns1Ip =
      resolveNameserverIp(ns1, 0);

    const ns2Ip =
      resolveNameserverIp(ns2, 1);

    const ns3Ip =
      resolveNameserverIp(ns3, 2);

    const ns4Ip =
      resolveNameserverIp(ns4, 3);

    const lines = [
      '                                ZISPA',
      '                       .CO.ZW Namespace Registry',
      '',
      '             APPLICATION TO ESTABLISH A SUB-DOMAIN WITHIN',
      '                 THE .CO.ZW NAMESPACE OF THE INTERNET',
      '',
      '       ========================================================',
      "      |        ZISPA manages Zimbabwe's .CO.ZW registry        |",
      '      |                                                        |',
      '      |       ** TERMS AND CONDITIONS OF REGISTRATION **       |',
      '      |                                                        |',
      '      | .CO.ZW domain registrations are subject to the terms   |',
      '      | and conditions as published at http://www.zispa.org.zw |',
      '      | from time to time.                                     |',
      '      |                                                        |',
      '      |              ** COSTS OF REGISTRATION **               |',
      '      |                                                        |',
      '      | The costs of registration will vary from time to time. |',
      '      | Details of current charges may be obtained from ZISPA. |',
      '      |                                                        |',
      '      | This document is intended to be scanned electronically |',
      '      | so please do not change its format or enter data other |',
      '      | than in the specified locations.  The file must be     |',
      '      | sent in plain ASCII format as an attachment and not as |',
      '      | inline text.  It must not be uuencoded or MIME encoded |',
      '      | or sent in any proprietary word processing file format |',
      '      |                                                        |',
      '      | Please send only ONE APPLICATION per e-mail message    |',
      '      | to admin@zispa.org.zw, with the FULL DOMAIN NAME IN    |',
      '      | THE SUBJECT LINE.                                      |',
      '      |                                                        |',
      '      | All data must be entered on a single line following    |',
      '      | the colon for the field concerned to facilitate data   |',
      '      | capture.                                               |',
      '      |                                                        |',
      '      |  ** All fields with an asterisk must be completed **   |',
      '      |                                                        |',
      '       ========================================================',
      '',
      '      0.  ZW DOMAIN TEMPLATE....: 3.3 - 28 Jan 2015',
      '',
      '      1.  DOMAIN NAME and ACTION',
      `    * 1a. Full domain name......: ${value(domain.domain_name)}`,
      `    * 1b. (N)ew or (M)odify or (D)elete or (T)ransfer (N/M/D/T)..: ${action}`,
      '',
      '      2.  DOMAIN OWNER',
      `    * 2a. Domain Owner..........: ${value(owner.full_name)}`,
      `    * 2b. Organisation Name.....: ${value(owner.org_name)}`,
      `    * 2c. Physical Address......: ${value(owner.physical_address)}`,
      `    * 2d. Postal Address .......: ${value(owner.postal_address)}`,
      `    * 2e. Town/City.............: ${value(owner.city)}`,
      `    * 2f. Country...............: ${value(owner.country)}`,
      `    * 2g. Voice Phone...........: ${value(owner.phone)}`,
      '      2h. Fax Number............: ',
      `    * 2i. E-mail Address........: ${value(owner.email || domain.user_email)}`,
      '',
      '      3.  ADMIN/BILLING CONTACT',
      `    * 3a. ZISPA Handle..........: ${REGISTRAR.handle}`,
      `    * 3b. Contact Name..........: ${REGISTRAR.adminName}`,
      `    * 3c. Organisation Name.....: ${REGISTRAR.organisation}`,
      `    * 3d. Physical Address .....: ${REGISTRAR.physicalAddress}`,
      `    * 3e. Postal Address .......: ${REGISTRAR.postalAddress}`,
      `    * 3f. Town/City.............: ${REGISTRAR.city}`,
      `    * 3g. Country...............: ${REGISTRAR.country}`,
      `    * 3h. Voice Phone...........: ${REGISTRAR.adminPhone}`,
      '      3i. Fax Number............: ',
      `    * 3j. E-mail Address........: ${REGISTRAR.adminEmail}`,
      '',
      '      4.  DESCRIPTION OF ORGANISATION/DOMAIN',
      `    * 4a. Description of domain`,
      `          owner's organisation..: ${value(owner.org_description)}`,
      `    * 4b. Proposed domain usage.: ${value(owner.proposed_usage)}`,
      '',
      '      5.  TECHNICAL CONTACT',
      `    * 5a. ZISPA Handle..........: ${REGISTRAR.handle}`,
      `    * 5b. Contact Name..........: ${REGISTRAR.technicalName}`,
      `    * 5c. Organisation Name.....: ${REGISTRAR.organisation}`,
      `    * 5d. Physical Address .....: ${REGISTRAR.physicalAddress}`,
      `    * 5e. Postal Address .......: ${REGISTRAR.postalAddress}`,
      `    * 5f. Town/City.............: ${REGISTRAR.city}`,
      `    * 5g. Country...............: ${REGISTRAR.country}`,
      `    * 5h. Voice Phone...........: ${REGISTRAR.technicalPhone}`,
      '      5i. Fax Number............: ',
      `    * 5j. E-mail Address........: ${REGISTRAR.technicalEmail}`,
      '',
      '      6.  PRIMARY NAMESERVER',
      `    * 6a. Hostname..............: ${ns1}`,
      `    * 6b. IP Address............: ${ns1Ip}`,
      '',
      '          SECONDARY NAMESERVER',
      `    * 6c. Hostname..............: ${ns2}`,
      `    * 6d. IP Address............: ${ns2Ip}`,
      '',
      '          SECONDARY NAMESERVER',
      `      6e. Hostname..............: ${ns3}`,
      `      6f. IP Address............: ${ns3Ip}`,
      '',
      '          SECONDARY NAMESERVER',
      `      6g. Hostname..............: ${ns4}`,
      `      6h. IP Address............: ${ns4Ip}`,
      '',
      '    * 7.  DOMICILIUM CITANDI ET EXECUTANDI',
      '      The organisation specified',
      '      in 2 above chooses as its',
      '      address for the giving and',
      '      serving of notices the',
      '      following street address',
      '      (Note: Post Office box or',
      '      Post Office bag addresses',
      `      are not acceptable).......: ${value(owner.physical_address)}`,
      '',
    ];

    return lines.join('\n');
  }

  getSubject(
    domainName: string,
    _action: RegistryAction
  ): string {
    /*
     * The official instructions require the FULL DOMAIN NAME
     * in the subject line.
     */
    return domainName.trim().toLowerCase();
  }

  getFilename(
    domainName: string,
    _action: RegistryAction
  ): string {
    const clean =
      domainName
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9.-]/g,
          '_'
        );

    return `${clean}.txt`;
  }

  validateTemplateData(
    domain: Domain
  ): string[] {
    const owner =
      domain.owner_details;

    const missing: string[] = [];

    const requiredOwner: Array<
      [string, string | undefined]
    > = [
      ['Domain owner', owner.full_name],
      ['Organisation name', owner.org_name],
      ['Physical address', owner.physical_address],
      ['Postal address', owner.postal_address],
      ['Town / City', owner.city],
      ['Country', owner.country],
      ['Voice phone', owner.phone],
      ['Email', owner.email],
      ['Organisation description', owner.org_description],
      ['Proposed domain use', owner.proposed_usage],
    ];

    requiredOwner.forEach(
      ([label, field]) => {
        if (!value(field)) {
          missing.push(label);
        }
      }
    );

    if (
      value(owner.org_description) &&
      value(owner.proposed_usage) &&
      value(owner.org_description)
        .toLowerCase() ===
      value(owner.proposed_usage)
        .toLowerCase()
    ) {
      missing.push(
        'Organisation description and proposed domain use must describe different things'
      );
    }

    const suppliedIps =
      Array.isArray(
        domain.nameserver_ips
      )
        ? domain.nameserver_ips
        : [];

    const requiredNsIp = (
      index: number
    ) => {
      const hostname =
        value(
          domain.nameservers[index]
        );

      return (
        value(
          suppliedIps[index]
        ) ||
        KNOWN_NAMESERVER_IPS[
          hostname.toLowerCase()
        ] ||
        ''
      );
    };

    if (
      !value(
        domain.nameservers[0]
      )
    ) {
      missing.push(
        'Primary nameserver'
      );
    }

    if (
      !value(
        domain.nameservers[1]
      )
    ) {
      missing.push(
        'Secondary nameserver'
      );
    }

    if (
      value(
        domain.nameservers[0]
      ) &&
      !requiredNsIp(0)
    ) {
      missing.push(
        'Primary nameserver IP address'
      );
    }

    if (
      value(
        domain.nameservers[1]
      ) &&
      !requiredNsIp(1)
    ) {
      missing.push(
        'Secondary nameserver IP address'
      );
    }

    return missing;
  }
}

export const registryTemplateService =
  new RegistryTemplateService();
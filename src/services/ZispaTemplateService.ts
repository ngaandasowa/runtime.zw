import { Domain, ZispaAction } from '../types';

export class ZispaTemplateService {
  /**
   * Generates standard RFC / ZISPA registry plain-text application form
   * Preserves exact official ZISPA field names on left side of colons.
   */
  generateTemplate(domain: Domain, action: ZispaAction): string {
    const owner = domain.owner_details;
    const ns = domain.nameservers;

    const actionText = {
      N: 'N (New)',
      M: 'M (Modify)',
      D: 'D (Delete)',
      T: 'T (Transfer)',
    }[action];

    const lines: string[] = [
      '** ZISPA DOMAIN APPLICATION FORM **',
      '',
      `0. Action                      : ${action}`,
      `1. Fully Qualified Domain Name : ${domain.domain_name}`,
      '',
      `2. Applicant Details`,
      `2a. Full Name                  : ${owner.full_name || 'N/A'}`,
      `2b. Organisation Name          : ${owner.org_name || 'Individual'}`,
      `2c. Physical Address           : ${owner.physical_address || 'Harare, Zimbabwe'}`,
      `2d. Postal Address             : ${owner.postal_address || 'P.O. Box Harare'}`,
      `2e. City / Town                : ${owner.city || 'Harare'}`,
      `2f. Country                    : ${owner.country || 'Zimbabwe'}`,
      `2g. Telephone                  : ${owner.phone || '+263'}`,
      `2h. Email Address              : ${owner.email || domain.user_email}`,
      '',
      `3. Technical Contact Details (Registrar)`,
      `3a. Name                       : Ngaatec DNS Operations`,
      `3b. Organisation               : Ngaatec Private Limited`,
      `3c. Address                    : 147 Kwame Nkrumah Ave, Harare, Zimbabwe`,
      `3d. Telephone                  : +263 77 123 4567`,
      `3e. Email                      : dns@ngaatec.com`,
      '',
      `4. Primary Nameserver`,
      `4a. Hostname                   : ${ns[0] || 'ns1.ngaatec.com'}`,
      `4b. IP Address (optional)      : `,
      '',
      `5. Secondary Nameserver`,
      `5a. Hostname                   : ${ns[1] || 'ns2.ngaatec.com'}`,
      `5b. IP Address (optional)      : `,
    ];

    if (ns[2]) {
      lines.push(
        '',
        `6. Tertiary Nameserver (optional)`,
        `6a. Hostname                   : ${ns[2]}`,
        `6b. IP Address                 : `
      );
    }

    if (ns[3]) {
      lines.push(
        '',
        `7. Quaternary Nameserver (optional)`,
        `7a. Hostname                   : ${ns[3]}`,
        `7b. IP Address                 : `
      );
    }

    lines.push(
      '',
      `8. Organisation Description    : ${owner.org_description || 'Commercial & Digital Services Provider'}`,
      `9. Proposed Domain Usage       : ${owner.proposed_usage || 'Official company website, web applications, and corporate email hosting.'}`,
      '',
      `** End of Application Form **`
    );

    return lines.join('\n');
  }

  getSubject(domainName: string, action: ZispaAction): string {
    const map: Record<ZispaAction, string> = {
      N: `NEW: ${domainName}`,
      M: `MODIFY: ${domainName}`,
      D: `DELETE: ${domainName}`,
      T: `TRANSFER: ${domainName}`,
    };
    return map[action];
  }

  getFilename(domainName: string, action: ZispaAction): string {
    const cleanDomain = domainName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `zispa-${action}-${cleanDomain}.txt`;
  }
}

export const zispaTemplateService = new ZispaTemplateService();

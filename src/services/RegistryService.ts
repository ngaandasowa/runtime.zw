import {
  Domain,
  RegistryAction,
  RegistryRequest,
} from '../types';

import {
  registryTemplateService,
} from './RegistryTemplateService';

export class RegistryService {
  createRequest(
    domain: Domain,
    action: RegistryAction,
    submittedBy: string = 'admin'
  ): RegistryRequest {
    const template =
      registryTemplateService.generateTemplate(
        domain,
        action
      );

    return {
      id:
        'reg-' +
        Math.random()
          .toString(36)
          .substring(2, 9),
      domain_id:
        domain.id,
      domain_name:
        domain.domain_name,
      action,
      generated_template:
        template,
      status:
        'ready',
      email_subject:
        registryTemplateService.getSubject(
          domain.domain_name,
          action
        ),
      customer_email:
        domain.user_email,
      submitted_by:
        submittedBy,
      created_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    };
  }

  async submitToRegistry(
    request: RegistryRequest
  ): Promise<{
    success: boolean;
    message: string;
    updatedRequest: RegistryRequest;
  }> {
    /*
     * Runtime is currently manual-first.
     * This action records that the registrar has sent the
     * application. It does NOT pretend that an email was
     * automatically delivered.
     */
    const updated: RegistryRequest = {
      ...request,
      status:
        'submitted',
      submitted_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
      registry_response_notes:
        'Marked as submitted by the registrar. Email delivery is manual until server-side mail integration is enabled.',
    };

    return {
      success:
        true,
      message:
        `${request.domain_name} marked as submitted.`,
      updatedRequest:
        updated,
    };
  }

  confirmRegistration(
    request: RegistryRequest
  ): RegistryRequest {
    return {
      ...request,
      status:
        'confirmed',
      confirmed_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
      registry_response_notes:
        'Registry confirmation recorded by the registrar.',
    };
  }
}

export const registryService =
  new RegistryService();
import { Domain, RegistryRequest, RegistryAction, RegistryRequestStatus } from '../types';
import { registryTemplateService } from './RegistryTemplateService';

export class RegistryService {
  /**
   * Generates a new draft registry request for a domain action
   */
  createRequest(
    domain: Domain, 
    action: RegistryAction, 
    submittedBy: string = 'admin'
  ): RegistryRequest {
    const template = registryTemplateService.generateTemplate(domain, action);
    const subject = registryTemplateService.getSubject(domain.domain_name, action);
    
    return {
      id: 'reg-' + Math.random().toString(36).substring(2, 9),
      domain_id: domain.id,
      domain_name: domain.domain_name,
      action,
      generated_template: template,
      status: 'ready',
      email_subject: subject,
      customer_email: domain.user_email,
      submitted_by: submittedBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Simulates dispatching the registry submission email with attachment
   * From: dns@runtime.co.zw -> To: admin@registry.org.zw
   */
  async submitToRegistry(request: RegistryRequest): Promise<{ success: boolean; message: string; updatedRequest: RegistryRequest }> {
    // In production, this queues a Laravel Mailable with attached .txt template
    const updated: RegistryRequest = {
      ...request,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registry_response_notes: 'Automated email dispatched to admin@registry.org.zw from dns@runtime.co.zw with attachment ' + registryTemplateService.getFilename(request.domain_name, request.action),
    };

    return {
      success: true,
      message: `Registry application for ${request.domain_name} (${request.action}) submitted to domain registry successfully.`,
      updatedRequest: updated,
    };
  }

  /**
   * Confirms a domain registry response (N, M, D, T)
   */
  confirmRegistration(request: RegistryRequest): RegistryRequest {
    return {
      ...request,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registry_response_notes: 'domain registry confirmation email parsed and validated successfully.',
    };
  }
}

export const registryService = new RegistryService();

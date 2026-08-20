import { Domain, RegistryRequest, ZispaAction, RegistryRequestStatus } from '../types';
import { zispaTemplateService } from './ZispaTemplateService';

export class RegistryService {
  /**
   * Generates a new draft registry request for a domain action
   */
  createRequest(
    domain: Domain, 
    action: ZispaAction, 
    submittedBy: string = 'admin'
  ): RegistryRequest {
    const template = zispaTemplateService.generateTemplate(domain, action);
    const subject = zispaTemplateService.getSubject(domain.domain_name, action);
    
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
   * From: dns@ngaatec.com -> To: admin@zispa.org.zw
   */
  async submitToZispa(request: RegistryRequest): Promise<{ success: boolean; message: string; updatedRequest: RegistryRequest }> {
    // In production, this queues a Laravel Mailable with attached .txt template
    const updated: RegistryRequest = {
      ...request,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registry_response_notes: 'Automated email dispatched to admin@zispa.org.zw from dns@ngaatec.com with attachment ' + zispaTemplateService.getFilename(request.domain_name, request.action),
    };

    return {
      success: true,
      message: `Registry application for ${request.domain_name} (${request.action}) submitted to ZISPA successfully.`,
      updatedRequest: updated,
    };
  }

  /**
   * Confirms a ZISPA response (N, M, D, T)
   */
  confirmRegistration(request: RegistryRequest): RegistryRequest {
    return {
      ...request,
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      registry_response_notes: 'ZISPA registry confirmation email parsed and validated successfully.',
    };
  }
}

export const registryService = new RegistryService();

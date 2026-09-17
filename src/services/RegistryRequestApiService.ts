import { getAuth } from 'firebase/auth';
import { RegistryRequest } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:4000'
    : 'https://api.runtime.co.zw');

class RegistryRequestApiService {
  private async request(path = '', init: RequestInit = {}) {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Authentication required.');

    const token = await user.getIdToken();
    const response = await fetch(
      `${API_BASE_URL}/api/registry-requests${path}`,
      {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init.headers || {}),
        },
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok || body?.success === false) {
      throw new Error(body?.message || `Registry request failed (${response.status}).`);
    }
    return body;
  }

  async getAll(): Promise<RegistryRequest[]> {
    const body = await this.request();
    return Array.isArray(body.requests) ? body.requests : [];
  }

  async create(request: RegistryRequest): Promise<RegistryRequest> {
    const body = await this.request('', {
      method: 'POST',
      body: JSON.stringify({ request }),
    });
    return body.request as RegistryRequest;
  }

  async update(
    requestId: string,
    changes: Partial<RegistryRequest>
  ): Promise<RegistryRequest> {
    const body = await this.request(`/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ changes }),
    });
    return body.request as RegistryRequest;
  }
}

export const registryRequestApiService = new RegistryRequestApiService();

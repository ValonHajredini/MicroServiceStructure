import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Tenant {
  id: string;
  name: string;
  subdomain?: string;
  enabledServices?: string[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SearchTenantsResponse {
  success: boolean;
  data: Tenant[];
  meta: {
    count: number;
    limit: number;
  };
}

export interface TenantResponse {
  success: boolean;
  data: Tenant;
  meta: {
    timestamp: string;
  };
}

export interface UpdateServicesRequest {
  services: string[];
}

@Injectable({
  providedIn: 'root',
})
export class TenantsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  searchTenants(query: string): Observable<SearchTenantsResponse> {
    return this.http.get<SearchTenantsResponse>(
      `${this.apiUrl}/api/v1/tenants/search`,
      {
        params: { name: query },
      }
    );
  }

  getTenant(tenantId: string): Observable<TenantResponse> {
    return this.http.get<TenantResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}`
    );
  }

  updateServices(
    tenantId: string,
    services: string[]
  ): Observable<TenantResponse> {
    return this.http.patch<TenantResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}/services`,
      { services }
    );
  }
}

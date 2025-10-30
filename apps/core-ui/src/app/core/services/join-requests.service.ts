import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CreateJoinRequestRequest {
  message?: string;
}

export interface CreateJoinRequestResponse {
  success: boolean;
  data: {
    id: string;
    tenantId: string;
    status: string;
    createdAt: string;
  };
}

export interface JoinRequest {
  id: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  message: string;
  status: string;
  createdAt: string;
}

export interface GetJoinRequestsResponse {
  success: boolean;
  data: JoinRequest[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface UpdateJoinRequestRequest {
  action: 'approve' | 'reject';
  adminResponse?: string;
}

export interface UpdateJoinRequestResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    adminResponse?: string;
    updatedAt: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class JoinRequestsService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  createJoinRequest(
    tenantId: string,
    data: CreateJoinRequestRequest
  ): Observable<CreateJoinRequestResponse> {
    return this.http.post<CreateJoinRequestResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}/join-requests`,
      data
    );
  }

  getJoinRequests(
    tenantId: string,
    page = 1,
    limit = 20,
    status?: string
  ): Observable<GetJoinRequestsResponse> {
    const params: any = { page, limit };
    if (status) {
      params.status = status;
    }

    return this.http.get<GetJoinRequestsResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}/join-requests`,
      { params }
    );
  }

  updateJoinRequest(
    requestId: string,
    data: UpdateJoinRequestRequest
  ): Observable<UpdateJoinRequestResponse> {
    return this.http.patch<UpdateJoinRequestResponse>(
      `${this.apiUrl}/api/v1/tenants/join-requests/${requestId}`,
      data
    );
  }
}

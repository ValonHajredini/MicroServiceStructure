import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/auth.model';

export interface TeamUser extends User {
  status: string;
  role: string;
  createdAt: string;
}

export interface TeamUsersResponse {
  success: boolean;
  data: TeamUser[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ChangeRoleRequest {
  role: string;
}

export interface ChangeRoleResponse {
  success: boolean;
  data: TeamUser;
}

export interface RemoveUserResponse {
  success: boolean;
  data: {
    message: string;
    userId: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getTeamMembers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    role?: string,
    status?: string
  ): Observable<TeamUsersResponse> {
    const params: any = { page, limit };
    if (role) params.role = role;
    if (status) params.status = status;

    return this.http.get<TeamUsersResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}/users`,
      { params }
    );
  }

  changeUserRole(
    userId: string,
    role: string
  ): Observable<ChangeRoleResponse> {
    return this.http.patch<ChangeRoleResponse>(
      `${this.apiUrl}/api/v1/users/${userId}/role`,
      { role }
    );
  }

  removeUser(
    tenantId: string,
    userId: string
  ): Observable<RemoveUserResponse> {
    return this.http.delete<RemoveUserResponse>(
      `${this.apiUrl}/api/v1/tenants/${tenantId}/users/${userId}`
    );
  }
}

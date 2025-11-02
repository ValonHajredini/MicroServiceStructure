import { Injectable } from '@angular/core';
import { JwtPayload } from '../models/jwt-payload.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly JWT_TOKEN_KEY = 'jwt_token';

  getToken(): string | null {
    return localStorage.getItem(this.JWT_TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.JWT_TOKEN_KEY, token);
  }

  decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch {
      return null;
    }
  }

  getTenantId(): string | null {
    return this.decodeToken()?.tenantId || null;
  }

  getUserId(): string | null {
    return this.decodeToken()?.sub || null;
  }

  getUser(): User | null {
    const payload = this.decodeToken();
    if (!payload) return null;

    return {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      enabledServices: payload.enabledServices
    };
  }

  isAuthenticated(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;

    const now = Date.now() / 1000;
    return payload.exp > now;
  }

  logout(): void {
    localStorage.removeItem(this.JWT_TOKEN_KEY);
    // Redirect to login page (will be handled by the guard)
  }

  /**
   * Dev-only method to simulate login with a default test user
   * Token payload: {
   *   sub: "user-001",
   *   email: "admin@tenant1.com",
   *   tenantId: "tenant-001",
   *   roles: ["admin"],
   *   enabledServices: ["notes", "kanban"]
   * }
   */
  devLogin(): void {
    // This is a valid JWT token for dev/testing purposes
    // Expires: November 1, 2026
    const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImVtYWlsIjoiYWRtaW5AdGVuYW50MS5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC0wMDEiLCJyb2xlcyI6WyJhZG1pbiJdLCJlbmFibGVkU2VydmljZXMiOlsibm90ZXMiLCJrYW5iYW4iXSwiaWF0IjoxNzYyMDQxNDUxLCJleHAiOjE3OTM1Nzc0NTF9.D9dfl9BEHxJsldUAimmoXxDVkJHsW6JeCs7TxwCltko';
    this.setToken(devToken);
  }
}

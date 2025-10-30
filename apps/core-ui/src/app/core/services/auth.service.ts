import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../environments/environment';
import {
  RegisterRequest,
  AuthResponse,
  User,
} from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private jwtHelper = new JwtHelperService();
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/api/v1/auth/register`,
      data
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/api/v1/auth/login`,
      { email, password }
    );
  }

  storeToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  setUser(user: User): void {
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Check if token is expired
    return !this.jwtHelper.isTokenExpired(token);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getEnabledServices(): string[] {
    const token = this.getToken();
    if (!token) {
      return [];
    }

    try {
      const payload = this.decodeToken(token);
      return payload.enabledServices || [];
    } catch (error) {
      console.error('Error decoding token:', error);
      return [];
    }
  }

  getUserTenantId(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeToken(token);
      return payload.tenantId || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  getUserFromToken(): User | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeToken(token);
      return {
        id: payload.sub || '',
        email: payload.email || '',
        firstName: payload.firstName || '',
        lastName: payload.lastName || '',
        tenantId: payload.tenantId || '',
        roles: payload.roles || [],
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  getUserInitials(): string {
    const user = this.getUserFromToken();
    if (!user) return '';

    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  getUserFullName(): string {
    const user = this.getUserFromToken();
    if (!user) return '';

    return `${user.firstName} ${user.lastName}`.trim();
  }

  private decodeToken(token: string): any {
    // Validate token is not expired
    if (this.jwtHelper.isTokenExpired(token)) {
      throw new Error('Token has expired');
    }

    // Use JwtHelperService for secure token decoding
    // Note: This does client-side decoding only. Signature verification happens server-side.
    return this.jwtHelper.decodeToken(token);
  }
}

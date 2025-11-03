import { Injectable, inject, InjectionToken, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';
import {
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
  JwtPayload,
  AuthConfig,
} from '../models/auth.model';

/**
 * Injection token for AuthService configuration
 * Apps can provide this in their providers to customize auth behavior
 */
export const AUTH_CONFIG = new InjectionToken<AuthConfig>('AUTH_CONFIG');

/**
 * Shared Authentication Service
 *
 * Consolidates auth logic from core-ui and notes-ui
 * Features:
 * - JWT token management with @auth0/angular-jwt
 * - Token storage in localStorage
 * - Token expiration checking
 * - User data extraction from JWT
 * - Support for both standard auth and SSO patterns
 * - Observable current user state
 *
 * @example
 * // Standard usage
 * constructor(private authService: AuthService) {}
 *
 * // With custom configuration
 * providers: [
 *   {
 *     provide: AUTH_CONFIG,
 *     useValue: {
 *       tokenKey: 'my_token',
 *       apiUrl: 'https://api.example.com',
 *       ssoEnabled: true
 *     }
 *   }
 * ]
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private jwtHelper = new JwtHelperService();
  private config = inject(AUTH_CONFIG, { optional: true });

  private readonly TOKEN_KEY: string;
  private readonly API_URL?: string;
  private readonly SSO_ENABLED: boolean;
  private readonly LOGIN_URL: string;

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Initialize configuration with defaults
    this.TOKEN_KEY = this.config?.tokenKey || 'auth_token';
    this.API_URL = this.config?.apiUrl;
    this.SSO_ENABLED = this.config?.ssoEnabled || false;
    this.LOGIN_URL = this.config?.loginUrl || '/login';

    // Initialize current user from stored token
    this.initializeUser();
  }

  /**
   * Initialize user state from stored token on service creation
   */
  private initializeUser(): void {
    const user = this.getUserFromToken();
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  // ==================== Auth API Methods ====================

  /**
   * Register a new user account
   * @param data Registration data
   * @returns Observable of AuthResponse
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    if (!this.API_URL) {
      throw new Error('API_URL not configured for AuthService');
    }
    return this.http.post<AuthResponse>(
      `${this.API_URL}/api/v1/auth/register`,
      data
    );
  }

  /**
   * Login with email and password
   * @param email User email
   * @param password User password
   * @returns Observable of AuthResponse
   */
  login(email: string, password: string): Observable<AuthResponse> {
    if (!this.API_URL) {
      throw new Error('API_URL not configured for AuthService');
    }
    return this.http.post<AuthResponse>(
      `${this.API_URL}/api/v1/auth/login`,
      { email, password }
    );
  }

  // ==================== Token Management ====================

  /**
   * Store JWT token in localStorage
   * @param token JWT token string
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    // Update current user when token changes
    const user = this.getUserFromToken();
    this.currentUserSubject.next(user);
  }

  /**
   * Get JWT token from localStorage
   * @returns Token string or null if not found
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Store both token and user (for compatibility with core-ui pattern)
   * @param token JWT token
   * @param user User object (optional, will be extracted from token if not provided)
   */
  storeAuth(token: string, user?: User): void {
    this.setToken(token);
    if (user) {
      this.currentUserSubject.next(user);
    }
  }

  /**
   * Clear authentication data and logout
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
  }

  // ==================== Token Validation ====================

  /**
   * Check if user is authenticated (has valid, non-expired token)
   * @returns True if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    // Check if token is expired using JwtHelperService
    return !this.jwtHelper.isTokenExpired(token);
  }

  /**
   * Decode JWT token securely
   * @param token JWT token string
   * @returns Decoded JWT payload
   * @throws Error if token is expired or invalid
   */
  private decodeToken(token: string): JwtPayload {
    // Validate token is not expired
    if (this.jwtHelper.isTokenExpired(token)) {
      throw new Error('Token has expired');
    }

    // Use JwtHelperService for secure token decoding
    // Note: This does client-side decoding only. Signature verification happens server-side.
    return this.jwtHelper.decodeToken(token) as JwtPayload;
  }

  // ==================== User Data Extraction ====================

  /**
   * Get current user from BehaviorSubject
   * @returns Current user or null
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Extract user data from stored JWT token
   * @returns User object or null if token invalid/missing
   */
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
        enabledServices: payload.enabledServices || [],
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get user's tenant ID from token
   * @returns Tenant ID or null
   */
  getTenantId(): string | null {
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

  /**
   * Get user's ID from token
   * @returns User ID or null
   */
  getUserId(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeToken(token);
      return payload.sub || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Get enabled services from token
   * @returns Array of enabled service names
   */
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

  /**
   * Get user roles from token
   * @returns Array of user roles
   */
  getUserRoles(): string[] {
    const token = this.getToken();
    if (!token) {
      return [];
    }

    try {
      const payload = this.decodeToken(token);
      return payload.roles || [];
    } catch (error) {
      console.error('Error decoding token:', error);
      return [];
    }
  }

  // ==================== User Display Methods ====================

  /**
   * Get user's initials for display
   * @returns User initials (e.g., "JD")
   */
  getUserInitials(): string {
    const user = this.getUserFromToken();
    if (!user) return '';

    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase();
  }

  /**
   * Get user's full name for display
   * @returns Full name (e.g., "John Doe")
   */
  getUserFullName(): string {
    const user = this.getUserFromToken();
    if (!user) return '';

    return `${user.firstName} ${user.lastName}`.trim();
  }

  /**
   * Get user's email from token
   * @returns Email or empty string
   */
  getUserEmail(): string {
    const user = this.getUserFromToken();
    return user?.email || '';
  }

  // ==================== SSO Support ====================

  /**
   * Check if service is configured for SSO
   * @returns True if SSO is enabled
   */
  isSSOEnabled(): boolean {
    return this.SSO_ENABLED;
  }

  /**
   * Get login URL for SSO redirect
   * @returns Login URL string
   */
  getLoginUrl(): string {
    return this.LOGIN_URL;
  }

  /**
   * Set user directly (for SSO scenarios where user comes from parent app)
   * @param user User object
   */
  setUser(user: User): void {
    this.currentUserSubject.next(user);
  }
}

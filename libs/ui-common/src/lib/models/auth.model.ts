/**
 * Shared authentication models for @microservice/ui-common
 * Consolidates auth types from core-ui and notes-ui
 */

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  tenantId: string;
  roles: string[];
  enabledServices: string[];
  firstName?: string;
  lastName?: string;
  iat: number; // issued at
  exp: number; // expiration
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  enabledServices?: string[];
}

export interface RegisterRequest {
  companyName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
  meta?: {
    timestamp: string;
  };
}

export interface ErrorDetail {
  field?: string;
  constraint?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail;
  };
}

/**
 * Configuration for AuthService
 */
export interface AuthConfig {
  /**
   * Token storage key in localStorage
   * @default 'auth_token'
   */
  tokenKey?: string;

  /**
   * API base URL
   * If not provided, service will need to inject it separately
   */
  apiUrl?: string;

  /**
   * Whether to support SSO (Single Sign-On) mode
   * In SSO mode, auth service can accept tokens from URL parameters
   * @default false
   */
  ssoEnabled?: boolean;

  /**
   * Login redirect URL for SSO
   * @default '/login'
   */
  loginUrl?: string;
}

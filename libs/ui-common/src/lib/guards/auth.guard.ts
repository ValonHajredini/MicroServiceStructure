import { inject, InjectionToken } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Configuration for AuthGuard behavior
 */
export interface AuthGuardConfig {
  /**
   * Whether to enable SSO mode (accept tokens from URL parameters)
   * @default false
   */
  ssoEnabled?: boolean;

  /**
   * URL to redirect to when not authenticated
   * In SSO mode, this should be the external login URL (e.g., core-ui login page)
   * In standard mode, this should be local route (e.g., '/login')
   * @default '/login'
   */
  loginUrl?: string;

  /**
   * URL parameter name for SSO token
   * @default 'token'
   */
  ssoTokenParam?: string;

  /**
   * Whether to clean URL after extracting SSO token (security best practice)
   * @default true
   */
  cleanUrlAfterSso?: boolean;
}

/**
 * Injection token for AuthGuard configuration
 */
export const AUTH_GUARD_CONFIG = new InjectionToken<AuthGuardConfig>('AUTH_GUARD_CONFIG');

/**
 * Shared Authentication Guard
 *
 * Protects routes from unauthorized access
 * Supports both standard auth and SSO patterns
 *
 * Features:
 * - Checks if user has valid, non-expired JWT token
 * - Supports SSO mode: accepts token from URL parameters
 * - Cleans URL after extracting SSO token (security best practice)
 * - Redirects to login if not authenticated
 * - Configurable via AUTH_GUARD_CONFIG injection token
 *
 * Usage:
 *
 * Standard Mode (core-ui):
 * ```typescript
 * // app.routes.ts
 * export const routes: Routes = [
 *   {
 *     path: 'dashboard',
 *     component: DashboardComponent,
 *     canActivate: [authGuard]
 *   }
 * ];
 *
 * // app.config.ts
 * providers: [
 *   {
 *     provide: AUTH_GUARD_CONFIG,
 *     useValue: {
 *       ssoEnabled: false,
 *       loginUrl: '/login'
 *     }
 *   }
 * ]
 * ```
 *
 * SSO Mode (notes-ui, kanban-ui):
 * ```typescript
 * // app.routes.ts
 * export const routes: Routes = [
 *   {
 *     path: 'notes',
 *     component: NotesComponent,
 *     canActivate: [authGuard]
 *   }
 * ];
 *
 * // app.config.ts
 * providers: [
 *   {
 *     provide: AUTH_GUARD_CONFIG,
 *     useValue: {
 *       ssoEnabled: true,
 *       loginUrl: 'http://localhost:4200/login', // External core-ui login
 *       ssoTokenParam: 'token',
 *       cleanUrlAfterSso: true
 *     }
 *   }
 * ]
 * ```
 *
 * @param route Activated route snapshot
 * @param state Router state snapshot
 * @returns True if user can activate route, false otherwise
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const config = inject(AUTH_GUARD_CONFIG, { optional: true });

  // Extract configuration with defaults
  const ssoEnabled = config?.ssoEnabled ?? false;
  const loginUrl = config?.loginUrl ?? '/login';
  const ssoTokenParam = config?.ssoTokenParam ?? 'token';
  const cleanUrlAfterSso = config?.cleanUrlAfterSso ?? true;

  // SSO Mode: Check for token in URL parameters (must happen BEFORE checking isAuthenticated)
  if (ssoEnabled) {
    const urlParams = new URLSearchParams(window.location.search);
    const ssoToken = urlParams.get(ssoTokenParam);

    if (ssoToken) {
      console.log('[AUTH GUARD] SSO token received from URL');
      // Store the token from parent auth app (e.g., core-ui)
      authService.setToken(ssoToken);

      // Clean up URL by removing token parameter (security best practice)
      if (cleanUrlAfterSso) {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);
        console.log('[AUTH GUARD] Token stored, URL cleaned');
      }
    }
  }

  // Check if user is authenticated (has valid, non-expired token)
  const isAuthenticated = authService.isAuthenticated();
  console.log('[AUTH GUARD] isAuthenticated:', isAuthenticated);

  if (isAuthenticated) {
    // User is authenticated, allow access
    return true;
  }

  // Not authenticated - redirect to login
  console.log('[AUTH GUARD] Not authenticated, redirecting to:', loginUrl);

  if (ssoEnabled && loginUrl.startsWith('http')) {
    // SSO mode with external login URL - use window.location for cross-origin redirect
    window.location.href = loginUrl;
  } else {
    // Standard mode with local route - use Angular router
    router.navigate([loginUrl]);
  }

  return false;
};

/**
 * Helper function to create a configured auth guard
 * Useful for creating guards with specific configurations inline
 *
 * @example
 * ```typescript
 * export const ssoAuthGuard = createAuthGuard({
 *   ssoEnabled: true,
 *   loginUrl: 'http://localhost:4200/login'
 * });
 *
 * // Use in routes
 * {
 *   path: 'protected',
 *   component: ProtectedComponent,
 *   canActivate: [ssoAuthGuard]
 * }
 * ```
 */
export function createAuthGuard(config: AuthGuardConfig): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const ssoEnabled = config.ssoEnabled ?? false;
    const loginUrl = config.loginUrl ?? '/login';
    const ssoTokenParam = config.ssoTokenParam ?? 'token';
    const cleanUrlAfterSso = config.cleanUrlAfterSso ?? true;

    // SSO Mode: Check for token in URL parameters
    if (ssoEnabled) {
      const urlParams = new URLSearchParams(window.location.search);
      const ssoToken = urlParams.get(ssoTokenParam);

      if (ssoToken) {
        authService.setToken(ssoToken);

        if (cleanUrlAfterSso) {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      }
    }

    // Check authentication
    if (authService.isAuthenticated()) {
      return true;
    }

    // Redirect to login
    if (ssoEnabled && loginUrl.startsWith('http')) {
      window.location.href = loginUrl;
    } else {
      router.navigate([loginUrl]);
    }

    return false;
  };
}

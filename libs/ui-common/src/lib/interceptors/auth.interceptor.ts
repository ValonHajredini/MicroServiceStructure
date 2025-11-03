import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Interface for toast notification service
 * Apps can provide their own toast service that implements this interface
 */
export interface IToastNotificationService {
  add(message: {
    severity: string;
    summary: string;
    detail: string;
    life?: number;
  }): void;
}

/**
 * Injection token for optional toast service
 */
import { InjectionToken } from '@angular/core';
export const TOAST_SERVICE = new InjectionToken<IToastNotificationService>('TOAST_SERVICE');

/**
 * Shared HTTP Interceptor for JWT Authentication
 *
 * Features:
 * - Automatically injects JWT Bearer token into requests
 * - Skips auth endpoints (login, register)
 * - Handles HTTP errors with optional toast notifications
 * - Logs out user on 401 Unauthorized
 * - Comprehensive error handling (401, 403, 404, 500, network errors)
 *
 * Usage:
 * ```typescript
 * // In app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([authInterceptor])
 *     ),
 *     // Optional: Provide toast service for error notifications
 *     {
 *       provide: TOAST_SERVICE,
 *       useExisting: MessageService
 *     }
 *   ]
 * };
 * ```
 *
 * @param req HTTP request
 * @param next HTTP handler
 * @returns Observable of HTTP event
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(TOAST_SERVICE, { optional: true });

  // Skip auth endpoints - no token needed for login/register
  const skipUrls = ['/auth/login', '/auth/register', '/auth/refresh'];
  const shouldSkip = skipUrls.some(url => req.url.includes(url));

  // Clone request and add Authorization header if token exists
  if (!shouldSkip) {
    const token = authService.getToken();
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  // Pass request to next handler with error handling
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle different HTTP error status codes
      handleHttpError(error, authService, router, toastService);
      return throwError(() => error);
    })
  );
};

/**
 * Handle HTTP errors with appropriate user feedback
 * @param error HTTP error response
 * @param authService Auth service instance
 * @param router Router instance
 * @param toastService Optional toast service for notifications
 */
function handleHttpError(
  error: HttpErrorResponse,
  authService: AuthService,
  router: Router,
  toastService: IToastNotificationService | null
): void {
  switch (error.status) {
    case 401:
      // Unauthorized - token expired or invalid
      authService.logout();
      showToast(toastService, {
        severity: 'error',
        summary: 'Unauthorized',
        detail: 'Your session has expired. Please login again.',
        life: 5000
      });

      // Redirect to login if not in SSO mode
      if (!authService.isSSOEnabled()) {
        router.navigate(['/login']);
      } else {
        // In SSO mode, redirect to configured login URL
        window.location.href = authService.getLoginUrl();
      }
      break;

    case 403:
      // Forbidden - user doesn't have permission
      showToast(toastService, {
        severity: 'error',
        summary: 'Access Denied',
        detail: "You don't have permission to access this resource.",
        life: 5000
      });
      break;

    case 404:
      // Not Found - resource doesn't exist
      showToast(toastService, {
        severity: 'error',
        summary: 'Not Found',
        detail: 'The requested resource was not found.',
        life: 5000
      });
      break;

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      showToast(toastService, {
        severity: 'error',
        summary: 'Server Error',
        detail: 'Something went wrong on the server. Please try again later.',
        life: 5000
      });
      break;

    case 0:
      // Network error - no response from server
      showToast(toastService, {
        severity: 'error',
        summary: 'Network Error',
        detail: 'Unable to connect to the server. Please check your internet connection.',
        life: 5000
      });
      break;

    default:
      // Other 4xx client errors
      if (error.status >= 400 && error.status < 500) {
        showToast(toastService, {
          severity: 'error',
          summary: 'Request Error',
          detail: error.error?.error?.message || error.error?.message || 'Your request could not be processed.',
          life: 5000
        });
      }
  }
}

/**
 * Show toast notification if toast service is available
 * @param toastService Optional toast service
 * @param message Toast message configuration
 */
function showToast(
  toastService: IToastNotificationService | null,
  message: {
    severity: string;
    summary: string;
    detail: string;
    life?: number;
  }
): void {
  if (toastService) {
    toastService.add(message);
  } else {
    // Fallback to console if no toast service provided
    console.warn(`[${message.severity.toUpperCase()}] ${message.summary}: ${message.detail}`);
  }
}

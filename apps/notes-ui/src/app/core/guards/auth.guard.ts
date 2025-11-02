import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // SSO (ARCH-001): Check for token in URL params from core-ui redirect
  // This must happen BEFORE checking isAuthenticated()
  const urlParams = new URLSearchParams(window.location.search);
  const ssoToken = urlParams.get('token');

  if (ssoToken) {
    console.log('[AUTH GUARD] SSO token received from URL');
    // Store the token from core-ui SSO
    authService.setToken(ssoToken);

    // Clean up URL by removing token parameter (security best practice)
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    console.log('[AUTH GUARD] Token stored, URL cleaned');
  }

  // Now check if user is authenticated
  const isAuth = authService.isAuthenticated();
  console.log('[AUTH GUARD] isAuthenticated:', isAuth);

  if (isAuth) {
    const payload = authService.decodeToken();
    console.log('[AUTH GUARD] Token payload:', payload);
    return true;
  }

  // Not authenticated - redirect to core-ui login
  console.log('[AUTH GUARD] Not authenticated, redirecting to login');
  window.location.href = 'http://localhost:4200/login';
  return false;
};

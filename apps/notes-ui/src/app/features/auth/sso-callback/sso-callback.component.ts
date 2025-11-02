import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * SSO Callback Component
 *
 * This component receives the SSO token from Core UI via POST message
 * and stores it securely without exposing it in the URL.
 *
 * Flow:
 * 1. Core UI opens this page in a new window/tab with window.open()
 * 2. Core UI sends token via postMessage()
 * 3. This component receives the message, validates origin, stores token
 * 4. Redirects to notes home with clean URL
 */
@Component({
  selector: 'app-sso-callback',
  standalone: true,
  template: `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; gap: 1rem;">
      <div style="font-size: 2rem;">🔐</div>
      <div style="font-size: 1.2rem; color: #666;">Authenticating...</div>
      <div style="font-size: 0.9rem; color: #999;">Please wait while we securely log you in</div>
    </div>
  `
})
export class SsoCallbackComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  ngOnInit() {
    // Listen for SSO token from Core UI
    window.addEventListener('message', this.handleMessage.bind(this), { once: true });

    // Notify parent window that we're ready to receive the token
    if (window.opener) {
      window.opener.postMessage({ type: 'SSO_READY' }, window.location.origin.replace('4201', '4200'));
    }

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!this.authService.isAuthenticated()) {
        console.error('[SSO] Token not received within timeout');
        this.router.navigate(['/login']);
      }
    }, 10000);
  }

  private handleMessage(event: MessageEvent) {
    // Security: Verify the message origin (should be from Core UI on port 4200)
    const coreUiOrigin = 'http://localhost:4200';

    if (event.origin !== coreUiOrigin) {
      console.error('[SSO] Invalid origin:', event.origin);
      return;
    }

    // Validate message structure
    if (event.data?.type === 'SSO_TOKEN' && event.data?.token) {
      console.log('[SSO] Token received from Core UI');

      // Store the token securely
      this.authService.setToken(event.data.token);

      // Redirect to notes home with clean URL (no token in URL)
      console.log('[SSO] Redirecting to notes...');
      this.router.navigate(['/notes/all']);
    } else {
      console.error('[SSO] Invalid message format:', event.data);
      this.router.navigate(['/login']);
    }
  }
}

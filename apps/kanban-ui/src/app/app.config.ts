import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import {
  authInterceptor,
  TOAST_SERVICE,
  AUTH_CONFIG,
  AUTH_GUARD_CONFIG
} from '@microservice/ui-common';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: false
        }
      }
    }),

    // PrimeNG Services
    MessageService,
    DialogService,

    // Auth Configuration
    {
      provide: AUTH_CONFIG,
      useValue: {
        tokenKey: 'auth_token', // Use same key as core-ui for SSO token sharing
        apiUrl: environment.apiUrl,
        ssoEnabled: true,
        loginUrl: `${environment.coreUiUrl}/login`
      }
    },

    // Auth Guard Configuration (SSO Mode)
    {
      provide: AUTH_GUARD_CONFIG,
      useValue: {
        ssoEnabled: true,
        loginUrl: `${environment.coreUiUrl}/login`,
        ssoTokenParam: 'token',
        cleanUrlAfterSso: true
      }
    },

    // Toast Service for Interceptor
    {
      provide: TOAST_SERVICE,
      useExisting: MessageService
    }
  ],
};

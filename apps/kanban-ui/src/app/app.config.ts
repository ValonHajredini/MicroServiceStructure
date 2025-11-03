import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

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
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),

    // PrimeNG Services
    MessageService,
    DialogService,

    // Auth Configuration
    {
      provide: AUTH_CONFIG,
      useValue: {
        tokenKey: 'kanban_token',
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

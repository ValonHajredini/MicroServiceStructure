import { Routes } from '@angular/router';
import { authGuard } from '@microservice/ui-common';
import { SsoCallbackComponent } from './features/auth/sso-callback/sso-callback.component';

export const routes: Routes = [
  {
    path: 'auth/sso-callback',
    component: SsoCallbackComponent,
    // No auth guard - this is the SSO entry point
  },
  {
    path: '',
    redirectTo: 'boards',
    pathMatch: 'full'
  },
  {
    path: 'boards',
    loadChildren: () => import('./features/kanban/kanban.routes').then(m => m.KANBAN_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'boards'
  }
];

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.Register),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard-home.component').then((m) => m.DashboardHomeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'primeng-demo',
    loadComponent: () =>
      import('./features/primeng-demo/primeng-demo.component').then((m) => m.PrimeNGDemoComponent),
    canActivate: [authGuard],
  },
  {
    path: 'join-organization',
    loadComponent: () =>
      import('./features/join-organization/join-organization.component').then(
        (m) => m.JoinOrganizationComponent
      ),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: 'services',
        loadComponent: () =>
          import('./features/admin/service-management/service-management.component').then(
            (m) => m.ServiceManagementComponent
          ),
      },
      {
        path: 'team',
        loadComponent: () =>
          import('./features/admin/team-management/team-management').then(
            (m) => m.TeamManagement
          ),
      },
      {
        path: 'join-requests',
        loadComponent: () =>
          import('./features/admin/join-requests/join-requests-list.component').then(
            (m) => m.JoinRequestsListComponent
          ),
      },
      {
        path: '',
        redirectTo: 'services',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'forgot-password',
    // ROUTE-001: Redirect to login until Story 2.5 (Password Reset) implements ForgotPassword component
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];

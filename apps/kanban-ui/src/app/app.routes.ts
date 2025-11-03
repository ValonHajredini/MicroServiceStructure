import { Routes } from '@angular/router';
import { authGuard } from '@microservice/ui-common';

export const routes: Routes = [
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

import { Routes } from '@angular/router';

export const KANBAN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/board-list/board-list.component')
      .then(m => m.BoardListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/board-view/board-view.component')
      .then(m => m.BoardViewComponent)
  }
];

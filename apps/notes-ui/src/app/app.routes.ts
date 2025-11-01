import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { NotesLayout } from './features/notes/components/notes-layout/notes-layout';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'notes',
    pathMatch: 'full'
  },
  {
    path: 'notes',
    component: NotesLayout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'all',
        pathMatch: 'full'
      },
      {
        path: 'all',
        component: NotesLayout
      },
      {
        path: 'folder/:folderId',
        component: NotesLayout
      },
      {
        path: 'note/:noteId',
        component: NotesLayout
      }
    ]
  }
];

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { NotesLayoutComponent } from './features/notes/components/notes-layout/notes-layout';
import { SsoCallbackComponent } from './features/auth/sso-callback/sso-callback.component';

export const routes: Routes = [
  {
    path: 'auth/sso-callback',
    component: SsoCallbackComponent,
    // No auth guard - this is the SSO entry point
  },
  {
    path: 'notes',
    component: NotesLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'all',
        pathMatch: 'full'
      },
      {
        path: 'all',
        component: NotesLayoutComponent
      },
      {
        path: 'folder/:folderId',
        component: NotesLayoutComponent
      },
      {
        path: 'note/:noteId',
        component: NotesLayoutComponent
      }
    ]
  },
  {
    path: '',
    redirectTo: 'notes',
    pathMatch: 'full'
  }
];

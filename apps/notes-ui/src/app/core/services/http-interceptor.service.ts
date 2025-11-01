import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { MessageService } from 'primeng/api';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const messageService = inject(MessageService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle different error status codes
      switch (error.status) {
        case 401:
          authService.logout();
          messageService.add({
            severity: 'error',
            summary: 'Unauthorized',
            detail: 'Your session has expired. Please login again.',
            life: 5000
          });
          break;
        case 403:
          messageService.add({
            severity: 'error',
            summary: 'Access Denied',
            detail: 'You don\'t have permission to access this resource.',
            life: 5000
          });
          break;
        case 404:
          messageService.add({
            severity: 'error',
            summary: 'Not Found',
            detail: 'The requested resource was not found.',
            life: 5000
          });
          break;
        case 500:
          messageService.add({
            severity: 'error',
            summary: 'Server Error',
            detail: 'Something went wrong on the server. Please try again later.',
            life: 5000
          });
          break;
        case 0:
          // Network error
          messageService.add({
            severity: 'error',
            summary: 'Network Error',
            detail: 'Unable to connect to the server. Please check your internet connection.',
            life: 5000
          });
          break;
        default:
          if (error.status >= 400 && error.status < 500) {
            messageService.add({
              severity: 'error',
              summary: 'Request Error',
              detail: error.error?.message || 'Your request could not be processed.',
              life: 5000
            });
          }
      }
      return throwError(() => error);
    })
  );
};

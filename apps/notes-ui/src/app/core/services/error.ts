import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ErrorService {
  private messageService = inject(MessageService);
  private router = inject(Router);

  handleError(error: HttpErrorResponse, context?: string) {
    let message = 'An error occurred';
    let severity: 'error' | 'warn' | 'info' = 'error';

    switch (error.status) {
      case 0:
        message = 'No internet connection. Please check your connection.';
        break;
      case 400:
        message = error.error?.error?.message || 'Invalid request';
        break;
      case 401:
        message = 'Session expired. Please login again.';
        // Redirect to login
        setTimeout(() => this.router.navigate(['/login']), 2000);
        break;
      case 403:
        message = "You don't have permission to perform this action.";
        break;
      case 404:
        message = `${context || 'Item'} not found. It may have been deleted.`;
        break;
      case 500:
      default:
        message = 'Something went wrong. Please try again.';
        break;
    }

    this.messageService.add({
      severity,
      summary: 'Error',
      detail: message,
      life: 5000
    });

    console.error('API Error:', error);
  }

  showSuccess(message: string, summary: string = 'Success') {
    this.messageService.add({
      severity: 'success',
      summary,
      detail: message,
      life: 3000
    });
  }

  showInfo(message: string, summary: string = 'Info') {
    this.messageService.add({
      severity: 'info',
      summary,
      detail: message,
      life: 3000
    });
  }

  showWarning(message: string, summary: string = 'Warning') {
    this.messageService.add({
      severity: 'warn',
      summary,
      detail: message,
      life: 4000
    });
  }
}

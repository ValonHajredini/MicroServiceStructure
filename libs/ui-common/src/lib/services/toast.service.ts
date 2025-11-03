import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Toast message configuration
 */
export interface ToastConfig {
  /**
   * Summary/title of the message
   */
  summary: string;

  /**
   * Detailed message content
   */
  detail?: string;

  /**
   * How long the toast should be displayed (in milliseconds)
   * @default 3000
   */
  life?: number;

  /**
   * Whether the toast is sticky (won't auto-close)
   * @default false
   */
  sticky?: boolean;

  /**
   * Custom data to attach to the message
   */
  data?: any;
}

/**
 * Shared Toast Service Wrapper for PrimeNG MessageService
 *
 * Provides standardized toast notification patterns:
 * - success() - Success messages (green)
 * - error() - Error messages (red)
 * - warn() - Warning messages (orange)
 * - info() - Info messages (blue)
 *
 * Features:
 * - Type-safe toast configuration
 * - Consistent default lifetimes
 * - Auto-positioning
 * - Sticky option for important messages
 *
 * Setup:
 * ```typescript
 * // app.config.ts
 * import { MessageService } from 'primeng/api';
 *
 * providers: [
 *   MessageService  // PrimeNG MessageService must be provided
 * ]
 *
 * // app.component.html
 * <p-toast position="top-right" />
 * ```
 *
 * Usage:
 * ```typescript
 * constructor(private toastService: ToastService) {}
 *
 * // Success message
 * this.toastService.success({
 *   summary: 'Board Created',
 *   detail: 'Your new board has been created successfully'
 * });
 *
 * // Error message
 * this.toastService.error({
 *   summary: 'Save Failed',
 *   detail: 'Unable to save your changes. Please try again.'
 * });
 *
 * // Warning message
 * this.toastService.warn({
 *   summary: 'Unsaved Changes',
 *   detail: 'You have unsaved changes that will be lost.'
 * });
 *
 * // Info message
 * this.toastService.info({
 *   summary: 'New Feature',
 *   detail: 'Check out our new drag-and-drop interface!'
 * });
 *
 * // Sticky message (won't auto-close)
 * this.toastService.error({
 *   summary: 'Critical Error',
 *   detail: 'Server connection lost. Please refresh the page.',
 *   sticky: true
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private messageService = inject(MessageService);

  /**
   * Default toast lifetime in milliseconds
   */
  private readonly DEFAULT_LIFE = 3000;

  /**
   * Show a success toast message (green)
   */
  success(config: ToastConfig): void {
    this.messageService.add({
      severity: 'success',
      summary: config.summary,
      detail: config.detail,
      life: config.sticky ? undefined : (config.life || this.DEFAULT_LIFE),
      data: config.data,
    });
  }

  /**
   * Show an error toast message (red)
   */
  error(config: ToastConfig): void {
    this.messageService.add({
      severity: 'error',
      summary: config.summary,
      detail: config.detail,
      life: config.sticky ? undefined : (config.life || this.DEFAULT_LIFE),
      data: config.data,
    });
  }

  /**
   * Show a warning toast message (orange/yellow)
   */
  warn(config: ToastConfig): void {
    this.messageService.add({
      severity: 'warn',
      summary: config.summary,
      detail: config.detail,
      life: config.sticky ? undefined : (config.life || this.DEFAULT_LIFE),
      data: config.data,
    });
  }

  /**
   * Show an info toast message (blue)
   */
  info(config: ToastConfig): void {
    this.messageService.add({
      severity: 'info',
      summary: config.summary,
      detail: config.detail,
      life: config.sticky ? undefined : (config.life || this.DEFAULT_LIFE),
      data: config.data,
    });
  }

  /**
   * Clear all toast messages
   */
  clear(): void {
    this.messageService.clear();
  }

  /**
   * Clear a specific toast message by key
   */
  clearByKey(key: string): void {
    this.messageService.clear(key);
  }

  /**
   * Show a custom toast message with full control
   * For advanced use cases where you need complete control over the message
   */
  custom(config: {
    severity: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';
    summary: string;
    detail?: string;
    life?: number;
    sticky?: boolean;
    closable?: boolean;
    data?: any;
    key?: string;
    icon?: string;
    contentStyleClass?: string;
    styleClass?: string;
  }): void {
    this.messageService.add({
      ...config,
      life: config.sticky ? undefined : config.life,
    });
  }
}

/**
 * Helper function to provide toast service in app config
 *
 * Usage:
 * ```typescript
 * // app.config.ts
 * import { provideToastService } from '@microservice/ui-common';
 *
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideToastService()
 *   ]
 * };
 * ```
 */
export function provideToastService() {
  return [
    MessageService,
    ToastService,
  ];
}

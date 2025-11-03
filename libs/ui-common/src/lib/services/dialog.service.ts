import { Injectable, inject, Type, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService as PrimeDialogService, DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { Observable, Subject } from 'rxjs';

/**
 * Standard dialog data structure for create/edit operations
 */
export interface DialogData<T = any> {
  mode: 'create' | 'edit' | 'view';
  title: string;
  data?: T;
  [key: string]: any;
}

/**
 * Confirm dialog configuration
 */
export interface ConfirmDialogConfig {
  title?: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptIcon?: string;
  rejectIcon?: string;
  severity?: 'success' | 'info' | 'warn' | 'danger';
}

/**
 * Shared Dialog Service Wrapper for PrimeNG Dynamic Dialog
 *
 * Provides standardized dialog patterns:
 * - confirm() - Confirmation dialogs with accept/reject
 * - create() - Create entity dialogs
 * - edit() - Edit entity dialogs
 * - view() - View entity dialogs (read-only)
 * - open() - Generic dialog opener
 *
 * Features:
 * - Type-safe dialog data and responses
 * - Observable-based response handling
 * - Standardized dialog sizing and positioning
 * - Consistent styling and UX
 *
 * Setup:
 * ```typescript
 * // app.config.ts
 * import { DialogService } from 'primeng/dynamicdialog';
 *
 * providers: [
 *   DialogService  // PrimeNG DialogService must be provided
 * ]
 * ```
 *
 * Usage:
 * ```typescript
 * // Confirm dialog
 * this.dialogService.confirm({
 *   title: 'Delete Board',
 *   message: 'Are you sure you want to delete this board?',
 *   severity: 'danger'
 * }).subscribe(confirmed => {
 *   if (confirmed) {
 *     // User clicked "Yes"
 *   }
 * });
 *
 * // Create dialog
 * this.dialogService.create(CreateBoardComponent, {
 *   title: 'Create New Board'
 * }).subscribe(board => {
 *   if (board) {
 *     // Board was created
 *   }
 * });
 *
 * // Edit dialog
 * this.dialogService.edit(EditBoardComponent, {
 *   title: 'Edit Board',
 *   data: { id: '123', name: 'Project Alpha' }
 * }).subscribe(updatedBoard => {
 *   if (updatedBoard) {
 *     // Board was updated
 *   }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private primeDialogService = inject(PrimeDialogService);

  /**
   * Open a confirmation dialog
   * Returns Observable<boolean> - true if accepted, false if rejected
   */
  confirm(config: ConfirmDialogConfig): Observable<boolean> {
    const result$ = new Subject<boolean>();

    const ref = this.primeDialogService.open(ConfirmDialogComponent, {
      header: config.title || 'Confirm',
      width: '400px',
      modal: true,
      data: {
        message: config.message,
        acceptLabel: config.acceptLabel || 'Yes',
        rejectLabel: config.rejectLabel || 'No',
        acceptIcon: config.acceptIcon || 'pi pi-check',
        rejectIcon: config.rejectIcon || 'pi pi-times',
        severity: config.severity || 'info',
      },
    });

    ref.onClose.subscribe((confirmed: boolean) => {
      result$.next(confirmed === true);
      result$.complete();
    });

    return result$.asObservable();
  }

  /**
   * Open a create entity dialog
   * Returns Observable<T> where T is the created entity (or null if cancelled)
   */
  create<T = any>(
    component: Type<any>,
    config: {
      title?: string;
      width?: string;
      data?: any;
    } = {}
  ): Observable<T | null> {
    return this.openDialog<T>(component, {
      header: config.title || 'Create',
      width: config.width || '600px',
      modal: true,
      data: {
        mode: 'create',
        ...config.data,
      },
    });
  }

  /**
   * Open an edit entity dialog
   * Returns Observable<T> where T is the updated entity (or null if cancelled)
   */
  edit<T = any>(
    component: Type<any>,
    config: {
      title?: string;
      width?: string;
      data: T;
    }
  ): Observable<T | null> {
    return this.openDialog<T>(component, {
      header: config.title || 'Edit',
      width: config.width || '600px',
      modal: true,
      data: {
        mode: 'edit',
        data: config.data,
      },
    });
  }

  /**
   * Open a view entity dialog (read-only)
   * Returns Observable<void>
   */
  view(
    component: Type<any>,
    config: {
      title?: string;
      width?: string;
      data: any;
    }
  ): Observable<void> {
    return this.openDialog<void>(component, {
      header: config.title || 'View',
      width: config.width || '600px',
      modal: true,
      data: {
        mode: 'view',
        data: config.data,
      },
    });
  }

  /**
   * Open a generic dialog with custom configuration
   * Returns Observable<T> where T is the dialog result
   */
  open<T = any>(
    component: Type<any>,
    config: DynamicDialogConfig = {}
  ): Observable<T | null> {
    return this.openDialog<T>(component, {
      modal: true,
      width: '600px',
      ...config,
    });
  }

  /**
   * Internal helper to open dialogs and return observables
   */
  private openDialog<T>(
    component: Type<any>,
    config: DynamicDialogConfig
  ): Observable<T | null> {
    const result$ = new Subject<T | null>();

    const ref = this.primeDialogService.open(component, config);

    ref.onClose.subscribe((data: T | undefined) => {
      result$.next(data === undefined ? null : data);
      result$.complete();
    });

    return result$.asObservable();
  }

  /**
   * Close all open dialogs
   */
  closeAll(): void {
    // PrimeNG DialogService doesn't have closeAll,
    // but individual dialogs can be closed via their refs
    // Apps should maintain refs if they need to close multiple dialogs
  }
}

/**
 * Simple confirm dialog component
 * This is a basic implementation - apps can create their own for custom styling
 */
@Component({
  selector: 'ui-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="confirm-dialog">
      <div class="message" [class.danger]="config.data.severity === 'danger'">
        <i
          class="pi"
          [ngClass]="{
            'pi-exclamation-triangle': config.data.severity === 'warn' || config.data.severity === 'danger',
            'pi-question-circle': config.data.severity === 'info',
            'pi-check-circle': config.data.severity === 'success'
          }"
        ></i>
        <p>{{ config.data.message }}</p>
      </div>
      <div class="actions">
        <p-button
          [label]="config.data.rejectLabel"
          [icon]="config.data.rejectIcon"
          (onClick)="reject()"
          severity="secondary"
          [outlined]="true"
        />
        <p-button
          [label]="config.data.acceptLabel"
          [icon]="config.data.acceptIcon"
          (onClick)="accept()"
          [severity]="config.data.severity || 'primary'"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .confirm-dialog {
        padding: 1rem;
      }

      .message {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 2rem;
      }

      .message i {
        font-size: 2rem;
        color: var(--primary-color);
      }

      .message.danger i {
        color: var(--red-500);
      }

      .message p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
    `,
  ],
})
export class ConfirmDialogComponent implements OnInit {
  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit() {
    // Initialize if needed
  }

  accept() {
    this.ref.close(true);
  }

  reject() {
    this.ref.close(false);
  }
}

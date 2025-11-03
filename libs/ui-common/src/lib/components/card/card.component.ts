import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

/**
 * Shared Card Component
 *
 * A flexible, reusable card component built on PrimeNG Card
 * with common patterns and slots for customization
 *
 * Features:
 * - Header, content, and footer slots
 * - Optional icon
 * - Optional status badge
 * - Optional action buttons
 * - Clickable cards
 * - Hover effects
 *
 * Usage:
 * ```html
 * <!-- Basic card -->
 * <ui-card
 *   title="My Card"
 *   subtitle="Card subtitle"
 *   description="Card description text"
 * />
 *
 * <!-- Card with icon and badge -->
 * <ui-card
 *   title="Notes Service"
 *   description="Manage your notes"
 *   icon="pi pi-book"
 *   badge="Available"
 *   badgeClass="success"
 * />
 *
 * <!-- Card with action buttons -->
 * <ui-card
 *   title="Project Board"
 *   description="View and manage tasks"
 *   primaryButtonLabel="Open"
 *   (primaryButtonClick)="openBoard()"
 *   secondaryButtonLabel="Settings"
 *   (secondaryButtonClick)="openSettings()"
 * />
 *
 * <!-- Card with custom templates -->
 * <ui-card>
 *   <ng-template #header>
 *     <div class="custom-header">...</div>
 *   </ng-template>
 *   <ng-template #content>
 *     <div class="custom-content">...</div>
 *   </ng-template>
 *   <ng-template #footer>
 *     <div class="custom-footer">...</div>
 *   </ng-template>
 * </ui-card>
 *
 * <!-- Clickable card -->
 * <ui-card
 *   title="Click me"
 *   clickable
 *   (cardClick)="handleClick()"
 * />
 * ```
 */
@Component({
  selector: 'ui-card',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule],
  template: `
    <p-card
      [styleClass]="computedStyleClass"
      (click)="onCardClick()"
    >
      <!-- Custom Header Template -->
      <ng-template pTemplate="header">
        <ng-container *ngIf="headerTemplate; else defaultHeader">
          <ng-container *ngTemplateOutlet="headerTemplate" />
        </ng-container>
        <ng-template #defaultHeader>
          @if (icon || badge) {
            <div class="card-header">
              @if (icon) {
                <i [class]="icon"></i>
              }
              @if (badge) {
                <span class="badge" [class]="badgeClass">{{ badge }}</span>
              }
            </div>
          }
        </ng-template>
      </ng-template>

      <!-- Custom Content Template -->
      <ng-container *ngIf="contentTemplate; else defaultContent">
        <ng-container *ngTemplateOutlet="contentTemplate" />
      </ng-container>
      <ng-template #defaultContent>
        @if (title) {
          <h3 class="card-title">{{ title }}</h3>
        }
        @if (subtitle) {
          <h4 class="card-subtitle">{{ subtitle }}</h4>
        }
        @if (description) {
          <p class="card-description">{{ description }}</p>
        }
        <ng-content />
      </ng-template>

      <!-- Custom Footer Template -->
      <ng-template pTemplate="footer">
        <ng-container *ngIf="footerTemplate; else defaultFooter">
          <ng-container *ngTemplateOutlet="footerTemplate" />
        </ng-container>
        <ng-template #defaultFooter>
          @if (primaryButtonLabel || secondaryButtonLabel) {
            <div class="card-actions">
              @if (secondaryButtonLabel) {
                <p-button
                  [label]="secondaryButtonLabel"
                  [icon]="secondaryButtonIcon"
                  severity="secondary"
                  [outlined]="true"
                  (onClick)="onSecondaryButtonClick($event)"
                />
              }
              @if (primaryButtonLabel) {
                <p-button
                  [label]="primaryButtonLabel"
                  [icon]="primaryButtonIcon"
                  [severity]="primaryButtonSeverity"
                  (onClick)="onPrimaryButtonClick($event)"
                />
              }
            </div>
          }
        </ng-template>
      </ng-template>
    </p-card>
  `,
  styles: [`
    :host {
      display: block;
    }

    ::ng-deep .card-clickable {
      cursor: pointer;
      transition: all 0.3s ease;
    }

    ::ng-deep .card-clickable:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 120px;
      position: relative;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .card-header i {
      font-size: 3rem;
      color: white;
    }

    .badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.375rem 0.875rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .badge.warning {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .badge.danger {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .badge.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .card-title {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
    }

    .card-subtitle {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      font-weight: 500;
      color: #64748b;
    }

    .card-description {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `]
})
export class CardComponent {
  // Basic Properties
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() description?: string;

  // Header Properties
  @Input() icon?: string;
  @Input() badge?: string;
  @Input() badgeClass?: 'success' | 'warning' | 'danger' | 'info' | string;

  // Button Properties
  @Input() primaryButtonLabel?: string;
  @Input() primaryButtonIcon?: string;
  @Input() primaryButtonSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'danger' = 'primary';

  @Input() secondaryButtonLabel?: string;
  @Input() secondaryButtonIcon?: string;

  // Behavior Properties
  @Input() clickable = false;
  @Input() styleClass?: string;

  // Events
  @Output() cardClick = new EventEmitter<void>();
  @Output() primaryButtonClick = new EventEmitter<Event>();
  @Output() secondaryButtonClick = new EventEmitter<Event>();

  // Template References
  @ContentChild('header') headerTemplate?: TemplateRef<any>;
  @ContentChild('content') contentTemplate?: TemplateRef<any>;
  @ContentChild('footer') footerTemplate?: TemplateRef<any>;

  get computedStyleClass(): string {
    const classes = [];
    if (this.clickable) {
      classes.push('card-clickable');
    }
    if (this.styleClass) {
      classes.push(this.styleClass);
    }
    return classes.join(' ');
  }

  onCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit();
    }
  }

  onPrimaryButtonClick(event: Event): void {
    event.stopPropagation(); // Prevent card click if clickable
    this.primaryButtonClick.emit(event);
  }

  onSecondaryButtonClick(event: Event): void {
    event.stopPropagation(); // Prevent card click if clickable
    this.secondaryButtonClick.emit(event);
  }
}

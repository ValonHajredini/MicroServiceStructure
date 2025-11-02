import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'ui-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() icon = 'pi-file';
  @Input() title = 'No items';
  @Input() message = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();

  onAction() {
    this.action.emit();
  }
}

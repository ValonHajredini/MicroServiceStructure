import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  imports: [CommonModule, ButtonModule],
  templateUrl: './empty-state.html',
  styleUrls: ['./empty-state.scss']
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

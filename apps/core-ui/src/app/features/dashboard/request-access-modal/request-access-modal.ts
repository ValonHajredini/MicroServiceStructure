import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-request-access-modal',
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './request-access-modal.html',
  styleUrl: './request-access-modal.scss',
})
export class RequestAccessModal {
  visible = input.required<boolean>();
  serviceName = input.required<string>();
  serviceLabel = input.required<string>();

  onClose = output<void>();

  close(): void {
    this.onClose.emit();
  }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

export interface ServiceViewModel {
  name: string;
  label: string;
  description: string;
  icon: string;
  route?: string;
  isAvailable: boolean;
  status: 'Available' | 'Locked';
  comingSoon?: boolean;
}

@Component({
  selector: 'app-service-card',
  imports: [CommonModule, CardModule, ButtonModule],
  templateUrl: './service-card.html',
  styleUrl: './service-card.scss',
})
export class ServiceCard {
  @Input({ required: true }) service!: ServiceViewModel;
  @Output() open = new EventEmitter<ServiceViewModel>();
  @Output() requestAccess = new EventEmitter<ServiceViewModel>();

  onOpen(): void {
    this.open.emit(this.service);
  }

  onRequestAccess(): void {
    this.requestAccess.emit(this.service);
  }
}

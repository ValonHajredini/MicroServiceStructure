import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';
import { ServiceCard, ServiceViewModel } from './service-card/service-card';
import { RequestAccessModal } from './request-access-modal/request-access-modal';

interface ServiceDefinition {
  name: string;
  label: string;
  description: string;
  icon: string;
  route?: string;
  comingSoon?: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, ButtonModule, RouterModule, ServiceCard, RequestAccessModal],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly allServicesDefinitions: ServiceDefinition[] = [
    {
      name: 'notes',
      label: 'Notes',
      description: 'Create, organize, and share notes with your team',
      icon: 'pi pi-file-edit',
      route: '/notes',
    },
    {
      name: 'kanban',
      label: 'Kanban Board',
      description: 'Visual task management with drag-and-drop boards',
      icon: 'pi pi-th-large',
      route: '/kanban',
    },
    {
      name: 'forms',
      label: 'Forms Builder',
      description: 'Create custom forms and collect responses',
      icon: 'pi pi-list-check',
      route: '/forms',
      comingSoon: true,
    },
  ];

  services = signal<ServiceViewModel[]>([]);
  enabledServices = signal<string[]>([]);
  loading = signal<boolean>(true);
  showModal = signal<boolean>(false);
  selectedService = signal<ServiceViewModel | null>(null);

  ngOnInit(): void {
    this.loadServices();
  }

  private loadServices(): void {
    this.loading.set(true);

    // Get enabled services from JWT
    const enabled = this.authService.getEnabledServices();
    this.enabledServices.set(enabled);

    // Map services with availability status
    const servicesWithStatus = this.allServicesDefinitions.map(service => ({
      ...service,
      isAvailable: enabled.includes(service.name),
      status: enabled.includes(service.name) ? 'Available' as const : 'Locked' as const,
    }));

    this.services.set(servicesWithStatus);
    this.loading.set(false);
  }

  openService(service: ServiceViewModel): void {
    if (service.isAvailable && !service.comingSoon && service.route) {
      // NOTE (ARCH-001): Currently using Angular Router for single-domain navigation.
      // If deploying services to separate subdomains (notes.mydomain.com, kanban.mydomain.com),
      // replace this with: window.location.href = service.url;
      this.router.navigate([service.route]);
    }
  }

  requestAccess(service: ServiceViewModel): void {
    this.selectedService.set(service);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedService.set(null);
  }

  goToServiceManagement(): void {
    this.router.navigate(['/admin/services']);
  }
}

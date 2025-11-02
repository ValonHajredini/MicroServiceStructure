import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DashboardLayoutComponent } from '../../shared/layouts/dashboard-layout.component';
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
  selector: 'app-dashboard-home',
  imports: [
    CommonModule,
    ButtonModule,
    DashboardLayoutComponent,
    ServiceCard,
    RequestAccessModal,
  ],
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
})
export class DashboardHomeComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly allServicesDefinitions: ServiceDefinition[] = [
    {
      name: 'notes',
      label: 'Notes',
      description: 'Create, organize, and share notes with your team',
      icon: 'pi pi-file-edit',
      route: 'http://localhost:4201',
    },
    {
      name: 'kanban',
      label: 'Kanban Board',
      description: 'Visual task management with drag-and-drop boards',
      icon: 'pi pi-th-large',
      route: 'http://localhost:4202',
    },
    {
      name: 'forms',
      label: 'Forms Builder',
      description: 'Create custom forms and collect responses',
      icon: 'pi pi-list-check',
      route: 'http://localhost:4203',
      comingSoon: true,
    },
  ];

  services = signal<ServiceViewModel[]>([]);
  enabledServices = signal<string[]>([]);
  loading = signal<boolean>(true);
  showModal = signal<boolean>(false);
  selectedService = signal<ServiceViewModel | null>(null);

  userFullName = signal<string>('');
  userInitials = signal<string>('');
  userRole = signal<string>('User');
  tenantName = signal<string>('Your Organization');

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadServices();
  }

  private loadUserInfo(): void {
    this.userFullName.set(this.authService.getUserFullName() || 'User');
    this.userInitials.set(this.authService.getUserInitials() || 'U');

    const user = this.authService.getUserFromToken();
    if (user?.roles && user.roles.length > 0) {
      const role = user.roles[0];
      this.userRole.set(role.charAt(0).toUpperCase() + role.slice(1));
    }

    this.tenantName.set('My Workspace');
  }

  private loadServices(): void {
    this.loading.set(true);

    const enabled = this.authService.getEnabledServices();
    this.enabledServices.set(enabled);

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
      // Get the authentication token
      const token = this.authService.getToken();

      if (token) {
        // Secure SSO: Open the service's SSO callback page
        const ssoUrl = `${service.route}/auth/sso-callback`;
        const serviceWindow = window.open(ssoUrl, '_blank');

        if (serviceWindow) {
          // Wait for the service to signal it's ready, then send token via postMessage
          const messageHandler = (event: MessageEvent) => {
            // Verify origin matches the service URL
            if (event.origin === service.route && event.data?.type === 'SSO_READY') {
              console.log('[SSO] Service ready, sending token securely');

              // Send token via postMessage (secure, not in URL)
              serviceWindow.postMessage(
                { type: 'SSO_TOKEN', token },
                service.route
              );

              // Clean up listener
              window.removeEventListener('message', messageHandler);
            }
          };

          window.addEventListener('message', messageHandler);

          // Timeout cleanup after 10 seconds
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
          }, 10000);
        } else {
          // Popup blocked - fallback to URL param method
          console.warn('[SSO] Popup blocked, using fallback URL method');
          const url = new URL(service.route);
          url.searchParams.set('token', token);
          window.location.href = url.toString();
        }
      } else {
        // No token available, redirect to login
        this.router.navigate(['/login']);
      }
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


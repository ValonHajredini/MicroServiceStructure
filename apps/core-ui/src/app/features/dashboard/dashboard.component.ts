import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
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
  imports: [
    CommonModule,
    ButtonModule,
    RouterModule,
    ServiceCard,
    RequestAccessModal,
    AvatarModule,
    MenuModule,
  ],
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

  userFullName = signal<string>('');
  userInitials = signal<string>('');
  userRole = signal<string>('User');
  tenantName = signal<string>('Your Organization');

  sidebarVisible = signal<boolean>(false);
  menuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadServices();
    this.initializeMenu();
  }

  private loadUserInfo(): void {
    this.userFullName.set(this.authService.getUserFullName() || 'User');
    this.userInitials.set(this.authService.getUserInitials() || 'U');

    const user = this.authService.getUserFromToken();
    if (user?.roles && user.roles.length > 0) {
      const role = user.roles[0];
      this.userRole.set(role.charAt(0).toUpperCase() + role.slice(1));
    }

    // For now, using a placeholder - in a real app, fetch from API
    this.tenantName.set('My Workspace');
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
      // SSO (ARCH-001): Pass JWT token to micro-frontend services on different ports
      // Each service (notes, kanban) runs on a separate port and needs authentication
      const token = this.authService.getToken();

      if (service.name === 'notes') {
        // Redirect to notes-ui with token for SSO
        window.location.href = `http://localhost:4201?token=${token}`;
      } else if (service.name === 'kanban') {
        // Redirect to kanban-ui with token for SSO
        window.location.href = `http://localhost:4202?token=${token}`;
      } else {
        // Fallback to Angular router for internal routes
        this.router.navigate([service.route]);
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleSidebar(): void {
    this.sidebarVisible.set(!this.sidebarVisible());
  }

  private initializeMenu(): void {
    const user = this.authService.getUserFromToken();
    const isAdmin = user?.roles?.includes('admin');

    this.menuItems.set([
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        command: () => {
          this.router.navigate(['/dashboard']);
          this.sidebarVisible.set(false);
        },
      },
      {
        separator: true,
      },
      {
        label: 'Services',
        items: [
          {
            label: 'Notes',
            icon: 'pi pi-file-edit',
            command: () => {
              const notesService = this.services().find((s) => s.name === 'notes');
              if (notesService?.isAvailable) {
                this.router.navigate(['/notes']);
                this.sidebarVisible.set(false);
              }
            },
            disabled: !this.enabledServices().includes('notes'),
          },
          {
            label: 'Kanban Board',
            icon: 'pi pi-th-large',
            command: () => {
              const kanbanService = this.services().find((s) => s.name === 'kanban');
              if (kanbanService?.isAvailable) {
                this.router.navigate(['/kanban']);
                this.sidebarVisible.set(false);
              }
            },
            disabled: !this.enabledServices().includes('kanban'),
          },
          {
            label: 'Forms Builder',
            icon: 'pi pi-list-check',
            badge: 'Soon',
            disabled: true,
          },
        ],
      },
      {
        separator: true,
      },
      {
        label: 'Settings',
        items: [
          {
            label: 'Profile',
            icon: 'pi pi-user',
            command: () => {
              this.router.navigate(['/profile']);
              this.sidebarVisible.set(false);
            },
          },
          {
            label: 'Service Management',
            icon: 'pi pi-cog',
            command: () => {
              this.goToServiceManagement();
              this.sidebarVisible.set(false);
            },
            visible: isAdmin,
          },
        ],
      },
      {
        separator: true,
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        },
      },
    ]);
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FormsModule } from '@angular/forms';
import { TenantsService } from '../../../core/services/tenants.service';
import { AuthService } from '../../../core/services/auth.service';

interface Service {
  name: string;
  label: string;
  description: string;
  icon: string;
  comingSoon?: boolean;
}

@Component({
  selector: 'app-service-management',
  imports: [
    CommonModule,
    CardModule,
    CheckboxModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    FormsModule,
  ],
  templateUrl: './service-management.component.html',
  styleUrls: ['./service-management.component.scss'],
})
export class ServiceManagementComponent implements OnInit {
  private tenantsService = inject(TenantsService);
  private authService = inject(AuthService);
  private router = inject(Router);

  availableServices: Service[] = [
    {
      name: 'notes',
      label: 'Notes Service',
      description: 'Create, edit, and organize notes with attachments.',
      icon: 'pi pi-file-edit',
    },
    {
      name: 'kanban',
      label: 'Kanban Board',
      description: 'Visual task management with drag-and-drop boards.',
      icon: 'pi pi-th-large',
    },
    {
      name: 'forms',
      label: 'Forms Builder',
      description: 'Create custom forms and collect responses.',
      icon: 'pi pi-list-check',
      comingSoon: true,
    },
  ];

  selectedServices = signal<string[]>([]);
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  tenantId: string | null = null;

  ngOnInit(): void {
    this.tenantId = this.authService.getUserTenantId();

    if (!this.tenantId) {
      this.errorMessage.set('Unable to determine tenant ID');
      this.loading.set(false);
      return;
    }

    this.loadTenantServices();
  }

  loadTenantServices(): void {
    if (!this.tenantId) return;

    this.tenantsService.getTenant(this.tenantId).subscribe({
      next: (response) => {
        this.selectedServices.set(response.data.enabledServices || []);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading tenant services:', error);
        this.errorMessage.set(
          'Unable to load services. Please try again later.'
        );
        this.loading.set(false);
      },
    });
  }

  isServiceSelected(serviceName: string): boolean {
    return this.selectedServices().includes(serviceName);
  }

  toggleService(serviceName: string): void {
    const current = [...this.selectedServices()];
    const index = current.indexOf(serviceName);

    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(serviceName);
    }

    this.selectedServices.set(current);
  }

  saveChanges(): void {
    if (!this.tenantId) return;

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.tenantsService
      .updateServices(this.tenantId, this.selectedServices())
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.successMessage.set(
            'Services updated successfully! Logging you out to apply changes...'
          );

          // Automatically log out after 2 seconds to refresh JWT token
          setTimeout(() => {
            this.logout();
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating services:', error);
          this.saving.set(false);
          this.errorMessage.set(
            error.error?.error?.message ||
              'Unable to update services. Please try again.'
          );
        },
      });
  }

  logout(): void {
    this.authService.logout();
    // Redirect to login with a message
    this.router.navigate(['/login'], {
      state: { message: 'Services updated successfully! Please log in again to access your new services.' }
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
})
export class AdminLayoutComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  navItems: NavItem[] = [
    {
      label: 'Service Management',
      icon: 'pi pi-cog',
      route: '/admin/services',
    },
    {
      label: 'Team Management',
      icon: 'pi pi-users',
      route: '/admin/team',
    },
    {
      label: 'Join Requests',
      icon: 'pi pi-user-plus',
      route: '/admin/join-requests',
    },
  ];

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  getUserName(): string {
    return this.authService.getUserFullName() || 'Admin';
  }
}

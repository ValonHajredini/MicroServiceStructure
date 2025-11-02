import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AvatarModule } from 'primeng/avatar';
import { PanelMenuModule } from 'primeng/panelmenu';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
import { UserMenuComponent } from '@microservice/ui-common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    DrawerModule,
    AvatarModule,
    UserMenuComponent,
    PanelMenuModule,
    BadgeModule,
  ],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss']
})
export class DashboardLayoutComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  sidebarVisible = signal(false);

  userFullName = signal('');
  userEmail = signal('');
  userInitials = signal('');
  userRole = signal('');
  tenantName = signal('');

  menuItems = signal<MenuItem[]>([]);
  notifications = signal<Notification[]>([]);
  userMenuItems = signal<MenuItem[]>([]);

  sidebarCollapsed = signal(false);

  ngOnInit(): void {
    this.loadUserInfo();
    this.initializeMenus();
  }

  private loadUserInfo(): void {
    const user = this.authService.getUserFromToken();

    this.userFullName.set(this.authService.getUserFullName() || 'User');
    this.userEmail.set(user?.email || '');
    this.userInitials.set(this.authService.getUserInitials() || 'U');

    if (user?.roles && user.roles.length > 0) {
      const role = user.roles[0];
      this.userRole.set(role.charAt(0).toUpperCase() + role.slice(1));
    }

    this.tenantName.set('My Workspace');
  }

  private initializeMenus(): void {
    const user = this.authService.getUserFromToken();
    const isAdmin = user?.roles?.includes('admin');

    // Main sidebar menu with keyboard shortcuts and enhanced styling
    this.menuItems.set([
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/dashboard'],
        routerLinkActiveOptions: { exact: true },
        title: 'Go to Dashboard',
        badge: '',
        badgeStyleClass: 'shortcut-badge',
        styleClass: 'menu-item-primary'
      },
      {
        separator: true,
        styleClass: 'menu-section-separator'
      },
      {
        label: 'Services',
        icon: 'pi pi-th-large',
        styleClass: 'menu-section',
        items: [
          {
            label: 'Notes',
            icon: 'pi pi-file-edit',
            command: () => window.location.href = 'http://localhost:4201',
            title: 'Open Notes Service',
            badge: 'N',
            badgeStyleClass: 'shortcut-badge'
          },
          {
            label: 'Kanban Board',
            icon: 'pi pi-list',
            command: () => window.location.href = 'http://localhost:4202',
            title: 'Open Kanban Board',
            badge: 'K',
            badgeStyleClass: 'shortcut-badge'
          },
          {
            label: 'Forms Builder',
            icon: 'pi pi-list-check',
            disabled: true,
            badge: 'Soon',
            badgeStyleClass: 'badge-coming-soon',
            title: 'Coming Soon'
          }
        ]
      },
      {
        separator: true,
        styleClass: 'menu-section-separator',
        visible: isAdmin
      },
      {
        label: 'Admin',
        icon: 'pi pi-cog',
        visible: isAdmin,
        styleClass: 'menu-section',
        items: [
          {
            label: 'Service Management',
            icon: 'pi pi-wrench',
            routerLink: ['/admin/services'],
            title: 'Manage Services',
            badge: 'S',
            badgeStyleClass: 'shortcut-badge'
          },
          {
            label: 'Team Management',
            icon: 'pi pi-users',
            routerLink: ['/admin/team'],
            title: 'Manage Team Members',
            badge: 'T',
            badgeStyleClass: 'shortcut-badge'
          },
          {
            label: 'Join Requests',
            icon: 'pi pi-user-plus',
            routerLink: ['/admin/join-requests'],
            title: 'Review Join Requests',
            badge: '3',
            badgeStyleClass: 'badge-notification'
          }
        ]
      },
      {
        separator: true,
        styleClass: 'menu-section-separator'
      },
      {
        label: 'Settings',
        icon: 'pi pi-sliders-h',
        styleClass: 'menu-section',
        items: [
          {
            label: 'Profile',
            icon: 'pi pi-user',
            routerLink: ['/profile'],
            title: 'Edit Your Profile',
            badge: 'P',
            badgeStyleClass: 'shortcut-badge'
          },
          {
            label: 'Preferences',
            icon: 'pi pi-cog',
            routerLink: ['/preferences'],
            title: 'Application Preferences'
          }
        ]
      },
      {
        separator: true,
        styleClass: 'menu-section-separator'
      },
      {
        label: 'PrimeNG Demo',
        icon: 'pi pi-palette',
        routerLink: ['/primeng-demo'],
        title: 'Component Showcase',
        styleClass: 'menu-item-secondary'
      }
    ]);

    // User dropdown menu
    this.userMenuItems.set([
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/profile']),
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/settings']),
      },
      {
        separator: true,
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ]);
  }

  toggleSidebar(): void {
    this.sidebarVisible.set(!this.sidebarVisible());
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: Date;
}

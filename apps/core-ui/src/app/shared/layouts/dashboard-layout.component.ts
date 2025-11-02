import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { MenuItem } from 'primeng/api';
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
    MenuModule,
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
    this.userFullName.set(this.authService.getUserFullName() || 'User');
    this.userInitials.set(this.authService.getUserInitials() || 'U');
    
    const user = this.authService.getUserFromToken();
    if (user?.roles && user.roles.length > 0) {
      const role = user.roles[0];
      this.userRole.set(role.charAt(0).toUpperCase() + role.slice(1));
    }
    
    this.tenantName.set('My Workspace');
  }

  private initializeMenus(): void {
    const user = this.authService.getUserFromToken();
    const isAdmin = user?.roles?.includes('admin');

    // Main sidebar menu
    this.menuItems.set([
      {
        label: 'Dashboard',
        icon: 'pi pi-home',
        routerLink: ['/dashboard'],
        routerLinkActiveOptions: { exact: true }
      },
      {
        separator: true
      },
      {
        label: 'Services',
        icon: 'pi pi-th-large',
        items: [
          {
            label: 'Notes',
            icon: 'pi pi-file-edit',
            command: () => window.location.href = 'http://localhost:4201'
          },
          {
            label: 'Kanban Board',
            icon: 'pi pi-list',
            command: () => window.location.href = 'http://localhost:4202'
          },
          {
            label: 'Forms Builder',
            icon: 'pi pi-list-check',
            disabled: true,
            badge: 'Soon'
          }
        ]
      },
      {
        separator: true
      },
      {
        label: 'Admin',
        icon: 'pi pi-cog',
        visible: isAdmin,
        items: [
          {
            label: 'Service Management',
            icon: 'pi pi-wrench',
            routerLink: ['/admin/services']
          },
          {
            label: 'Team Management',
            icon: 'pi pi-users',
            routerLink: ['/admin/team']
          },
          {
            label: 'Join Requests',
            icon: 'pi pi-user-plus',
            routerLink: ['/admin/join-requests']
          }
        ]
      },
      {
        separator: true
      },
      {
        label: 'Settings',
        icon: 'pi pi-sliders-h',
        items: [
          {
            label: 'Profile',
            icon: 'pi pi-user',
            routerLink: ['/profile']
          },
          {
            label: 'Preferences',
            icon: 'pi pi-cog',
            routerLink: ['/preferences']
          }
        ]
      }
    ]);

    // User dropdown menu
    this.userMenuItems.set([
      {
        label: this.userFullName(),
        icon: 'pi pi-user',
        disabled: true,
        styleClass: 'font-semibold'
      },
      {
        separator: true
      },
      {
        label: 'Profile',
        icon: 'pi pi-id-card',
        command: () => this.router.navigate(['/profile'])
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.router.navigate(['/settings'])
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => this.logout()
      }
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


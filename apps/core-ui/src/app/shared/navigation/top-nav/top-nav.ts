import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { UserMenuComponent } from '@microservice/ui-common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-top-nav',
  imports: [CommonModule, UserMenuComponent],
  templateUrl: './top-nav.html',
  styleUrl: './top-nav.scss',
})
export class TopNav implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  tenantName = signal<string>('My Organization');
  userFullName = signal<string>('');
  userEmail = signal<string>('');
  userInitials = signal<string>('');
  userMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    this.loadUserData();
    this.setupUserMenu();
  }

  private loadUserData(): void {
    const user = this.authService.getUserFromToken();

    if (user) {
      this.userFullName.set(`${user.firstName} ${user.lastName}`.trim());
      this.userEmail.set(user.email);
      this.userInitials.set(this.authService.getUserInitials());
    }
  }

  private setupUserMenu(): void {
    this.userMenuItems.set([
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.goToProfile(),
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => this.goToSettings(),
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

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

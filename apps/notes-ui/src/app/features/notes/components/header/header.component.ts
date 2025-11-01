import { Component, Output, EventEmitter, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, ButtonModule, MenuModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarVisible = input<boolean>(true);
  @Output() toggleSidebar = new EventEmitter<void>();

  userEmail = signal<string>('');
  userMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    const payload = this.authService.decodeToken();
    if (payload?.email) {
      this.userEmail.set(payload.email);
    }

    this.userMenuItems.set([
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        command: () => {
          // Future: navigate to settings
          console.log('Settings clicked');
        },
        disabled: true
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        }
      }
    ]);
  }

  onMenuToggle(): void {
    this.toggleSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
    // Redirect to login (Core Service)
    window.location.href = 'http://localhost:3000/login';
  }
}

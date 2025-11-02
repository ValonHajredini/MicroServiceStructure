import { Component, Output, EventEmitter, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { UserMenuComponent } from '@microservice/ui-common';
import { AuthService } from '../../../../core/services/auth.service';
import { SearchBarComponent } from '../search-bar/search-bar';
import { SearchResultNote } from '../../services/notes.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, UserMenuComponent, SearchBarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarVisible = input<boolean>(true);
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() searchResults = new EventEmitter<SearchResultNote[]>();
  @Output() searchCleared = new EventEmitter<void>();

  userEmail = signal<string>('');
  userMenuItems = signal<MenuItem[]>([]);

  ngOnInit(): void {
    const payload = this.authService.decodeToken();
    if (payload?.email) {
      this.userEmail.set(payload.email);
    }

    this.userMenuItems.set([
      {
        label: 'Back to Dashboard',
        icon: 'pi pi-home',
        command: () => {
          this.goToDashboard();
        }
      },
      {
        separator: true
      },
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

  goToDashboard(): void {
    // Navigate back to core-ui dashboard
    window.location.href = 'http://localhost:4200/dashboard';
  }

  logout(): void {
    this.authService.logout();
    // Redirect to core-ui login page
    window.location.href = 'http://localhost:4200/login';
  }

  onSearchResults(results: SearchResultNote[]): void {
    this.searchResults.emit(results);
  }

  onSearchCleared(): void {
    this.searchCleared.emit();
  }
}

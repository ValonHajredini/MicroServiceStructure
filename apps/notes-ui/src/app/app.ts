import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet, ActivatedRoute } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from './core/services/auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule, ButtonModule, TooltipModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('notes-ui');
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isDevelopment = !environment.production;
  isAuthenticated = signal(false);

  ngOnInit(): void {
    // SSO token handling is now done in auth guard (before routing)
    this.checkAuth();
  }

  checkAuth(): void {
    this.isAuthenticated.set(this.authService.isAuthenticated());
  }

  devLogin(): void {
    this.authService.devLogin();
    this.isAuthenticated.set(true);
    // Navigate to notes after login
    this.router.navigate(['/notes']);
  }
}

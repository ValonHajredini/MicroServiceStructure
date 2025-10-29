import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly AUTH_SERVICE_URL = 'http://localhost:3001';
  private readonly RESOURCE_SERVICE_URL = 'http://localhost:3002';

  // Login form fields
  loginEmail = 'admin@tenant1.com';
  loginPassword = 'password123';

  // State signals
  accessToken = signal<string>('');
  decodedToken = signal<any>({});
  isLoggedIn = signal<boolean>(false);
  loginError = signal<string>('');
  resourceResponse = signal<any>(null);
  resourceError = signal<string>('');

  constructor(private http: HttpClient) {
    // Check for existing token on init
    const token = localStorage.getItem('access_token');
    if (token) {
      this.accessToken.set(token);
      this.decodeToken(token);
      this.isLoggedIn.set(true);
    }
  }

  async login() {
    this.loginError.set('');

    try {
      const response: any = await this.http.post(
        `${this.AUTH_SERVICE_URL}/auth/login`,
        {
          email: this.loginEmail,
          password: this.loginPassword
        }
      ).toPromise();

      // Store token
      this.accessToken.set(response.access_token);
      localStorage.setItem('access_token', response.access_token);

      // Decode and display token
      this.decodeToken(response.access_token);
      this.isLoggedIn.set(true);

      console.log('Login successful:', response);
    } catch (error: any) {
      this.loginError.set(error.message || 'Login failed');
      console.error('Login error:', error);
    }
  }

  logout() {
    this.accessToken.set('');
    this.decodedToken.set({});
    this.isLoggedIn.set(false);
    this.resourceResponse.set(null);
    this.resourceError.set('');
    localStorage.removeItem('access_token');
  }

  async callProtectedResource() {
    this.resourceResponse.set(null);
    this.resourceError.set('');

    try {
      const response: any = await this.http.get(
        `${this.RESOURCE_SERVICE_URL}/protected/resource`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken()}`
          }
        }
      ).toPromise();

      this.resourceResponse.set(response);
      console.log('Protected resource response:', response);
    } catch (error: any) {
      this.resourceError.set(error.message || 'Failed to call protected resource');
      console.error('Resource call error:', error);
    }
  }

  private decodeToken(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));
      this.decodedToken.set(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      this.decodedToken.set({ error: 'Failed to decode token' });
    }
  }
}

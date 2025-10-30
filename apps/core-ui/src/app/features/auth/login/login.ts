import { Component, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  loginForm: FormGroup;
  errorMessage = '';
  isSubmitting = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService
      .login(email, password)
      .pipe(takeUntilDestroyed(this.destroyRef)) // MEM-001: Prevent memory leaks
      .subscribe({
        next: (response) => {
          // Store token and user info via AuthService (ARCH-001, ARCH-002)
          this.authService.storeToken(response.data.token);
          this.authService.setUser(response.data.user);
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isSubmitting = false;
          if (error.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (error.status === 0) {
            this.errorMessage =
              'Unable to connect. Check your internet connection.';
          } else {
            this.errorMessage = 'An error occurred. Please try again.';
          }
          this.loginForm.patchValue({ password: '' });
        },
      });
  }
}

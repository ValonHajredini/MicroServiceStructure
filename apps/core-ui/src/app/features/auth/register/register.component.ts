import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { passwordStrengthValidator } from './password-strength.validator';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorResponse } from '../../../core/models/auth.model';

@Component({
  selector: 'app-register',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm: FormGroup;
  isSubmitting = false;
  generalError: string | null = null;

  constructor() {
    this.registerForm = this.fb.group({
      companyName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordStrengthValidator()]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
    });
  }

  get companyName() {
    return this.registerForm.get('companyName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  getPasswordErrors(): string[] {
    const errors: string[] = [];
    if (this.password?.errors?.['passwordStrength']) {
      const strength = this.password.errors['passwordStrength'];
      if (!strength.hasMinLength) {
        errors.push('Password must be at least 8 characters');
      }
      if (!strength.hasUpperCase) {
        errors.push('Password must contain at least 1 uppercase letter');
      }
      if (!strength.hasLowerCase) {
        errors.push('Password must contain at least 1 lowercase letter');
      }
      if (!strength.hasNumberOrSpecial) {
        errors.push('Password must contain at least 1 number or special character');
      }
    }
    return errors;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.generalError = null;

    this.authService.register(this.registerForm.value).subscribe({
      next: (response) => {
        if (response.success && response.data.token) {
          // Store JWT in localStorage
          localStorage.setItem('auth_token', response.data.token);

          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.handleError(error);
      },
    });
  }

  private handleError(error: HttpErrorResponse): void {
    if (error.error && typeof error.error === 'object') {
      const errorResponse = error.error as ErrorResponse;

      // Check for field-specific errors
      if (
        errorResponse.error?.details?.field &&
        this.registerForm.get(errorResponse.error.details.field)
      ) {
        const field = this.registerForm.get(errorResponse.error.details.field);
        field?.setErrors({
          serverError: errorResponse.error.message,
        });
      } else {
        // General error message
        this.generalError =
          errorResponse.error?.message ||
          'Registration failed. Please try again.';
      }
    } else if (error.status === 0) {
      // Network error
      this.generalError =
        'Unable to connect. Please check your internet connection.';
    } else {
      // Unexpected error
      this.generalError = 'An unexpected error occurred. Please try again.';
    }
  }
}

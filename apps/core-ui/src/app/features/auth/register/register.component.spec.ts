import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Register } from './register.component';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.model';

describe('Register Component', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockAuthResponse: AuthResponse = {
    success: true,
    data: {
      token: 'test-jwt-token',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant-1',
        roles: ['admin'],
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['register']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([
          { path: 'register', component: Register },
          { path: 'login', component: Register },
          { path: 'dashboard', component: Register },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    spyOn(mockRouter, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should initialize form with empty values', () => {
      expect(component.registerForm.value).toEqual({
        companyName: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
      });
    });

    it('should require all fields', () => {
      expect(component.registerForm.valid).toBeFalse();

      component.registerForm.patchValue({
        companyName: 'Test Company',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(component.registerForm.valid).toBeTrue();
    });

    it('should validate email format', () => {
      const emailControl = component.email;

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBeTrue();

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBeFalse();
    });

    it('should validate password strength - minimum 8 characters', () => {
      const passwordControl = component.password;

      passwordControl?.setValue('Pass1');
      expect(passwordControl?.hasError('passwordStrength')).toBeTrue();

      passwordControl?.setValue('Password1');
      expect(passwordControl?.hasError('passwordStrength')).toBeFalse();
    });

    it('should validate password strength - at least 1 uppercase', () => {
      const passwordControl = component.password;

      passwordControl?.setValue('password1');
      expect(passwordControl?.hasError('passwordStrength')).toBeTrue();

      passwordControl?.setValue('Password1');
      expect(passwordControl?.hasError('passwordStrength')).toBeFalse();
    });

    it('should validate password strength - at least 1 number', () => {
      const passwordControl = component.password;

      passwordControl?.setValue('Password');
      expect(passwordControl?.hasError('passwordStrength')).toBeTrue();

      passwordControl?.setValue('Password1');
      expect(passwordControl?.hasError('passwordStrength')).toBeFalse();
    });

    it('should mark all fields as touched on invalid submit', () => {
      component.onSubmit();

      expect(component.companyName?.touched).toBeTrue();
      expect(component.email?.touched).toBeTrue();
      expect(component.password?.touched).toBeTrue();
      expect(component.firstName?.touched).toBeTrue();
      expect(component.lastName?.touched).toBeTrue();
    });
  });

  describe('Registration Service', () => {
    it('should call authService.register with correct parameters', () => {
      const formData = {
        companyName: 'Test Company',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      component.registerForm.patchValue(formData);
      mockAuthService.register.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(mockAuthService.register).toHaveBeenCalledWith(formData);
    });

    it('should not call service if form is invalid', () => {
      component.onSubmit();

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    beforeEach(() => {
      component.registerForm.patchValue({
        companyName: 'Test Company',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should store JWT in localStorage on success', () => {
      spyOn(localStorage, 'setItem');
      mockAuthService.register.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'auth_token',
        'test-jwt-token'
      );
    });

    it('should navigate to dashboard on success', () => {
      mockAuthService.register.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should set isSubmitting to true during submission', () => {
      mockAuthService.register.and.returnValue(of(mockAuthResponse));

      expect(component.isSubmitting).toBeFalse();

      component.onSubmit();

      expect(component.isSubmitting).toBeTrue();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      component.registerForm.patchValue({
        companyName: 'Test Company',
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should display general error message for non-field errors', () => {
      const errorResponse = new HttpErrorResponse({
        error: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Registration failed',
          },
        },
        status: 400,
      });

      mockAuthService.register.and.returnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(component.generalError).toBe('Registration failed');
      expect(component.isSubmitting).toBeFalse();
    });

    it('should set field-specific error for email exists', () => {
      const errorResponse = new HttpErrorResponse({
        error: {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email already exists',
            details: {
              field: 'email',
              constraint: 'unique',
            },
          },
        },
        status: 409,
      });

      mockAuthService.register.and.returnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(component.email?.hasError('serverError')).toBeTrue();
      expect(component.email?.errors?.['serverError']).toBe(
        'Email already exists'
      );
    });

    it('should display network error message when status is 0', () => {
      const errorResponse = new HttpErrorResponse({
        error: null,
        status: 0,
      });

      mockAuthService.register.and.returnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(component.generalError).toBe(
        'Unable to connect. Please check your internet connection.'
      );
    });

    it('should display unexpected error message for unknown errors', () => {
      const errorResponse = new HttpErrorResponse({
        error: 'Unknown error',
        status: 500,
      });

      mockAuthService.register.and.returnValue(throwError(() => errorResponse));

      component.onSubmit();

      expect(component.generalError).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('should clear previous errors on new submission', () => {
      component.generalError = 'Previous error';

      mockAuthService.register.and.returnValue(of(mockAuthResponse));

      component.onSubmit();

      expect(component.generalError).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    it('should return password errors when password is invalid', () => {
      component.password?.setValue('pass');
      component.password?.markAsTouched();

      const errors = component.getPasswordErrors();

      expect(errors).toContain('Password must be at least 8 characters');
      expect(errors).toContain(
        'Password must contain at least 1 uppercase letter'
      );
      expect(errors).toContain('Password must contain at least 1 number or special character');
    });

    it('should return empty array when password is valid', () => {
      component.password?.setValue('Password123');

      const errors = component.getPasswordErrors();

      expect(errors.length).toBe(0);
    });
  });
});

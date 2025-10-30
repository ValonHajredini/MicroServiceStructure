import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.model';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'login',
      'storeToken',
      'setUser',
    ]);

    await TestBed.configureTestingModule({
      imports: [Login, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as any;
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should initialize with empty form', () => {
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should mark email as invalid when empty', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.markAsTouched();
      expect(emailControl?.invalid).toBeTruthy();
      expect(emailControl?.errors?.['required']).toBeTruthy();
    });

    it('should mark email as invalid when format is incorrect', () => {
      const emailControl = component.loginForm.get('email');
      emailControl?.setValue('invalid-email');
      emailControl?.markAsTouched();
      expect(emailControl?.invalid).toBeTruthy();
      expect(emailControl?.errors?.['email']).toBeTruthy();
    });

    it('should mark password as invalid when empty', () => {
      const passwordControl = component.loginForm.get('password');
      passwordControl?.markAsTouched();
      expect(passwordControl?.invalid).toBeTruthy();
      expect(passwordControl?.errors?.['required']).toBeTruthy();
    });

    it('should mark form as valid when all fields are filled correctly', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(component.loginForm.valid).toBeTruthy();
    });
  });

  describe('Login Submission', () => {
    it('should not submit if form is invalid', () => {
      component.onSubmit();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should call auth service login method on valid submission', () => {
      const mockResponse: AuthResponse = {
        success: true,
        data: {
          token: 'test-token',
          user: {
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            tenantId: 'tenant-123',
            roles: ['user'],
          },
        },
        meta: {
          timestamp: '2025-10-29T10:00:00Z',
        },
      };

      authService.login.and.returnValue(of(mockResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should store JWT token via AuthService on successful login', () => {
      const mockResponse: AuthResponse = {
        success: true,
        data: {
          token: 'test-token',
          user: {
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            tenantId: 'tenant-123',
            roles: ['user'],
          },
        },
        meta: {
          timestamp: '2025-10-29T10:00:00Z',
        },
      };

      authService.login.and.returnValue(of(mockResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(authService.storeToken).toHaveBeenCalledWith('test-token');
      expect(authService.setUser).toHaveBeenCalledWith(mockResponse.data.user);
    });

    it('should navigate to dashboard on successful login', () => {
      const mockResponse: AuthResponse = {
        success: true,
        data: {
          token: 'test-token',
          user: {
            id: '123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            tenantId: 'tenant-123',
            roles: ['user'],
          },
        },
        meta: {
          timestamp: '2025-10-29T10:00:00Z',
        },
      };

      authService.login.and.returnValue(of(mockResponse));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('Error Handling', () => {
    it('should display error message on 401 Unauthorized', () => {
      const error = { status: 401 };
      authService.login.and.returnValue(throwError(() => error));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      component.onSubmit();

      expect(component.errorMessage).toBe('Invalid email or password');
    });

    it('should clear password field on error', () => {
      const error = { status: 401 };
      authService.login.and.returnValue(throwError(() => error));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      component.onSubmit();

      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should display network error message on connection failure', () => {
      const error = { status: 0 };
      authService.login.and.returnValue(throwError(() => error));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(component.errorMessage).toBe(
        'Unable to connect. Check your internet connection.'
      );
    });

    it('should display generic error message for other errors', () => {
      const error = { status: 500 };
      authService.login.and.returnValue(throwError(() => error));

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123',
      });

      component.onSubmit();

      expect(component.errorMessage).toBe('An error occurred. Please try again.');
    });
  });
});

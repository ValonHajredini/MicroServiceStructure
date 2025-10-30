import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { RegisterRequest, AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  // Helper function to create valid JWT tokens for testing
  const createMockJWT = (payload: any): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = btoa(JSON.stringify({
      sub: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: 'tenant-1',
      roles: ['user'],
      enabledServices: ['notes', 'kanban'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      ...payload
    }));
    const signature = btoa('mock-signature');
    return `${header}.${body}.${signature}`;
  };

  const mockRegisterRequest: RegisterRequest = {
    companyName: 'Test Company',
    email: 'test@example.com',
    password: 'Password123',
    firstName: 'John',
    lastName: 'Doe',
  };

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

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('register', () => {
    it('should send POST request to correct endpoint', () => {
      service.register(mockRegisterRequest).subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('should send registration data in request body', () => {
      service.register(mockRegisterRequest).subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      expect(req.request.body).toEqual(mockRegisterRequest);
      req.flush(mockAuthResponse);
    });

    it('should return AuthResponse on success', (done) => {
      service.register(mockRegisterRequest).subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
        expect(response.success).toBeTrue();
        expect(response.data.token).toBe('test-jwt-token');
        expect(response.data.user.email).toBe('test@example.com');
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      req.flush(mockAuthResponse);
    });

    it('should handle 400 validation error', (done) => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
        },
      };

      service.register(mockRegisterRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error).toEqual(errorResponse);
          done();
        },
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 409 email exists error', (done) => {
      const errorResponse = {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email already exists',
          details: {
            field: 'email',
            constraint: 'unique',
          },
        },
      };

      service.register(mockRegisterRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(409);
          expect(error.error.error.code).toBe('EMAIL_EXISTS');
          done();
        },
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      req.flush(errorResponse, { status: 409, statusText: 'Conflict' });
    });

    it('should handle 500 server error', (done) => {
      const errorResponse = {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      };

      service.register(mockRegisterRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        },
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      req.flush(errorResponse, {
        status: 500,
        statusText: 'Internal Server Error',
      });
    });

    it('should handle network error', (done) => {
      service.register(mockRegisterRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(0);
          done();
        },
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/api/v1/auth/register`
      );
      req.error(new ProgressEvent('Network error'));
    });
  });

  describe('login', () => {
    it('should send POST request to correct endpoint', () => {
      service.login('test@example.com', 'password123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockAuthResponse);
    });

    it('should send email and password in request body', () => {
      service.login('test@example.com', 'password123').subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });
      req.flush(mockAuthResponse);
    });

    it('should return AuthResponse on success', (done) => {
      service.login('test@example.com', 'password123').subscribe((response) => {
        expect(response).toEqual(mockAuthResponse);
        expect(response.success).toBeTrue();
        expect(response.data.token).toBe('test-jwt-token');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush(mockAuthResponse);
    });

    it('should handle 401 unauthorized error', (done) => {
      const errorResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid email or password',
        },
      };

      service.login('test@example.com', 'wrongpassword').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          expect(error.error.error.code).toBe('UNAUTHORIZED');
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/auth/login`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');
      spyOn(localStorage, 'removeItem');

      service.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should clear current user', () => {
      service.logout();
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      localStorage.setItem('auth_token', 'test-token');
      expect(service.getToken()).toBe('test-token');
      localStorage.removeItem('auth_token');
    });

    it('should return null if token does not exist', () => {
      localStorage.removeItem('auth_token');
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if valid token exists', () => {
      const validToken = createMockJWT({});
      localStorage.setItem('auth_token', validToken);
      expect(service.isAuthenticated()).toBeTrue();
      localStorage.removeItem('auth_token');
    });

    it('should return false if token does not exist', () => {
      localStorage.removeItem('auth_token');
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('should return false if token is expired', () => {
      const expiredToken = createMockJWT({ exp: Math.floor(Date.now() / 1000) - 3600 });
      localStorage.setItem('auth_token', expiredToken);
      expect(service.isAuthenticated()).toBeFalse();
      localStorage.removeItem('auth_token');
    });
  });

  describe('storeToken', () => {
    it('should store token in localStorage', () => {
      spyOn(localStorage, 'setItem');
      service.storeToken('new-token');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
    });
  });

  describe('setUser', () => {
    it('should update current user', () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        tenantId: 'tenant-123',
        roles: ['user'],
      };

      service.setUser(mockUser);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });
  });
});

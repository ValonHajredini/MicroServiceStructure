import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandler } from '@angular/common/http';
import { of } from 'rxjs';

import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => authInterceptor(req, next));

  let mockHttpHandler: jasmine.SpyObj<HttpHandler>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    mockHttpHandler = jasmine.createSpyObj('HttpHandler', ['handle']);
    mockHttpHandler.handle.and.returnValue(of({} as any));

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('should add Authorization header to non-auth requests when token exists', () => {
    localStorage.setItem('auth_token', 'test-token');

    const request = new HttpRequest('GET', '/api/v1/some-endpoint');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockHttpHandler.handle.bind(mockHttpHandler)).subscribe();
    });

    expect(mockHttpHandler.handle).toHaveBeenCalled();
    const modifiedRequest = mockHttpHandler.handle.calls.mostRecent().args[0];
    expect(modifiedRequest.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('should not add Authorization header when token does not exist', () => {
    const request = new HttpRequest('GET', '/api/v1/some-endpoint');

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockHttpHandler.handle.bind(mockHttpHandler)).subscribe();
    });

    expect(mockHttpHandler.handle).toHaveBeenCalled();
    const modifiedRequest = mockHttpHandler.handle.calls.mostRecent().args[0];
    expect(modifiedRequest.headers.has('Authorization')).toBeFalse();
  });

  it('should not add Authorization header to /auth/login endpoint', () => {
    localStorage.setItem('auth_token', 'test-token');

    const request = new HttpRequest('POST', 'http://localhost:3001/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockHttpHandler.handle.bind(mockHttpHandler)).subscribe();
    });

    expect(mockHttpHandler.handle).toHaveBeenCalled();
    const modifiedRequest = mockHttpHandler.handle.calls.mostRecent().args[0];
    expect(modifiedRequest.headers.has('Authorization')).toBeFalse();
  });

  it('should not add Authorization header to /auth/register endpoint', () => {
    localStorage.setItem('auth_token', 'test-token');

    const request = new HttpRequest('POST', 'http://localhost:3001/api/v1/auth/register', {
      email: 'test@example.com',
      password: 'password123'
    });

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockHttpHandler.handle.bind(mockHttpHandler)).subscribe();
    });

    expect(mockHttpHandler.handle).toHaveBeenCalled();
    const modifiedRequest = mockHttpHandler.handle.calls.mostRecent().args[0];
    expect(modifiedRequest.headers.has('Authorization')).toBeFalse();
  });

  it('should pass through request unchanged when targeting auth endpoint and no token', () => {
    const request = new HttpRequest('POST', 'http://localhost:3001/api/v1/auth/login', {});

    TestBed.runInInjectionContext(() => {
      authInterceptor(request, mockHttpHandler.handle.bind(mockHttpHandler)).subscribe();
    });

    expect(mockHttpHandler.handle).toHaveBeenCalled();
    const modifiedRequest = mockHttpHandler.handle.calls.mostRecent().args[0];
    expect(modifiedRequest).toBe(request);
  });
});

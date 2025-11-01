import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInRlbmFudElkIjoidGVuYW50LTEyMyIsInJvbGVzIjpbInVzZXIiXSwiZW5hYmxlZFNlcnZpY2VzIjpbIm5vdGVzIl0sImlhdCI6MTcwMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test';

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get and set token', () => {
    service.setToken(mockToken);
    expect(service.getToken()).toBe(mockToken);
  });

  it('should decode token', () => {
    service.setToken(mockToken);
    const payload = service.decodeToken();
    expect(payload).toBeTruthy();
    expect(payload?.sub).toBe('user-123');
    expect(payload?.email).toBe('test@test.com');
    expect(payload?.tenantId).toBe('tenant-123');
  });

  it('should get tenant ID', () => {
    service.setToken(mockToken);
    expect(service.getTenantId()).toBe('tenant-123');
  });

  it('should get user ID', () => {
    service.setToken(mockToken);
    expect(service.getUserId()).toBe('user-123');
  });

  it('should get user', () => {
    service.setToken(mockToken);
    const user = service.getUser();
    expect(user).toBeTruthy();
    expect(user?.id).toBe('user-123');
    expect(user?.email).toBe('test@test.com');
  });

  it('should check if authenticated', () => {
    service.setToken(mockToken);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should logout', () => {
    service.setToken(mockToken);
    service.logout();
    expect(service.getToken()).toBeNull();
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TeamService, TeamUser } from './team.service';
import { environment } from '../../../environments/environment';

describe('TeamService', () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TeamService],
    });
    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTeamMembers', () => {
    it('should fetch team members for a tenant', () => {
      const tenantId = 'tenant-001';
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'user-001',
            email: 'admin@tenant.com',
            firstName: 'Admin',
            lastName: 'User',
            tenantId: 'tenant-001',
            roles: ['admin'],
            status: 'active',
            role: 'admin',
            createdAt: '2025-10-01T10:00:00Z',
          },
        ] as TeamUser[],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      service.getTeamMembers(tenantId).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data.length).toBe(1);
        expect(response.data[0].email).toBe('admin@tenant.com');
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/tenants/${tenantId}/users?page=1&limit=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should apply filters when provided', () => {
      const tenantId = 'tenant-001';
      const role = 'admin';
      const status = 'active';

      service.getTeamMembers(tenantId, 1, 20, role, status).subscribe();

      const req = httpMock.expectOne(
        `${apiUrl}/api/v1/tenants/${tenantId}/users?page=1&limit=20&role=admin&status=active`
      );
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    });
  });

  describe('changeUserRole', () => {
    it('should change user role', () => {
      const userId = 'user-001';
      const newRole = 'admin';
      const mockResponse = {
        success: true,
        data: {
          id: userId,
          email: 'user@tenant.com',
          firstName: 'Test',
          lastName: 'User',
          role: newRole,
          tenantId: 'tenant-001',
          roles: [newRole],
          status: 'active',
          createdAt: '2025-10-01T10:00:00Z',
        } as TeamUser,
      };

      service.changeUserRole(userId, newRole).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data.role).toBe(newRole);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/users/${userId}/role`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ role: newRole });
      req.flush(mockResponse);
    });
  });

  describe('removeUser', () => {
    it('should remove user from tenant', () => {
      const tenantId = 'tenant-001';
      const userId = 'user-001';
      const mockResponse = {
        success: true,
        data: {
          message: 'User removed from organization',
          userId: userId,
        },
      };

      service.removeUser(tenantId, userId).subscribe((response) => {
        expect(response.success).toBe(true);
        expect(response.data.userId).toBe(userId);
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/tenants/${tenantId}/users/${userId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { TeamManagement } from './team-management';
import { TeamService } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import { JoinRequestsService } from '../../../core/services/join-requests.service';

describe('TeamManagement', () => {
  let component: TeamManagement;
  let fixture: ComponentFixture<TeamManagement>;
  let teamService: jasmine.SpyObj<TeamService>;
  let authService: jasmine.SpyObj<AuthService>;
  let joinRequestsService: jasmine.SpyObj<JoinRequestsService>;
  let router: jasmine.SpyObj<Router>;

  const mockUser = {
    id: 'user-001',
    email: 'admin@tenant.com',
    firstName: 'Admin',
    lastName: 'User',
    tenantId: 'tenant-001',
    roles: ['admin'],
  };

  const mockTeamUsers = [
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
    {
      id: 'user-002',
      email: 'user@tenant.com',
      firstName: 'Test',
      lastName: 'User',
      tenantId: 'tenant-001',
      roles: ['user'],
      status: 'active',
      role: 'user',
      createdAt: '2025-10-15T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    const teamServiceSpy = jasmine.createSpyObj('TeamService', [
      'getTeamMembers',
      'changeUserRole',
      'removeUser',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUserFromToken',
      'getUserTenantId',
    ]);
    const joinRequestsServiceSpy = jasmine.createSpyObj('JoinRequestsService', [
      'getJoinRequests',
      'updateJoinRequest',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [TeamManagement, HttpClientTestingModule],
      providers: [
        { provide: TeamService, useValue: teamServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: JoinRequestsService, useValue: joinRequestsServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    teamService = TestBed.inject(TeamService) as jasmine.SpyObj<TeamService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    joinRequestsService = TestBed.inject(
      JoinRequestsService
    ) as jasmine.SpyObj<JoinRequestsService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Default mocks
    authService.getUserFromToken.and.returnValue(mockUser);
    authService.getUserTenantId.and.returnValue('tenant-001');
    teamService.getTeamMembers.and.returnValue(
      of({
        success: true,
        data: mockTeamUsers,
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      })
    );
    joinRequestsService.getJoinRequests.and.returnValue(
      of({
        success: true,
        data: [],
        meta: { page: 1, limit: 20, total: 0 },
      })
    );

    fixture = TestBed.createComponent(TeamManagement);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load users on init', () => {
      fixture.detectChanges();
      expect(teamService.getTeamMembers).toHaveBeenCalledWith('tenant-001');
      expect(component.users().length).toBe(2);
    });

    it('should set admin flag when user is admin', () => {
      fixture.detectChanges();
      expect(component.isAdmin).toBe(true);
    });

    it('should not load join requests if user is not admin', () => {
      authService.getUserFromToken.and.returnValue({
        ...mockUser,
        roles: ['user'],
      });
      fixture.detectChanges();
      expect(component.isAdmin).toBe(false);
      expect(joinRequestsService.getJoinRequests).not.toHaveBeenCalled();
    });

    it('should redirect to login if no user', () => {
      authService.getUserFromToken.and.returnValue(null);
      fixture.detectChanges();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Role Management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open change role dialog', () => {
      const user = mockTeamUsers[1];
      component.openChangeRoleDialog(user);
      expect(component.showChangeRoleModal()).toBe(true);
      expect(component.selectedUser()).toEqual(user);
    });

    it('should change user role successfully', () => {
      const user = mockTeamUsers[1];
      teamService.changeUserRole.and.returnValue(
        of({
          success: true,
          data: { ...user, role: 'admin' },
        })
      );

      component.openChangeRoleDialog(user);
      component.selectedRole.setValue('admin');
      component.submitChangeRole();

      expect(teamService.changeUserRole).toHaveBeenCalledWith(user.id, 'admin');
    });

    it('should handle role change errors', () => {
      const user = mockTeamUsers[1];
      spyOn(window, 'alert');
      teamService.changeUserRole.and.returnValue(
        throwError(() => ({
          error: { error: { message: 'Cannot change own role' } },
        }))
      );

      component.openChangeRoleDialog(user);
      component.submitChangeRole();

      expect(window.alert).toHaveBeenCalledWith('Cannot change own role');
      expect(component.isProcessing()).toBe(false);
    });
  });

  describe('User Removal', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should open remove user dialog', () => {
      const user = mockTeamUsers[1];
      component.openRemoveDialog(user);
      expect(component.showRemoveUserModal()).toBe(true);
      expect(component.selectedUser()).toEqual(user);
    });

    it('should remove user successfully', () => {
      const user = mockTeamUsers[1];
      teamService.removeUser.and.returnValue(
        of({
          success: true,
          data: { message: 'User removed', userId: user.id },
        })
      );

      component.openRemoveDialog(user);
      component.submitRemoveUser();

      expect(teamService.removeUser).toHaveBeenCalledWith('tenant-001', user.id);
    });

    it('should handle remove errors', () => {
      const user = mockTeamUsers[1];
      spyOn(window, 'alert');
      teamService.removeUser.and.returnValue(
        throwError(() => ({
          error: { error: { message: 'Cannot remove yourself' } },
        }))
      );

      component.openRemoveDialog(user);
      component.submitRemoveUser();

      expect(window.alert).toHaveBeenCalledWith('Cannot remove yourself');
      expect(component.isProcessing()).toBe(false);
    });
  });

  describe('Access Control', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should identify current user correctly', () => {
      expect(component.isCurrentUser('user-001')).toBe(true);
      expect(component.isCurrentUser('user-002')).toBe(false);
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should switch tabs', () => {
      expect(component.selectedTab()).toBe(0);
      component.selectTab(1);
      expect(component.selectedTab()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle load errors', () => {
      teamService.getTeamMembers.and.returnValue(
        throwError(() => ({
          error: { error: { message: 'Failed to load users' } },
        }))
      );

      fixture.detectChanges();

      expect(component.error()).toBe('Failed to load users');
      expect(component.isLoading()).toBe(false);
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ServiceManagementComponent } from './service-management.component';
import { TenantsService } from '../../../core/services/tenants.service';
import { AuthService } from '../../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('ServiceManagementComponent', () => {
  let component: ServiceManagementComponent;
  let fixture: ComponentFixture<ServiceManagementComponent>;
  let tenantsService: jasmine.SpyObj<TenantsService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const tenantsServiceSpy = jasmine.createSpyObj('TenantsService', [
      'getTenant',
      'updateServices',
    ]);
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getUserTenantId',
      'logout',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        ServiceManagementComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: TenantsService, useValue: tenantsServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    tenantsService = TestBed.inject(
      TenantsService
    ) as jasmine.SpyObj<TenantsService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    fixture = TestBed.createComponent(ServiceManagementComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load tenant services on init', () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'tenant-1',
        name: 'Test Tenant',
        enabledServices: ['notes', 'kanban'],
      },
      meta: { timestamp: new Date().toISOString() },
    };

    authService.getUserTenantId.and.returnValue('tenant-1');
    tenantsService.getTenant.and.returnValue(of(mockResponse));

    component.ngOnInit();

    expect(authService.getUserTenantId).toHaveBeenCalled();
    expect(tenantsService.getTenant).toHaveBeenCalledWith('tenant-1');
    expect(component.selectedServices()).toEqual(['notes', 'kanban']);
    expect(component.loading()).toBe(false);
  });

  it('should handle error when loading services', () => {
    authService.getUserTenantId.and.returnValue('tenant-1');
    tenantsService.getTenant.and.returnValue(
      throwError(() => new Error('Network error'))
    );

    component.ngOnInit();

    expect(component.errorMessage()).toBe(
      'Unable to load services. Please try again later.'
    );
    expect(component.loading()).toBe(false);
  });

  it('should toggle service selection', () => {
    component.selectedServices.set(['notes']);

    component.toggleService('kanban');
    expect(component.selectedServices()).toEqual(['notes', 'kanban']);

    component.toggleService('notes');
    expect(component.selectedServices()).toEqual(['kanban']);
  });

  it('should save service changes successfully', () => {
    const mockResponse = {
      success: true,
      data: {
        id: 'tenant-1',
        name: 'Test Tenant',
        enabledServices: ['notes'],
      },
      meta: { timestamp: new Date().toISOString() },
    };

    component.tenantId = 'tenant-1';
    component.selectedServices.set(['notes']);
    tenantsService.updateServices.and.returnValue(of(mockResponse));

    component.saveChanges();

    expect(tenantsService.updateServices).toHaveBeenCalledWith('tenant-1', [
      'notes',
    ]);
    expect(component.successMessage()).toContain('Services updated successfully');
    expect(component.saving()).toBe(false);
  });

  it('should handle error when saving services', () => {
    component.tenantId = 'tenant-1';
    component.selectedServices.set(['notes']);
    tenantsService.updateServices.and.returnValue(
      throwError(() => ({
        error: { error: { message: 'Invalid service' } },
      }))
    );

    component.saveChanges();

    expect(component.errorMessage()).toBe('Invalid service');
    expect(component.saving()).toBe(false);
  });
});

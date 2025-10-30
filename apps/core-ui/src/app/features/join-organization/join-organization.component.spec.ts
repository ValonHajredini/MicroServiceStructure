import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { JoinOrganizationComponent } from './join-organization.component';
import { TenantsService } from '../../core/services/tenants.service';
import { JoinRequestsService } from '../../core/services/join-requests.service';

describe('JoinOrganizationComponent', () => {
  let component: JoinOrganizationComponent;
  let fixture: ComponentFixture<JoinOrganizationComponent>;
  let tenantsService: jasmine.SpyObj<TenantsService>;
  let joinRequestsService: jasmine.SpyObj<JoinRequestsService>;

  beforeEach(async () => {
    const tenantsServiceSpy = jasmine.createSpyObj('TenantsService', [
      'searchTenants',
    ]);
    const joinRequestsServiceSpy = jasmine.createSpyObj(
      'JoinRequestsService',
      ['createJoinRequest']
    );

    await TestBed.configureTestingModule({
      imports: [
        JoinOrganizationComponent,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: TenantsService, useValue: tenantsServiceSpy },
        { provide: JoinRequestsService, useValue: joinRequestsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinOrganizationComponent);
    component = fixture.componentInstance;
    tenantsService = TestBed.inject(
      TenantsService
    ) as jasmine.SpyObj<TenantsService>;
    joinRequestsService = TestBed.inject(
      JoinRequestsService
    ) as jasmine.SpyObj<JoinRequestsService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should search tenants with debounce', (done) => {
    const mockResponse = {
      success: true,
      data: [
        { id: '1', name: 'Acme Corp' },
        { id: '2', name: 'Acme Industries' },
      ],
      meta: { count: 2, limit: 20 },
    };

    tenantsService.searchTenants.and.returnValue(of(mockResponse));

    component.ngOnInit();
    component.searchControl.setValue('acme');

    setTimeout(() => {
      expect(component.searchResults().length).toBe(2);
      expect(component.searchResults()[0].name).toBe('Acme Corp');
      done();
    }, 600);
  });

  it('should not search with query less than 2 characters', (done) => {
    component.ngOnInit();
    component.searchControl.setValue('a');

    setTimeout(() => {
      expect(tenantsService.searchTenants).not.toHaveBeenCalled();
      expect(component.searchResults().length).toBe(0);
      done();
    }, 600);
  });

  it('should handle search errors', (done) => {
    tenantsService.searchTenants.and.returnValue(
      throwError(() => ({ error: { message: 'Search failed' } }))
    );

    component.ngOnInit();
    component.searchControl.setValue('test');

    setTimeout(() => {
      expect(component.searchError()).toBe('Search failed');
      done();
    }, 600);
  });

  it('should open confirmation modal', () => {
    const mockTenant = { id: '1', name: 'Test Corp' };
    component.openConfirmModal(mockTenant);

    expect(component.showConfirmModal()).toBe(true);
    expect(component.selectedTenant()).toEqual(mockTenant);
  });

  it('should submit join request successfully', (done) => {
    const mockTenant = { id: '1', name: 'Test Corp' };
    const mockResponse = {
      success: true,
      data: {
        id: 'request-1',
        tenantId: '1',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };

    component.selectedTenant.set(mockTenant);
    joinRequestsService.createJoinRequest.and.returnValue(of(mockResponse));

    component.submitJoinRequest();

    setTimeout(() => {
      expect(component.submitSuccess()).toBe(true);
      done();
    }, 100);
  });

  it('should handle join request errors', (done) => {
    const mockTenant = { id: '1', name: 'Test Corp' };
    component.selectedTenant.set(mockTenant);

    joinRequestsService.createJoinRequest.and.returnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Already a member' },
      }))
    );

    component.submitJoinRequest();

    setTimeout(() => {
      expect(component.submitError()).toContain('already a member');
      done();
    }, 100);
  });
});

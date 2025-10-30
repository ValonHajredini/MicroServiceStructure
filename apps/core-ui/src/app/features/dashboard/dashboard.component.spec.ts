import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/services/auth.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [
      'getEnabledServices',
    ]);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load enabled services on init', () => {
    authService.getEnabledServices.and.returnValue(['notes', 'kanban']);

    component.ngOnInit();

    expect(authService.getEnabledServices).toHaveBeenCalled();
    expect(component.enabledServices()).toEqual(['notes', 'kanban']);
  });

  it('should correctly identify enabled services', () => {
    component.enabledServices.set(['notes', 'kanban']);

    expect(component.enabledServices()).toEqual(['notes', 'kanban']);
    expect(component.enabledServices().includes('notes')).toBe(true);
    expect(component.enabledServices().includes('kanban')).toBe(true);
    expect(component.enabledServices().includes('forms')).toBe(false);
  });

  it('should display all service cards', () => {
    authService.getEnabledServices.and.returnValue(['notes']);
    component.ngOnInit();
    fixture.detectChanges();

    const services = component.services();
    expect(services.length).toBe(3);
    expect(services[0].name).toBe('notes');
    expect(services[0].isAvailable).toBe(true);
    expect(services[1].name).toBe('kanban');
    expect(services[1].isAvailable).toBe(false);
    expect(services[2].name).toBe('forms');
    expect(services[2].isAvailable).toBe(false);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServiceCard, ServiceViewModel } from './service-card';

describe('ServiceCard', () => {
  let component: ServiceCard;
  let fixture: ComponentFixture<ServiceCard>;
  let mockService: ServiceViewModel;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceCard);
    component = fixture.componentInstance;

    mockService = {
      name: 'notes',
      label: 'Notes Service',
      description: 'Test description',
      icon: 'pi pi-file-edit',
      route: '/notes',
      isAvailable: true,
      status: 'Available',
    };

    component.service = mockService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display service name and description', () => {
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Notes Service');
    expect(compiled.textContent).toContain('Test description');
  });

  it('should emit open event when Open button is clicked for available service', () => {
    spyOn(component.open, 'emit');
    component.onOpen();
    expect(component.open.emit).toHaveBeenCalledWith(mockService);
  });

  it('should emit requestAccess event when Request Access button is clicked', () => {
    spyOn(component.requestAccess, 'emit');
    component.onRequestAccess();
    expect(component.requestAccess.emit).toHaveBeenCalledWith(mockService);
  });

  it('should display Available status badge for enabled service', () => {
    const compiled = fixture.nativeElement;
    const statusBadge = compiled.querySelector('.status-badge.available');
    expect(statusBadge).toBeTruthy();
    expect(statusBadge.textContent.trim()).toBe('Available');
  });

  it('should display Locked status badge for disabled service', () => {
    component.service = {
      ...mockService,
      isAvailable: false,
      status: 'Locked',
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const statusBadge = compiled.querySelector('.status-badge.locked');
    expect(statusBadge).toBeTruthy();
    expect(statusBadge.textContent.trim()).toBe('Locked');
  });

  it('should apply enabled class for available services', () => {
    const compiled = fixture.nativeElement;
    const card = compiled.querySelector('.service-card.enabled');
    expect(card).toBeTruthy();
  });

  it('should apply disabled class for unavailable services', () => {
    component.service = {
      ...mockService,
      isAvailable: false,
      status: 'Locked',
    };
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    const card = compiled.querySelector('.service-card.disabled');
    expect(card).toBeTruthy();
  });
});

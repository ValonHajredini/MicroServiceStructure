import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { FolderDialogComponent } from './folder-dialog';

describe('FolderDialogComponent', () => {
  let component: FolderDialogComponent;
  let fixture: ComponentFixture<FolderDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FolderDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have create mode by default', () => {
    expect(component.mode()).toBe('create');
  });

  it('should show correct header for create mode', () => {
    expect(component.getDialogHeader()).toBe('New Folder');
  });

  it('should show correct header for rename mode', () => {
    fixture.componentRef.setInput('mode', 'rename');
    fixture.detectChanges();
    expect(component.getDialogHeader()).toBe('Rename Folder');
  });
});

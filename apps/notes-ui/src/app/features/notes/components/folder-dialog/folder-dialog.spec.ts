import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { FolderDialog } from './folder-dialog';

describe('FolderDialog', () => {
  let component: FolderDialog;
  let fixture: ComponentFixture<FolderDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FolderDialog);
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

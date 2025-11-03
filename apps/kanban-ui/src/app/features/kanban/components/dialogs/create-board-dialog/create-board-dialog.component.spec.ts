import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { of, throwError } from 'rxjs';
import { CreateBoardDialogComponent } from './create-board-dialog.component';
import { BoardService } from '../../../services/board.service';
import { ToastService } from '@microservice/ui-common';
import { Board } from '../../../models/board.model';

describe('CreateBoardDialogComponent', () => {
  let component: CreateBoardDialogComponent;
  let fixture: ComponentFixture<CreateBoardDialogComponent>;
  let mockBoardService: jasmine.SpyObj<BoardService>;
  let mockDialogRef: jasmine.SpyObj<DynamicDialogRef>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  const mockBoard: Board = {
    id: 'board-new',
    name: 'New Board',
    description: 'New Description',
    tenant_id: 'tenant-1',
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z'
  };

  beforeEach(async () => {
    mockBoardService = jasmine.createSpyObj('BoardService', ['createBoard']);
    mockDialogRef = jasmine.createSpyObj('DynamicDialogRef', ['close']);
    mockToastService = jasmine.createSpyObj('ToastService', ['error']);

    await TestBed.configureTestingModule({
      imports: [CreateBoardDialogComponent, ReactiveFormsModule],
      providers: [
        { provide: BoardService, useValue: mockBoardService },
        { provide: DynamicDialogRef, useValue: mockDialogRef },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateBoardDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize form with empty values', () => {
      expect(component.form.get('name')?.value).toBe('');
      expect(component.form.get('description')?.value).toBe('');
    });

    it('should have name field as required', () => {
      const nameControl = component.form.get('name');
      expect(nameControl?.hasError('required')).toBe(true);
    });

    it('should validate name max length (255)', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('a'.repeat(256));
      expect(nameControl?.hasError('maxlength')).toBe(true);
    });

    it('should validate description max length (1000)', () => {
      const descControl = component.form.get('description');
      descControl?.setValue('a'.repeat(1001));
      expect(descControl?.hasError('maxlength')).toBe(true);
    });

    it('should accept valid name within max length', () => {
      const nameControl = component.form.get('name');
      nameControl?.setValue('Valid Board Name');
      expect(nameControl?.valid).toBe(true);
    });

    it('should allow description to be optional', () => {
      const descControl = component.form.get('description');
      descControl?.setValue('');
      expect(descControl?.valid).toBe(true);
    });
  });

  describe('submit', () => {
    it('should not submit when form is invalid', () => {
      component.form.get('name')?.setValue('');

      component.submit();

      expect(mockBoardService.createBoard).not.toHaveBeenCalled();
      expect(component.form.touched).toBe(true);
    });

    it('should create board when form is valid', (done) => {
      mockBoardService.createBoard.and.returnValue(of(mockBoard));
      component.form.get('name')?.setValue('New Board');
      component.form.get('description')?.setValue('New Description');

      component.submit();

      expect(component.submitting).toBe(true);

      setTimeout(() => {
        expect(mockBoardService.createBoard).toHaveBeenCalledWith({
          name: 'New Board',
          description: 'New Description'
        });
        expect(mockDialogRef.close).toHaveBeenCalledWith(mockBoard);
        done();
      }, 0);
    });

    it('should create board without description', (done) => {
      mockBoardService.createBoard.and.returnValue(of(mockBoard));
      component.form.get('name')?.setValue('New Board');

      component.submit();

      setTimeout(() => {
        expect(mockBoardService.createBoard).toHaveBeenCalledWith({
          name: 'New Board',
          description: ''
        });
        done();
      }, 0);
    });

    it('should handle error and show toast message', (done) => {
      const error = new Error('Creation failed');
      mockBoardService.createBoard.and.returnValue(throwError(() => error));
      component.form.get('name')?.setValue('New Board');

      component.submit();

      setTimeout(() => {
        expect(mockToastService.error).toHaveBeenCalledWith({
          summary: 'Creation Failed',
          detail: 'Unable to create board. Please try again.'
        });
        expect(component.submitting).toBe(false);
        expect(mockDialogRef.close).not.toHaveBeenCalled();
        done();
      }, 0);
    });

    it('should handle validation error from API', (done) => {
      const error = { status: 400, error: { error: { message: 'Validation error' } } };
      mockBoardService.createBoard.and.returnValue(throwError(() => error));
      component.form.get('name')?.setValue('Valid Board Name');

      component.submit();

      setTimeout(() => {
        expect(mockToastService.error).toHaveBeenCalled();
        expect(component.submitting).toBe(false);
        done();
      }, 0);
    });

    it('should set submitting flag during submission', () => {
      mockBoardService.createBoard.and.returnValue(of(mockBoard));
      component.form.get('name')?.setValue('New Board');

      expect(component.submitting).toBe(false);

      component.submit();

      expect(component.submitting).toBe(true);
    });
  });

  describe('cancel', () => {
    it('should close dialog without data', () => {
      component.cancel();

      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });

    it('should not submit form when cancelled', () => {
      component.form.get('name')?.setValue('New Board');

      component.cancel();

      expect(mockBoardService.createBoard).not.toHaveBeenCalled();
    });
  });

  describe('template integration', () => {
    it('should display form fields', () => {
      const nameInput = fixture.nativeElement.querySelector('input[formControlName="name"]');
      const descTextarea = fixture.nativeElement.querySelector('textarea[formControlName="description"]');

      expect(nameInput).toBeTruthy();
      expect(descTextarea).toBeTruthy();
    });

    it('should display submit and cancel buttons', () => {
      const buttons = fixture.nativeElement.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should not call submit when form is invalid', () => {
      component.form.get('name')?.setValue('');
      component.form.markAllAsTouched();

      component.submit();

      expect(mockBoardService.createBoard).not.toHaveBeenCalled();
    });

    it('should enable submit button when form is valid', () => {
      component.form.get('name')?.setValue('Valid Name');
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(false);
    });

    it('should show loading state on submit button during submission', () => {
      mockBoardService.createBoard.and.returnValue(of(mockBoard));
      component.form.get('name')?.setValue('New Board');
      component.submitting = true;
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton?.disabled).toBe(true);
    });
  });
});

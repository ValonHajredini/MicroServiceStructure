import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { FileUploadComponent } from './file-upload';
import { FileUploadService } from '../../services/file-upload.service';
import { of, throwError } from 'rxjs';

describe('FileUploadComponent', () => {
  let component: FileUploadComponent;
  let fixture: ComponentFixture<FileUploadComponent>;
  let fileUploadService: FileUploadService;
  let messageService: MessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        FileUploadService
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fileUploadService = TestBed.inject(FileUploadService);
    messageService = TestBed.inject(MessageService);

    fixture.componentRef.setInput('noteId', 'note-123');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open file picker when button clicked', () => {
    const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
    spyOn(fileInput, 'click');

    component.openFilePicker();

    expect(fileInput.click).toHaveBeenCalled();
  });

  it('should process files when selected', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    spyOn(component, 'processFiles');

    const event = {
      target: {
        files: [file],
        value: 'test.pdf'
      }
    } as any;

    component.onFileSelected(event);

    expect(component.processFiles).toHaveBeenCalledWith([file]);
    expect(event.target.value).toBe('');
  });

  it('should highlight drop zone on drag over', () => {
    const event = new DragEvent('dragover', {
      dataTransfer: new DataTransfer()
    });
    Object.defineProperty(event.dataTransfer, 'types', {
      value: ['Files']
    });
    spyOn(event, 'preventDefault');

    component.onDragOver(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragOver()).toBe(true);
  });

  it('should remove highlight on drag leave', () => {
    component.isDragOver.set(true);
    const event = new DragEvent('dragleave');
    spyOn(event, 'preventDefault');

    component.onDragLeave(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragOver()).toBe(false);
  });

  it('should process dropped files', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new DragEvent('drop', { dataTransfer });
    spyOn(event, 'preventDefault');
    spyOn(component, 'processFiles');

    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(component.isDragOver()).toBe(false);
    expect(component.processFiles).toHaveBeenCalled();
  });

  it('should validate files before upload', () => {
    const validFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    spyOn(fileUploadService, 'validateFile').and.returnValue({ valid: true });
    spyOn(component, 'uploadNext');

    component.processFiles([validFile]);

    expect(fileUploadService.validateFile).toHaveBeenCalled();
    expect(component.uploadQueue().length).toBe(1);
    expect(component.uploadNext).toHaveBeenCalled();
  });

  it('should show error for invalid files', () => {
    const invalidFile = new File(['test'], 'large.pdf', { type: 'application/pdf' });
    spyOn(fileUploadService, 'validateFile').and.returnValue({
      valid: false,
      error: 'File too large'
    });
    spyOn(messageService, 'add');

    component.processFiles([invalidFile]);

    expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
      severity: 'error',
      summary: 'File Validation Failed'
    }));
    expect(component.uploadQueue().length).toBe(0);
  });

  it('should upload file when queue is processed', (done) => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const mockProgress = {
      phase: 'complete' as const,
      progress: 100,
      attachment: {
        id: 'att-123',
        note_id: 'note-123',
        file_id: 'file-123',
        filename: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
        storage_url: 'https://example.com/test.pdf',
        created_at: new Date()
      }
    };

    spyOn(fileUploadService, 'uploadFile').and.returnValue(of(mockProgress));
    spyOn(messageService, 'add');
    spyOn(component.fileUploaded, 'emit');

    component.uploadQueue.set([{
      file,
      progress: 0,
      phase: 'queued',
      retryCount: 0
    }]);

    component.uploadNext();

    setTimeout(() => {
      expect(fileUploadService.uploadFile).toHaveBeenCalled();
      expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        severity: 'success',
        summary: 'Upload Complete'
      }));
      expect(component.fileUploaded.emit).toHaveBeenCalledWith(mockProgress.attachment);
      done();
    }, 100);
  });

  it('should handle upload error and retry', (done) => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const error = new Error('Upload failed');

    spyOn(fileUploadService, 'uploadFile').and.returnValue(throwError(() => error));
    spyOn(messageService, 'add');

    component.uploadQueue.set([{
      file,
      progress: 0,
      phase: 'queued',
      retryCount: 0
    }]);

    component.uploadNext();

    setTimeout(() => {
      const uploadState = component.uploadQueue()[0];
      // After 3 retries, it should fail
      expect(uploadState.retryCount).toBe(3);
      expect(uploadState.phase).toBe('failed');
      done();
    }, 100);
  });

  it('should not retry after max attempts', (done) => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const error = new Error('Upload failed');

    spyOn(fileUploadService, 'uploadFile').and.returnValue(throwError(() => error));
    spyOn(messageService, 'add');

    component.uploadQueue.set([{
      file,
      progress: 0,
      phase: 'queued',
      retryCount: component.MAX_RETRY_ATTEMPTS
    }]);

    component.uploadNext();

    setTimeout(() => {
      const uploadState = component.uploadQueue()[0];
      expect(uploadState.phase).toBe('failed');
      expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({
        severity: 'error',
        summary: 'Upload Failed'
      }));
      done();
    }, 100);
  });

  it('should cancel upload', () => {
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    component.uploadQueue.set([{
      file,
      progress: 50,
      phase: 'uploading',
      retryCount: 0
    }]);

    component.cancelUpload(component.uploadQueue()[0]);

    expect(component.uploadQueue().length).toBe(0);
    expect(component.isUploading()).toBe(false);
  });

  it('should get correct icon for upload state', () => {
    const states = [
      { phase: 'Complete', expected: 'pi pi-check-circle' },
      { phase: 'failed', expected: 'pi pi-times-circle' },
      { phase: 'Error', expected: 'pi pi-times-circle' },
      { phase: 'queued', expected: 'pi pi-clock' },
      { phase: 'uploading', expected: 'pi pi-spin pi-spinner' }
    ];

    states.forEach(({ phase, expected }) => {
      const state = { file: new File([''], 'test.txt'), progress: 0, phase, retryCount: 0 };
      expect(component.getStateIcon(state)).toBe(expected);
    });
  });

  it('should get correct icon class for upload state', () => {
    const states = [
      { phase: 'Complete', expected: 'text-green-500' },
      { phase: 'failed', expected: 'text-red-500' },
      { phase: 'Error', expected: 'text-red-500' },
      { phase: 'queued', expected: 'text-gray-500' },
      { phase: 'uploading', expected: 'text-blue-500' }
    ];

    states.forEach(({ phase, expected }) => {
      const state = { file: new File([''], 'test.txt'), progress: 0, phase, retryCount: 0 };
      expect(component.getStateIconClass(state)).toBe(expected);
    });
  });

  it('should not open file picker when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const fileInput = fixture.nativeElement.querySelector('input[type="file"]');
    spyOn(fileInput, 'click');

    component.openFilePicker();

    expect(fileInput.click).not.toHaveBeenCalled();
  });

  it('should not process dropped files when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new DragEvent('drop', { dataTransfer });
    spyOn(component, 'processFiles');

    component.onDrop(event);

    expect(component.processFiles).not.toHaveBeenCalled();
  });
});

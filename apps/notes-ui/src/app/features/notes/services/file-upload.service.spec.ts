import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FileUploadService, PresignedUrlResponse, UploadProgress } from './file-upload.service';
import { Attachment } from '../models/attachment.model';
import { environment } from '../../../../environments/environment';

describe('FileUploadService', () => {
  let service: FileUploadService;
  let httpMock: HttpTestingController;

  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
  const mockPresignedResponse: PresignedUrlResponse = {
    presigned_url: 'https://spaces.digitalocean.com/bucket/test.pdf?signature=abc',
    file_id: 'file-123',
    storage_key: 'tenants/test/files/test.pdf'
  };
  const mockAttachment: Attachment = {
    id: 'att-123',
    note_id: 'note-123',
    file_id: 'file-123',
    filename: 'test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    storage_url: 'https://spaces.digitalocean.com/bucket/test.pdf',
    created_at: new Date()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FileUploadService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(FileUploadService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateFile', () => {
    it('should accept files under 25MB', () => {
      const smallFile = new File(['test'], 'small.txt', { type: 'text/plain' });
      const result = service.validateFile(smallFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files over 25MB', () => {
      const largeSize = 26 * 1024 * 1024; // 26MB
      const largeFile = new File([new ArrayBuffer(largeSize)], 'large.pdf', { type: 'application/pdf' });
      Object.defineProperty(largeFile, 'size', { value: largeSize });

      const result = service.validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds 25MB limit');
    });

    it('should reject if total size would exceed 100MB', () => {
      const currentTotal = 95 * 1024 * 1024; // 95MB
      const newFileSize = 10 * 1024 * 1024; // 10MB
      const file = new File([new ArrayBuffer(newFileSize)], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: newFileSize });

      const result = service.validateFile(file, currentTotal);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceed 100MB limit');
    });

    it('should accept if total size is under 100MB', () => {
      const currentTotal = 50 * 1024 * 1024; // 50MB
      const newFileSize = 10 * 1024 * 1024; // 10MB
      const file = new File([new ArrayBuffer(newFileSize)], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: newFileSize });

      const result = service.validateFile(file, currentTotal);
      expect(result.valid).toBe(true);
    });
  });

  describe('getPresignedUrl', () => {
    it('should call Core Service with correct parameters', () => {
      service.getPresignedUrl('test.pdf', 'application/pdf', 1024).subscribe();

      const req = httpMock.expectOne(`${environment.coreApiUrl}/api/v1/files/presigned-url`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        filename: 'test.pdf',
        mime_type: 'application/pdf',
        file_size: 1024
      });

      req.flush({ success: true, data: mockPresignedResponse });
    });

    it('should return presigned URL data', (done) => {
      service.getPresignedUrl('test.pdf', 'application/pdf', 1024).subscribe(response => {
        expect(response).toEqual(mockPresignedResponse);
        done();
      });

      const req = httpMock.expectOne(`${environment.coreApiUrl}/api/v1/files/presigned-url`);
      req.flush({ success: true, data: mockPresignedResponse });
    });

    it('should handle errors', (done) => {
      service.getPresignedUrl('test.pdf', 'application/pdf', 1024).subscribe({
        error: (error) => {
          expect(error.message).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.coreApiUrl}/api/v1/files/presigned-url`);
      req.flush({ message: 'Failed to generate URL' }, { status: 500, statusText: 'Server Error' });
    });
  });

  describe('uploadToSpaces', () => {
    it('should make PUT request to presigned URL', () => {
      service.uploadToSpaces(mockFile, mockPresignedResponse.presigned_url).subscribe();

      const req = httpMock.expectOne(mockPresignedResponse.presigned_url);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Content-Type')).toBe('application/pdf');
      expect(req.request.body).toBe(mockFile);

      req.flush({}, { status: 200, statusText: 'OK' });
    });

    it('should track upload progress', (done) => {
      const progressValues: number[] = [];

      service.uploadToSpaces(mockFile, mockPresignedResponse.presigned_url).subscribe({
        next: (progress) => {
          progressValues.push(progress);
        },
        complete: () => {
          expect(progressValues.length).toBeGreaterThan(0);
          expect(progressValues[progressValues.length - 1]).toBe(100);
          done();
        }
      });

      const req = httpMock.expectOne(mockPresignedResponse.presigned_url);
      req.flush({}, { status: 200, statusText: 'OK' });
    });
  });

  describe('attachFileToNote', () => {
    it('should call Notes Service to attach file', () => {
      const noteId = 'note-123';
      const fileId = 'file-123';

      service.attachFileToNote(noteId, fileId).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/notes/${noteId}/attachments`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ file_id: fileId });

      req.flush({ success: true, data: mockAttachment });
    });

    it('should return attachment data', (done) => {
      const noteId = 'note-123';
      const fileId = 'file-123';

      service.attachFileToNote(noteId, fileId).subscribe(response => {
        expect(response).toEqual(mockAttachment);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/notes/${noteId}/attachments`);
      req.flush({ success: true, data: mockAttachment });
    });

    it('should handle 404 error', (done) => {
      const noteId = 'note-123';
      const fileId = 'file-123';

      service.attachFileToNote(noteId, fileId).subscribe({
        error: (error) => {
          expect(error.message).toBeTruthy();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/notes/${noteId}/attachments`);
      req.flush({ message: 'Note not found' }, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('calculateTotalSize', () => {
    it('should calculate total size of attachments', () => {
      const attachments: Attachment[] = [
        { ...mockAttachment, file_size: 1024 },
        { ...mockAttachment, file_size: 2048 },
        { ...mockAttachment, file_size: 3072 }
      ];

      const total = service.calculateTotalSize(attachments);
      expect(total).toBe(6144);
    });

    it('should return 0 for empty attachments array', () => {
      const total = service.calculateTotalSize([]);
      expect(total).toBe(0);
    });

    it('should handle undefined file_size', () => {
      const attachments: Attachment[] = [
        { ...mockAttachment, file_size: 1024 },
        { ...mockAttachment, file_size: undefined as any }
      ];

      const total = service.calculateTotalSize(attachments);
      expect(total).toBe(1024);
    });
  });
});

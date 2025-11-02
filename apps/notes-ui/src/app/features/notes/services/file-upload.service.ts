import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, tap, filter, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Attachment } from '../models/attachment.model';

export interface PresignedUrlResponse {
  presigned_url: string;
  file_id: string;
  storage_key: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface UploadProgress {
  phase: 'validating' | 'getting_url' | 'uploading' | 'attaching' | 'complete' | 'error';
  progress: number;
  attachment?: Attachment;
  error?: string;
  fileName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private http = inject(HttpClient);
  private coreApiUrl = environment.coreApiUrl + '/api/v1/files';
  private notesApiUrl = environment.apiUrl + '/api/v1/notes';

  // File size limits
  readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  readonly MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

  /**
   * Main method to upload a file and attach it to a note
   * Orchestrates the complete upload flow with progress tracking
   */
  uploadFile(noteId: string, file: File, currentTotalSize: number = 0): Observable<UploadProgress> {
    return new Observable(subscriber => {
      // Step 1: Validate file size
      subscriber.next({
        phase: 'validating',
        progress: 0,
        fileName: file.name
      });

      const validation = this.validateFile(file, currentTotalSize);
      if (!validation.valid) {
        subscriber.next({
          phase: 'error',
          progress: 0,
          error: validation.error,
          fileName: file.name
        });
        subscriber.error(new Error(validation.error));
        return;
      }

      // Step 2: Get presigned URL from Core Service
      subscriber.next({
        phase: 'getting_url',
        progress: 5,
        fileName: file.name
      });

      this.getPresignedUrl(file.name, file.type, file.size)
        .pipe(
          switchMap(urlData => {
            subscriber.next({
              phase: 'uploading',
              progress: 10,
              fileName: file.name
            });

            // Step 3: Upload to DigitalOcean Spaces with progress tracking
            return this.uploadToSpaces(file, urlData.presigned_url).pipe(
              tap(progress => {
                // Map 10-90% to upload progress
                const uploadProgress = Math.min(90, 10 + (progress * 0.8));
                subscriber.next({
                  phase: 'uploading',
                  progress: uploadProgress,
                  fileName: file.name
                });
              }),
              switchMap(() => {
                // Step 4: Attach file to note
                subscriber.next({
                  phase: 'attaching',
                  progress: 95,
                  fileName: file.name
                });

                return this.attachFileToNote(noteId, urlData.file_id);
              })
            );
          }),
          catchError(error => {
            const errorMsg = this.formatError(error);
            subscriber.next({
              phase: 'error',
              progress: 0,
              error: errorMsg,
              fileName: file.name
            });
            return throwError(() => new Error(errorMsg));
          })
        )
        .subscribe({
          next: (attachment) => {
            subscriber.next({
              phase: 'complete',
              progress: 100,
              attachment,
              fileName: file.name
            });
            subscriber.complete();
          },
          error: (err) => {
            subscriber.error(err);
          }
        });
    });
  }

  /**
   * Validate file size constraints
   */
  validateFile(file: File, currentTotalSize: number = 0): { valid: boolean; error?: string } {
    // Check individual file size
    if (file.size > this.MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `File size exceeds 25MB limit. File size: ${sizeMB}MB`
      };
    }

    // Check total attachment size
    const newTotal = currentTotalSize + file.size;
    if (newTotal > this.MAX_TOTAL_SIZE) {
      const currentMB = (currentTotalSize / 1024 / 1024).toFixed(2);
      const fileMB = (file.size / 1024 / 1024).toFixed(2);
      const totalMB = (newTotal / 1024 / 1024).toFixed(2);
      return {
        valid: false,
        error: `Total attachment size would exceed 100MB limit. Current: ${currentMB}MB, New file: ${fileMB}MB, Total: ${totalMB}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Get presigned URL from Core Service
   */
  getPresignedUrl(filename: string, mimeType: string, fileSize: number): Observable<PresignedUrlResponse> {
    return this.http.post<ApiResponse<PresignedUrlResponse>>(
      `${this.coreApiUrl}/presigned-url`,
      {
        filename,
        mime_type: mimeType,
        file_size: fileSize
      }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const message = error.error?.message || 'Failed to get upload URL';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Upload file directly to DigitalOcean Spaces using presigned URL
   * Returns progress percentage (0-100)
   */
  uploadToSpaces(file: File, presignedUrl: string): Observable<number> {
    const req = new HttpRequest('PUT', presignedUrl, file, {
      headers: new HttpHeaders({
        'Content-Type': file.type || 'application/octet-stream'
      }),
      reportProgress: true
    });

    return this.http.request(req).pipe(
      filter((event: HttpEvent<any>) =>
        event.type === HttpEventType.UploadProgress ||
        event.type === HttpEventType.Response
      ),
      map((event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          return Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          return 100;
        }
        return 0;
      }),
      catchError(error => {
        return throwError(() => new Error('Failed to upload file to storage'));
      })
    );
  }

  /**
   * Attach uploaded file to note in Notes Service
   */
  attachFileToNote(noteId: string, fileId: string): Observable<Attachment> {
    return this.http.post<ApiResponse<Attachment>>(
      `${this.notesApiUrl}/${noteId}/attachments`,
      { file_id: fileId }
    ).pipe(
      map(response => response.data),
      catchError(error => {
        const message = error.error?.message || 'Failed to attach file to note';
        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Format error messages for user display
   */
  private formatError(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.message) {
      return error.message;
    }
    if (error.status === 413) {
      return 'File is too large';
    }
    if (error.status === 400) {
      return 'Invalid file';
    }
    if (error.status === 404) {
      return 'Note not found';
    }
    if (error.status === 409) {
      return 'File already attached';
    }
    return 'Upload failed. Please try again.';
  }

  /**
   * Calculate total size of attachments
   */
  calculateTotalSize(attachments: Attachment[]): number {
    return attachments.reduce((total, att) => total + (att.file_size || 0), 0);
  }
}

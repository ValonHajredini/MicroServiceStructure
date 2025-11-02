import { Component, input, output, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { FileUploadService, UploadProgress } from '../../services/file-upload.service';
import { Attachment } from '../../models/attachment.model';

interface UploadState {
  file: File;
  progress: number;
  phase: string;
  error?: string;
  attachment?: Attachment;
  retryCount: number;
}

@Component({
  selector: 'app-file-upload',
  imports: [CommonModule, ButtonModule, ProgressBarModule],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUploadComponent {
  private fileUploadService = inject(FileUploadService);
  private messageService = inject(MessageService);

  // Inputs
  noteId = input.required<string>();
  currentTotalSize = input<number>(0);
  disabled = input<boolean>(false);

  // Outputs
  fileUploaded = output<Attachment>();

  // ViewChild for file input
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // State
  isDragOver = signal(false);
  uploadQueue = signal<UploadState[]>([]);
  isUploading = signal(false);

  // Constants
  readonly MAX_RETRY_ATTEMPTS = 3;
  readonly ACCEPTED_FILE_TYPES = [
    // Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    // Images
    '.jpg', '.jpeg', '.png', '.gif',
    // Text
    '.txt', '.md', '.csv'
  ].join(',');

  /**
   * Open file picker dialog
   */
  openFilePicker(): void {
    if (this.disabled()) return;
    this.fileInput.nativeElement.click();
  }

  /**
   * Handle file selection from file picker
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.processFiles(files);
      // Reset input so same file can be selected again
      input.value = '';
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Only highlight if files are being dragged
    if (event.dataTransfer?.types.includes('Files')) {
      this.isDragOver.set(true);
    }
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  /**
   * Handle file drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.disabled()) return;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const files = Array.from(event.dataTransfer.files);
      this.processFiles(files);
    }
  }

  /**
   * Process and validate files, then add to upload queue
   */
  processFiles(files: File[]): void {
    const validFiles: File[] = [];
    const invalidFiles: { file: File; reason: string }[] = [];

    files.forEach(file => {
      const validation = this.fileUploadService.validateFile(file, this.currentTotalSize());

      if (validation.valid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, reason: validation.error! });
      }
    });

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(({ file, reason }) => {
        this.messageService.add({
          severity: 'error',
          summary: 'File Validation Failed',
          detail: `${file.name}: ${reason}`,
          life: 5000
        });
      });
    }

    // Add valid files to queue
    if (validFiles.length > 0) {
      const newStates: UploadState[] = validFiles.map(file => ({
        file,
        progress: 0,
        phase: 'queued',
        retryCount: 0
      }));

      this.uploadQueue.set([...this.uploadQueue(), ...newStates]);

      // Start uploading if not already uploading
      if (!this.isUploading()) {
        this.uploadNext();
      }
    }
  }

  /**
   * Upload next file in queue
   */
  uploadNext(): void {
    const queue = this.uploadQueue();
    const nextUpload = queue.find(state =>
      state.phase === 'queued' || (state.phase === 'error' && state.retryCount < this.MAX_RETRY_ATTEMPTS)
    );

    if (!nextUpload) {
      this.isUploading.set(false);
      return;
    }

    this.isUploading.set(true);
    this.uploadFile(nextUpload);
  }

  /**
   * Upload a single file
   */
  uploadFile(uploadState: UploadState): void {
    const currentTotal = this.currentTotalSize();

    this.fileUploadService.uploadFile(this.noteId(), uploadState.file, currentTotal)
      .subscribe({
        next: (progress: UploadProgress) => {
          this.updateUploadState(uploadState.file, {
            progress: progress.progress,
            phase: this.formatPhase(progress.phase),
            attachment: progress.attachment,
            error: progress.error
          });

          if (progress.phase === 'complete' && progress.attachment) {
            this.messageService.add({
              severity: 'success',
              summary: 'Upload Complete',
              detail: `${uploadState.file.name} uploaded successfully`,
              life: 3000
            });
            this.fileUploaded.emit(progress.attachment);
            this.removeFromQueue(uploadState.file);
            this.uploadNext();
          }
        },
        error: (error) => {
          uploadState.retryCount++;

          if (uploadState.retryCount >= this.MAX_RETRY_ATTEMPTS) {
            this.updateUploadState(uploadState.file, {
              phase: 'failed',
              error: error.message || 'Upload failed'
            });

            this.messageService.add({
              severity: 'error',
              summary: 'Upload Failed',
              detail: `${uploadState.file.name}: ${error.message}`,
              life: 5000
            });
          } else {
            this.updateUploadState(uploadState.file, {
              phase: 'error',
              error: error.message || 'Upload failed'
            });
          }

          this.uploadNext();
        }
      });
  }

  /**
   * Retry failed upload
   */
  retryUpload(uploadState: UploadState): void {
    uploadState.retryCount = 0;
    uploadState.phase = 'queued';
    uploadState.error = undefined;
    this.uploadQueue.set([...this.uploadQueue()]);

    if (!this.isUploading()) {
      this.uploadNext();
    }
  }

  /**
   * Remove upload from queue
   */
  removeFromQueue(file: File): void {
    this.uploadQueue.set(
      this.uploadQueue().filter(state => state.file !== file)
    );
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadState: UploadState): void {
    this.removeFromQueue(uploadState.file);

    if (this.uploadQueue().length === 0) {
      this.isUploading.set(false);
    }
  }

  /**
   * Update upload state
   */
  private updateUploadState(file: File, updates: Partial<UploadState>): void {
    this.uploadQueue.set(
      this.uploadQueue().map(state =>
        state.file === file ? { ...state, ...updates } : state
      )
    );
  }

  /**
   * Format phase for display
   */
  private formatPhase(phase: string): string {
    const phaseMap: Record<string, string> = {
      validating: 'Validating...',
      getting_url: 'Preparing...',
      uploading: 'Uploading...',
      attaching: 'Attaching to note...',
      complete: 'Complete',
      error: 'Error'
    };
    return phaseMap[phase] || phase;
  }

  /**
   * Get icon class for upload state
   */
  getStateIcon(state: UploadState): string {
    if (state.phase === 'Complete') return 'pi pi-check-circle';
    if (state.phase === 'failed' || state.phase === 'Error') return 'pi pi-times-circle';
    if (state.phase === 'queued') return 'pi pi-clock';
    return 'pi pi-spin pi-spinner';
  }

  /**
   * Get icon color for upload state
   */
  getStateIconClass(state: UploadState): string {
    if (state.phase === 'Complete') return 'text-green-500';
    if (state.phase === 'failed' || state.phase === 'Error') return 'text-red-500';
    if (state.phase === 'queued') return 'text-gray-500';
    return 'text-blue-500';
  }
}

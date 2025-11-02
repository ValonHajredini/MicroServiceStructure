import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { NotesService } from '../../services/notes.service';
import { FileUploadService } from '../../services/file-upload.service';
import { Attachment } from '../../models/attachment.model';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { FileUploadComponent } from '../file-upload/file-upload';

@Component({
  selector: 'app-attachments',
  imports: [CommonModule, ButtonModule, ConfirmDialogModule, FileSizePipe, FileUploadComponent],
  providers: [ConfirmationService],
  templateUrl: './attachments.component.html',
  styleUrls: ['./attachments.component.scss']
})
export class AttachmentsComponent {
  private notesService = inject(NotesService);
  private confirmationService = inject(ConfirmationService);
  private fileUploadService = inject(FileUploadService);
  private messageService = inject(MessageService);

  noteId = input.required<string>();
  attachments = input<Attachment[]>([]);

  attachmentAdded = output<Attachment>();

  deleting = signal<Set<string>>(new Set());
  showUpload = signal(false);

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType.startsWith('video/')) return 'pi pi-video';
    if (mimeType.startsWith('audio/')) return 'pi pi-volume-up';
    if (mimeType.includes('pdf')) return 'pi pi-file-pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'pi pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi pi-file-excel';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'pi pi-file-archive';
    return 'pi pi-file';
  }

  downloadAttachment(attachment: Attachment): void {
    // Open in new tab or trigger download
    window.open(attachment.storage_url, '_blank');
  }

  removeAttachment(attachment: Attachment): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove "${attachment.filename}"?`,
      header: 'Remove Attachment',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteAttachment(attachment);
      }
    });
  }

  private deleteAttachment(attachment: Attachment): void {
    const deletingSet = this.deleting();
    deletingSet.add(attachment.id);
    this.deleting.set(new Set(deletingSet));

    this.notesService.deleteAttachment(this.noteId(), attachment.id).subscribe({
      next: () => {
        // Remove from deleting set
        const deletingSet = this.deleting();
        deletingSet.delete(attachment.id);
        this.deleting.set(new Set(deletingSet));

        // Note: Parent component should reload note to refresh attachments list
      },
      error: (err) => {
        console.error('Error deleting attachment:', err);
        const deletingSet = this.deleting();
        deletingSet.delete(attachment.id);
        this.deleting.set(new Set(deletingSet));
      }
    });
  }

  isDeleting(attachmentId: string): boolean {
    return this.deleting().has(attachmentId);
  }

  /**
   * Toggle upload section
   */
  toggleUpload(): void {
    this.showUpload.set(!this.showUpload());
  }

  /**
   * Handle file uploaded event
   */
  onFileUploaded(attachment: Attachment): void {
    this.attachmentAdded.emit(attachment);
  }

  /**
   * Calculate total size of current attachments
   */
  getTotalSize(): number {
    return this.fileUploadService.calculateTotalSize(this.attachments());
  }
}

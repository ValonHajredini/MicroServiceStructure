import { Component, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { FoldersService } from '../../services/folders.service';
import { Folder } from '../../models/folder.model';

@Component({
  selector: 'app-folder-dialog',
  imports: [CommonModule, FormsModule, DialogModule, InputTextModule, ButtonModule, Select],
  templateUrl: './folder-dialog.html',
  styleUrl: './folder-dialog.scss',
})
export class FolderDialog {
  private foldersService = inject(FoldersService);
  private messageService = inject(MessageService);

  visible = input<boolean>(false);
  mode = input<'create' | 'rename'>('create');
  folder = input<Folder | null>(null);
  folders = input<Folder[]>([]);

  closed = output<void>();
  saved = output<Folder>();

  folderName = signal<string>('');
  parentId = signal<string | null>(null);
  loading = signal(false);

  ngOnChanges(): void {
    if (this.visible()) {
      if (this.mode() === 'rename' && this.folder()) {
        this.folderName.set(this.folder()!.name);
        this.parentId.set(this.folder()!.parent_id);
      } else {
        this.folderName.set('');
        this.parentId.set(null);
      }
    }
  }

  onHide(): void {
    this.closed.emit();
  }

  onSave(): void {
    const name = this.folderName().trim();

    if (!name) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Folder name is required',
        life: 3000
      });
      return;
    }

    this.loading.set(true);

    if (this.mode() === 'create') {
      this.foldersService.createFolder({ name, parent_id: this.parentId() }).subscribe({
        next: (folder) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Folder created successfully',
            life: 3000
          });
          this.loading.set(false);
          this.saved.emit(folder);
          this.closed.emit();
        },
        error: (err) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create folder',
            life: 3000
          });
        }
      });
    } else {
      // Rename mode
      const folderId = this.folder()!.id;
      this.foldersService.updateFolder(folderId, { name }).subscribe({
        next: (folder) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Folder renamed successfully',
            life: 3000
          });
          this.loading.set(false);
          this.saved.emit(folder);
          this.closed.emit();
        },
        error: (err) => {
          this.loading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to rename folder',
            life: 3000
          });
        }
      });
    }
  }

  getDialogHeader(): string {
    return this.mode() === 'create' ? 'New Folder' : 'Rename Folder';
  }
}

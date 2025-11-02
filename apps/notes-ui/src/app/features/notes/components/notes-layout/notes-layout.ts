import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NoteListComponent } from '../note-list/note-list.component';
import { NoteEditorComponent } from '../note-editor/note-editor.component';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { HeaderComponent } from '../header/header.component';
import { ToolbarComponent } from '../toolbar/toolbar';
import { Note } from '../../models/note.model';
import { NotesService, SearchResultNote } from '../../services/notes.service';
import { FoldersService } from '../../services/folders.service';
import { ErrorService } from '../../../../core/services/error';
import { ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FolderDialogComponent } from '../folder-dialog/folder-dialog';
import { fromEvent } from 'rxjs';

@Component({
  selector: 'app-notes-layout',
  imports: [
    CommonModule,
    SidebarComponent,
    NoteListComponent,
    NoteEditorComponent,
    AttachmentsComponent,
    HeaderComponent,
    ToolbarComponent,
    ToastModule,
    ConfirmDialogModule,
    FolderDialogComponent
  ],
  templateUrl: './notes-layout.html',
  styleUrls: ['./notes-layout.scss'],
  providers: [ConfirmationService]
})
export class NotesLayoutComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notesService = inject(NotesService);
  private foldersService = inject(FoldersService);
  private errorService = inject(ErrorService);
  private confirmationService = inject(ConfirmationService);

  sidebarVisible = signal(true);
  selectedFolderId = signal<string | null>(null);
  selectedNoteId = signal<string | null>(null);
  currentNote = signal<Note | null>(null);
  isMobileView = signal(false);
  showNoteList = signal(true);
  searchResults = signal<SearchResultNote[]>([]);
  isSearchActive = signal(false);
  showFolderDialog = signal(false);

  constructor() {
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
    this.setupKeyboardShortcuts();
  }

  ngOnInit(): void {
    // Read initial state from URL
    this.route.params.subscribe(params => {
      if (params['folderId']) {
        this.selectedFolderId.set(params['folderId']);
      }
      if (params['noteId']) {
        this.selectedNoteId.set(params['noteId']);
        if (this.isMobileView()) {
          this.showNoteList.set(false);
        }
      }
    });
  }

  checkMobileView(): void {
    this.isMobileView.set(window.innerWidth < 768);
  }

  toggleSidebar(): void {
    this.sidebarVisible.set(!this.sidebarVisible());
  }

  onFolderSelected(folderId: string | null): void {
    this.selectedFolderId.set(folderId);
    this.selectedNoteId.set(null);
    this.currentNote.set(null);

    if (folderId) {
      this.router.navigate(['/notes/folder', folderId]);
    } else {
      this.router.navigate(['/notes/all']);
    }

    if (this.isMobileView()) {
      this.sidebarVisible.set(false);
    }
  }

  onNoteSelected(noteId: string): void {
    this.selectedNoteId.set(noteId);
    this.router.navigate(['/notes/note', noteId]);

    if (this.isMobileView()) {
      this.showNoteList.set(false);
    }
  }

  onNewNoteClick(): void {
    this.selectedNoteId.set(null);
    this.currentNote.set(null);

    if (this.isMobileView()) {
      this.showNoteList.set(false);
    }
  }

  onNoteSaved(note: Note): void {
    this.currentNote.set(note);
    if (!this.selectedNoteId()) {
      this.selectedNoteId.set(note.id);
      this.router.navigate(['/notes/note', note.id]);
    }
  }

  onAttachmentAdded(attachment: any): void {
    // Reload note to refresh attachments list
    if (this.selectedNoteId()) {
      this.notesService.getNote(this.selectedNoteId()!).subscribe({
        next: (note) => {
          this.currentNote.set(note);
        },
        error: (err) => {
          this.errorService.handleError(err, 'Note');
        }
      });
    }
  }

  // Task 4: Implement New Note Action
  onNewNoteClickAction(): void {
    const createDto = {
      title: '',
      content: '',
      folder_id: this.selectedFolderId() || undefined
    };

    this.notesService.createNote(createDto).subscribe({
      next: (note) => {
        this.selectedNoteId.set(note.id);
        this.currentNote.set(note);
        this.router.navigate(['/notes/note', note.id]);
        if (this.isMobileView()) {
          this.showNoteList.set(false);
        }
      },
      error: (err) => {
        this.errorService.handleError(err, 'Note');
      }
    });
  }

  // Task 5: Implement New Folder Action
  onNewFolderClick(): void {
    this.showFolderDialog.set(true);
  }

  onFolderCreated(): void {
    this.showFolderDialog.set(false);
    this.errorService.showSuccess('Folder created successfully');
  }

  onFolderDialogCancel(): void {
    this.showFolderDialog.set(false);
  }

  // Task 6: Implement Pin/Unpin Action
  onPinNote(note: Note): void {
    this.notesService.updateNote(note.id, { is_pinned: !note.is_pinned }).subscribe({
      next: (updated) => {
        this.currentNote.set(updated);
        this.errorService.showSuccess(
          updated.is_pinned ? 'Note pinned' : 'Note unpinned'
        );
      },
      error: (err) => {
        this.errorService.handleError(err, 'Note');
      }
    });
  }

  // Task 7: Implement Delete Action
  onDeleteNote(note: Note): void {
    this.confirmationService.confirm({
      message: `Move "${note.title || 'Untitled'}" to trash?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.notesService.deleteNote(note.id).subscribe({
          next: () => {
            if (this.selectedNoteId() === note.id) {
              this.selectedNoteId.set(null);
              this.currentNote.set(null);
              this.router.navigate(['/notes/all']);
            }
            this.errorService.showSuccess('Note moved to trash');
          },
          error: (err) => {
            this.errorService.handleError(err, 'Note');
          }
        });
      }
    });
  }

  // Search handlers
  onSearchResults(results: SearchResultNote[]): void {
    this.searchResults.set(results);
    this.isSearchActive.set(true);
  }

  onSearchCleared(): void {
    this.searchResults.set([]);
    this.isSearchActive.set(false);
  }

  // Task 14: Keyboard Shortcuts
  setupKeyboardShortcuts(): void {
    fromEvent<KeyboardEvent>(document, 'keydown').subscribe(event => {
      // Ctrl/Cmd + N: New note
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        this.onNewNoteClickAction();
      }

      // Delete key: Delete selected note (with confirmation)
      if (event.key === 'Delete' && this.currentNote()) {
        event.preventDefault();
        this.onDeleteNote(this.currentNote()!);
      }

      // Escape: Clear search, deselect note
      if (event.key === 'Escape') {
        if (this.isSearchActive()) {
          this.onSearchCleared();
        } else if (this.selectedNoteId()) {
          this.selectedNoteId.set(null);
          this.currentNote.set(null);
        }
      }
    });
  }

  backToList(): void {
    this.showNoteList.set(true);
    this.selectedNoteId.set(null);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', () => this.checkMobileView());
  }
}

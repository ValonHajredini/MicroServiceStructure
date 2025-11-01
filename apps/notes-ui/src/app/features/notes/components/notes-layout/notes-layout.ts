import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NoteListComponent } from '../note-list/note-list.component';
import { NoteEditorComponent } from '../note-editor/note-editor.component';
import { AttachmentsComponent } from '../attachments/attachments.component';
import { HeaderComponent } from '../header/header.component';
import { Note } from '../../models/note.model';

@Component({
  selector: 'app-notes-layout',
  imports: [
    CommonModule,
    SidebarComponent,
    NoteListComponent,
    NoteEditorComponent,
    AttachmentsComponent,
    HeaderComponent
  ],
  templateUrl: './notes-layout.html',
  styleUrl: './notes-layout.scss',
})
export class NotesLayout {
  sidebarVisible = signal(true);
  selectedFolderId = signal<string | null>(null);
  selectedNoteId = signal<string | null>(null);
  currentNote = signal<Note | null>(null);
  isMobileView = signal(false);
  showNoteList = signal(true);

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
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

  onNewFolderClick(): void {
    // TODO: Implement folder creation dialog (Task 13)
    console.log('New folder clicked');
  }

  backToList(): void {
    this.showNoteList.set(true);
    this.selectedNoteId.set(null);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', () => this.checkMobileView());
  }
}

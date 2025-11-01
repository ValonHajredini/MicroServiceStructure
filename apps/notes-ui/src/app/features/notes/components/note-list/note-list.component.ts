import { Component, OnInit, Output, EventEmitter, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { SkeletonModule } from 'primeng/skeleton';
import { NotesService } from '../../services/notes.service';
import { Note } from '../../models/note.model';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-note-list',
  imports: [CommonModule, CardModule, ButtonModule, BadgeModule, SkeletonModule, RelativeTimePipe],
  templateUrl: './note-list.component.html',
  styleUrls: ['./note-list.component.scss']
})
export class NoteListComponent implements OnInit {
  private notesService = inject(NotesService);

  folderId = input<string | null>(null);

  @Output() noteSelected = new EventEmitter<string>();
  @Output() newNoteClick = new EventEmitter<void>();

  notes = signal<Note[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadNotes();
  }

  ngOnChanges(): void {
    this.loadNotes();
  }

  loadNotes(): void {
    this.loading.set(true);
    this.error.set(null);

    const params = this.folderId() ? { folder_id: this.folderId()! } : {};

    this.notesService.getNotes(params).subscribe({
      next: (notes) => {
        // Sort: pinned first, then by updated_at descending
        const sorted = notes.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        this.notes.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading notes:', err);
        this.error.set('Failed to load notes');
        this.loading.set(false);
      }
    });
  }

  onNoteClick(noteId: string): void {
    this.noteSelected.emit(noteId);
  }

  onNewNoteClick(): void {
    this.newNoteClick.emit();
  }

  getPreview(content: string): string {
    // Strip HTML tags and get first 100 characters
    const text = content.replace(/<[^>]*>/g, '');
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  togglePin(event: Event, note: Note): void {
    event.stopPropagation(); // Prevent note selection

    this.notesService.updateNote(note.id, { is_pinned: !note.is_pinned }).subscribe({
      next: (updated) => {
        // Update note in list optimistically
        const notesList = this.notes();
        const index = notesList.findIndex(n => n.id === note.id);
        if (index !== -1) {
          notesList[index] = updated;
          // Re-sort list
          const sorted = notesList.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          });
          this.notes.set([...sorted]);
        }
      },
      error: (err) => {
        console.error('Error toggling pin:', err);
      }
    });
  }
}

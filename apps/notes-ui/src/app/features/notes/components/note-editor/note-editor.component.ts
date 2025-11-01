import { Component, OnInit, OnDestroy, inject, signal, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { Subject, Subscription, interval, debounceTime } from 'rxjs';
import { NotesService } from '../../services/notes.service';
import { Note, CreateNoteDto, UpdateNoteDto } from '../../models/note.model';
import { KeyboardService } from '../../../../core/services/keyboard';

@Component({
  selector: 'app-note-editor',
  imports: [CommonModule, FormsModule, EditorModule, InputTextModule, ButtonModule],
  templateUrl: './note-editor.component.html',
  styleUrls: ['./note-editor.component.scss']
})
export class NoteEditorComponent implements OnInit, OnDestroy {
  private notesService = inject(NotesService);
  private keyboardService = inject(KeyboardService);

  noteId = input<string | null>(null);
  noteSaved = output<Note>();

  note = signal<Partial<Note>>({
    title: '',
    content: ''
  });

  loading = signal(false);
  isDirty = signal(false);
  isSaving = signal(false);
  saveStatus = signal<string>('');
  error = signal<string | null>(null);

  private contentChanges$ = new Subject<void>();
  private autoSaveInterval = 30000; // 30 seconds
  private debounceMs = 2000; // 2 seconds
  private intervalSubscription?: Subscription;
  private debounceSubscription?: Subscription;

  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link']
    ]
  };

  ngOnInit(): void {
    if (this.noteId()) {
      this.loadNote();
    }

    // Debounce content changes
    this.debounceSubscription = this.contentChanges$.pipe(
      debounceTime(this.debounceMs)
    ).subscribe(() => {
      this.isDirty.set(true);
      this.saveStatus.set('Unsaved changes');
    });

    // Auto-save interval
    this.intervalSubscription = interval(this.autoSaveInterval).subscribe(() => {
      if (this.isDirty() && !this.isSaving()) {
        this.save();
      }
    });

    // Register keyboard shortcuts
    this.keyboardService.registerShortcut({
      key: 's',
      ctrl: true,
      meta: true,
      description: 'Save note',
      handler: () => this.manualSave()
    });
  }

  ngOnDestroy(): void {
    this.debounceSubscription?.unsubscribe();
    this.intervalSubscription?.unsubscribe();

    // Save on navigate away
    if (this.isDirty() && !this.isSaving()) {
      this.save();
    }
  }

  loadNote(): void {
    if (!this.noteId()) return;

    this.loading.set(true);
    this.error.set(null);

    this.notesService.getNote(this.noteId()!).subscribe({
      next: (note) => {
        this.note.set(note);
        this.loading.set(false);
        this.isDirty.set(false);
        this.saveStatus.set('All changes saved');
      },
      error: (err) => {
        console.error('Error loading note:', err);
        this.error.set('Failed to load note');
        this.loading.set(false);
      }
    });
  }

  onTitleChange(): void {
    this.contentChanges$.next();
  }

  onContentChange(): void {
    this.contentChanges$.next();
  }

  save(): void {
    if (this.isSaving()) return;

    const currentNote = this.note();

    if (!currentNote.title?.trim() && !currentNote.content?.trim()) {
      this.saveStatus.set('Nothing to save');
      return;
    }

    this.isSaving.set(true);
    this.saveStatus.set('Saving...');

    const saveOperation = currentNote.id
      ? this.notesService.updateNote(currentNote.id, {
          title: currentNote.title,
          content: currentNote.content
        } as UpdateNoteDto)
      : this.notesService.createNote({
          title: currentNote.title,
          content: currentNote.content
        } as CreateNoteDto);

    saveOperation.subscribe({
      next: (saved) => {
        this.note.set(saved);
        this.isDirty.set(false);
        this.isSaving.set(false);
        const now = new Date();
        this.saveStatus.set(`Saved at ${now.toLocaleTimeString()}`);
        this.noteSaved.emit(saved);
      },
      error: (err) => {
        console.error('Error saving note:', err);
        this.isSaving.set(false);
        this.saveStatus.set('Error saving');
        this.error.set('Failed to save note. Will retry...');

        // Retry after delay
        setTimeout(() => {
          if (this.isDirty()) {
            this.save();
          }
        }, 5000);
      }
    });
  }

  manualSave(): void {
    this.save();
  }

  updateTitle(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.note.update(note => ({ ...note, title: input.value }));
    this.onTitleChange();
  }

  updateContent(event: any): void {
    this.note.update(note => ({ ...note, content: event.htmlValue || '' }));
    this.onContentChange();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    this.keyboardService.handleKeyDown(event);
  }
}

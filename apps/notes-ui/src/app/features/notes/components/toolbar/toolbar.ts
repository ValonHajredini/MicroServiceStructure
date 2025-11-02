import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Note } from '../../models/note.model';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { FilterDropdownComponent } from '../filter-dropdown/filter-dropdown';

@Component({
  selector: 'app-toolbar',
  imports: [CommonModule, ButtonModule, TooltipModule, FilterDropdownComponent],
  templateUrl: './toolbar.html',
  styleUrls: ['./toolbar.scss']
})
export class ToolbarComponent {
  @Input() selectedNote?: Note;
  @Output() newNote = new EventEmitter<void>();
  @Output() newFolder = new EventEmitter<void>();
  @Output() pinNote = new EventEmitter<Note>();
  @Output() deleteNote = new EventEmitter<Note>();

  get canPin(): boolean {
    return !!this.selectedNote;
  }

  get canDelete(): boolean {
    return !!this.selectedNote;
  }

  get pinButtonLabel(): string {
    return this.selectedNote?.is_pinned ? 'Unpin' : 'Pin';
  }

  get pinButtonIcon(): string {
    return this.selectedNote?.is_pinned ? 'pi pi-star-fill' : 'pi pi-star';
  }

  onNewNote() {
    this.newNote.emit();
  }

  onNewFolder() {
    this.newFolder.emit();
  }

  onPinToggle() {
    if (this.selectedNote) {
      this.pinNote.emit(this.selectedNote);
    }
  }

  onDelete() {
    if (this.selectedNote) {
      this.deleteNote.emit(this.selectedNote);
    }
  }
}

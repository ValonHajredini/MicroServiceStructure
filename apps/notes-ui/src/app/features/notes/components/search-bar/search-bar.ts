import { Component, OnInit, OnDestroy, Output, EventEmitter, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { NotesService, SearchResult, SearchResultNote } from '../../services/notes.service';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule, ReactiveFormsModule, InputTextModule, ButtonModule, ProgressSpinnerModule],
  templateUrl: './search-bar.html',
  styleUrls: ['./search-bar.scss']
})
export class SearchBarComponent implements OnInit, OnDestroy {
  private notesService = inject(NotesService);
  private messageService = inject(MessageService);

  searchControl = new FormControl('');
  isSearching = false;
  resultCount = 0;
  private destroy$ = new Subject<void>();

  @Output() searchResults = new EventEmitter<SearchResultNote[]>();
  @Output() searchCleared = new EventEmitter<void>();

  ngOnInit() {
    this.searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 1) {
          this.resultCount = 0;
          this.searchResults.emit([]);
          this.searchCleared.emit();
          return of(null);
        }

        this.isSearching = true;
        return this.notesService.searchNotes(query).pipe(
          catchError((error) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Search Failed',
              detail: 'Could not search notes. Please try again.'
            });
            console.error('Search error:', error);
            return of(null);
          }),
          finalize(() => this.isSearching = false)
        );
      })
    ).subscribe(result => {
      if (result) {
        this.resultCount = result.meta.total;
        this.searchResults.emit(result.results);
      }
    });

    // Listen for Escape key to clear search
    document.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.searchControl.value) {
      this.clearSearch();
    }
  };

  clearSearch() {
    this.searchControl.setValue('');
    this.resultCount = 0;
    this.searchResults.emit([]);
    this.searchCleared.emit();
  }

  get hasQuery(): boolean {
    return !!this.searchControl.value && this.searchControl.value.length > 0;
  }
}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Note } from '../models/note.model';

export interface FilterOption {
  type: 'all' | 'pinned' | 'folder' | 'recent';
  folderId?: string;
  folderName?: string;
}

@Injectable({ providedIn: 'root' })
export class FilterService {
  private activeFilter$ = new BehaviorSubject<FilterOption>({ type: 'all' });

  get activeFilter(): Observable<FilterOption> {
    return this.activeFilter$.asObservable();
  }

  get activeFilterValue(): FilterOption {
    return this.activeFilter$.value;
  }

  setFilter(filter: FilterOption) {
    this.activeFilter$.next(filter);
  }

  clearFilter() {
    this.setFilter({ type: 'all' });
  }

  applyFilter(notes: Note[], filter: FilterOption): Note[] {
    switch (filter.type) {
      case 'pinned':
        return notes.filter(n => n.is_pinned);
      case 'folder':
        // Server-side filter via API, return as is
        return notes;
      case 'recent':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return notes.filter(n => new Date(n.created_at) > sevenDaysAgo);
      case 'all':
      default:
        return notes;
    }
  }

  getFilterLabel(filter: FilterOption): string {
    switch (filter.type) {
      case 'pinned':
        return 'Pinned Only';
      case 'folder':
        return filter.folderName || 'Folder';
      case 'recent':
        return 'Recent (7 days)';
      case 'all':
      default:
        return 'All Notes';
    }
  }
}

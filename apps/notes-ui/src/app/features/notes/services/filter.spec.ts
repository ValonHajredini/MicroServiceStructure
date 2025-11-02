import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter';
import { Note } from '../models/note.model';

describe('FilterService', () => {
  let service: FilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set filter', (done) => {
    service.setFilter({ type: 'pinned' });
    service.activeFilter.subscribe(filter => {
      expect(filter.type).toBe('pinned');
      done();
    });
  });

  it('should clear filter', (done) => {
    service.setFilter({ type: 'pinned' });
    service.clearFilter();
    service.activeFilter.subscribe(filter => {
      expect(filter.type).toBe('all');
      done();
    });
  });

  it('should filter pinned notes', () => {
    const notes: Note[] = [
      { id: '1', is_pinned: true } as Note,
      { id: '2', is_pinned: false } as Note
    ];
    const filtered = service.applyFilter(notes, { type: 'pinned' });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should get filter label', () => {
    expect(service.getFilterLabel({ type: 'all' })).toBe('All Notes');
    expect(service.getFilterLabel({ type: 'pinned' })).toBe('Pinned Only');
    expect(service.getFilterLabel({ type: 'recent' })).toBe('Recent (7 days)');
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NotesService } from './notes.service';
import { Note } from '../models/note.model';

describe('NotesService', () => {
  let service: NotesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NotesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get notes', () => {
    const mockNotes: Note[] = [{
      id: '1',
      tenant_id: 'tenant-1',
      user_id: 'user-1',
      title: 'Test Note',
      content: 'Test Content',
      folder_id: null,
      is_pinned: false,
      created_at: new Date(),
      updated_at: new Date()
    }];

    service.getNotes().subscribe(notes => {
      expect(notes.length).toBe(1);
      expect(notes[0].title).toBe('Test Note');
    });

    const req = httpMock.expectOne('http://localhost:3001/api/v1/notes');
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockNotes, status: 'success', timestamp: new Date().toISOString() });
  });
});

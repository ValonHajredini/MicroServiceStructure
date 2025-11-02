import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar';
import { NotesService } from '../../services/notes.service';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;
  let notesServiceSpy: jasmine.SpyObj<NotesService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    const notesSpy = jasmine.createSpyObj('NotesService', ['searchNotes']);
    const msgSpy = jasmine.createSpyObj('MessageService', ['add']);

    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
      providers: [
        { provide: NotesService, useValue: notesSpy },
        { provide: MessageService, useValue: msgSpy }
      ]
    }).compileComponents();

    notesServiceSpy = TestBed.inject(NotesService) as jasmine.SpyObj<NotesService>;
    messageServiceSpy = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear search', () => {
    component.searchControl.setValue('test');
    component.clearSearch();
    expect(component.searchControl.value).toBe('');
  });

  it('should emit searchCleared when search is cleared', (done) => {
    component.searchCleared.subscribe(() => {
      done();
    });
    component.clearSearch();
  });
});

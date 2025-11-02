import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ToolbarComponent } from './toolbar';

describe('ToolbarComponent', () => {
  let component: ToolbarComponent;
  let fixture: ComponentFixture<ToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable pin button when no note selected', () => {
    component.selectedNote = undefined;
    expect(component.canPin).toBe(false);
  });

  it('should enable pin button when note selected', () => {
    component.selectedNote = { id: '1', title: 'Test', is_pinned: false } as any;
    expect(component.canPin).toBe(true);
  });

  it('should emit newNote event', (done) => {
    component.newNote.subscribe(() => {
      done();
    });
    component.onNewNote();
  });

  it('should emit deleteNote event with selected note', (done) => {
    const testNote = { id: '1', title: 'Test' } as any;
    component.selectedNote = testNote;
    component.deleteNote.subscribe((note) => {
      expect(note).toBe(testNote);
      done();
    });
    component.onDelete();
  });
});

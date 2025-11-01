import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AttachmentsComponent } from './attachments.component';
import { NotesService } from '../../services/notes.service';
import { ConfirmationService } from 'primeng/api';
import { Attachment } from '../../models/attachment.model';

describe('AttachmentsComponent', () => {
  let component: AttachmentsComponent;
  let fixture: ComponentFixture<AttachmentsComponent>;
  let notesService: jasmine.SpyObj<NotesService>;
  let confirmationService: jasmine.SpyObj<ConfirmationService>;

  const mockAttachments: Attachment[] = [
    {
      id: 'att-1',
      note_id: 'note-1',
      file_id: 'file-1',
      filename: 'document.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      storage_url: 'https://storage.example.com/file-1',
      created_at: new Date()
    }
  ];

  beforeEach(async () => {
    const notesServiceSpy = jasmine.createSpyObj('NotesService', ['deleteAttachment']);

    await TestBed.configureTestingModule({
      imports: [AttachmentsComponent],
      providers: [
        { provide: NotesService, useValue: notesServiceSpy }
      ]
    }).compileComponents();

    notesService = TestBed.inject(NotesService) as jasmine.SpyObj<NotesService>;

    fixture = TestBed.createComponent(AttachmentsComponent);
    component = fixture.componentInstance;

    // Get the component's own ConfirmationService instance
    confirmationService = (component as any).confirmationService;
    spyOn(confirmationService, 'confirm');

    fixture.componentRef.setInput('noteId', 'note-1');
    fixture.componentRef.setInput('attachments', mockAttachments);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return correct icon for PDF', () => {
    expect(component.getFileIcon('application/pdf')).toBe('pi pi-file-pdf');
  });

  it('should open download URL in new tab', () => {
    spyOn(window, 'open');
    component.downloadAttachment(mockAttachments[0]);
    expect(window.open).toHaveBeenCalledWith('https://storage.example.com/file-1', '_blank');
  });

  it('should show confirmation when removing attachment', () => {
    component.removeAttachment(mockAttachments[0]);
    expect(confirmationService.confirm).toHaveBeenCalled();
  });
});

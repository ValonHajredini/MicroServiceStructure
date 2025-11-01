import { Note } from './note.entity';
import { Folder } from '../../folders/entities/folder.entity';
import { Attachment } from './attachment.entity';

describe('Note Entity', () => {
  it('should create a note entity with all required fields', () => {
    const note = new Note();
    note.id = '123e4567-e89b-12d3-a456-426614174000';
    note.tenant_id = '123e4567-e89b-12d3-a456-426614174001';
    note.user_id = '123e4567-e89b-12d3-a456-426614174002';
    note.title = 'Test Note';
    note.content = 'Test content';
    note.is_pinned = false;

    expect(note.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(note.tenant_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(note.user_id).toBe('123e4567-e89b-12d3-a456-426614174002');
    expect(note.title).toBe('Test Note');
    expect(note.content).toBe('Test content');
    expect(note.is_pinned).toBe(false);
  });

  it('should have folder relationship', () => {
    const note = new Note();
    const folder = new Folder();
    folder.id = '123e4567-e89b-12d3-a456-426614174003';

    note.folder = folder;
    note.folder_id = folder.id;

    expect(note.folder).toBe(folder);
    expect(note.folder_id).toBe('123e4567-e89b-12d3-a456-426614174003');
  });

  it('should have attachments relationship', () => {
    const note = new Note();
    const attachment1 = new Attachment();
    const attachment2 = new Attachment();

    note.attachments = [attachment1, attachment2];

    expect(note.attachments.length).toBe(2);
    expect(note.attachments).toContain(attachment1);
    expect(note.attachments).toContain(attachment2);
  });

  it('should allow null values for optional fields', () => {
    const note = new Note();
    note.title = null;
    note.content = null;
    note.folder_id = null;
    note.deleted_at = null;

    expect(note.title).toBeNull();
    expect(note.content).toBeNull();
    expect(note.folder_id).toBeNull();
    expect(note.deleted_at).toBeNull();
  });
});

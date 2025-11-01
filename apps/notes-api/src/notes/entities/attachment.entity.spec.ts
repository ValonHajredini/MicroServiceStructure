import { Attachment } from './attachment.entity';
import { Note } from './note.entity';

describe('Attachment Entity', () => {
  it('should create an attachment entity with all required fields', () => {
    const attachment = new Attachment();
    attachment.id = '123e4567-e89b-12d3-a456-426614174000';
    attachment.tenant_id = '123e4567-e89b-12d3-a456-426614174001';
    attachment.note_id = '123e4567-e89b-12d3-a456-426614174002';
    attachment.file_id = '123e4567-e89b-12d3-a456-426614174003';

    expect(attachment.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(attachment.tenant_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(attachment.note_id).toBe('123e4567-e89b-12d3-a456-426614174002');
    expect(attachment.file_id).toBe('123e4567-e89b-12d3-a456-426614174003');
  });

  it('should have note relationship', () => {
    const attachment = new Attachment();
    const note = new Note();
    note.id = '123e4567-e89b-12d3-a456-426614174002';

    attachment.note = note;
    attachment.note_id = note.id;

    expect(attachment.note).toBe(note);
    expect(attachment.note_id).toBe('123e4567-e89b-12d3-a456-426614174002');
  });

  it('should allow null deleted_at for active attachments', () => {
    const attachment = new Attachment();
    attachment.deleted_at = null;

    expect(attachment.deleted_at).toBeNull();
  });

  it('should set deleted_at for soft delete', () => {
    const attachment = new Attachment();
    const deletedDate = new Date();
    attachment.deleted_at = deletedDate;

    expect(attachment.deleted_at).toBe(deletedDate);
  });
});

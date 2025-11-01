import { Folder } from './folder.entity';
import { Note } from '../../notes/entities/note.entity';

describe('Folder Entity', () => {
  it('should create a folder entity with all required fields', () => {
    const folder = new Folder();
    folder.id = '123e4567-e89b-12d3-a456-426614174000';
    folder.tenant_id = '123e4567-e89b-12d3-a456-426614174001';
    folder.user_id = '123e4567-e89b-12d3-a456-426614174002';
    folder.name = 'Test Folder';

    expect(folder.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(folder.tenant_id).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(folder.user_id).toBe('123e4567-e89b-12d3-a456-426614174002');
    expect(folder.name).toBe('Test Folder');
  });

  it('should support self-referencing parent-child relationship', () => {
    const parentFolder = new Folder();
    parentFolder.id = '123e4567-e89b-12d3-a456-426614174000';
    parentFolder.name = 'Parent Folder';

    const childFolder = new Folder();
    childFolder.id = '123e4567-e89b-12d3-a456-426614174001';
    childFolder.name = 'Child Folder';
    childFolder.parent_id = parentFolder.id;
    childFolder.parent = parentFolder;

    parentFolder.children = [childFolder];

    expect(childFolder.parent).toBe(parentFolder);
    expect(childFolder.parent_id).toBe(parentFolder.id);
    expect(parentFolder.children.length).toBe(1);
    expect(parentFolder.children[0]).toBe(childFolder);
  });

  it('should have notes relationship', () => {
    const folder = new Folder();
    const note1 = new Note();
    const note2 = new Note();

    folder.notes = [note1, note2];

    expect(folder.notes.length).toBe(2);
    expect(folder.notes).toContain(note1);
    expect(folder.notes).toContain(note2);
  });

  it('should allow null parent_id for root folders', () => {
    const folder = new Folder();
    folder.parent_id = null;

    expect(folder.parent_id).toBeNull();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Folder } from '../src/folders/entities/folder.entity';
import { Note } from '../src/notes/entities/note.entity';

describe('Folders API (e2e)', () => {
  let app: INestApplication;
  let foldersRepo: Repository<Folder>;
  let notesRepo: Repository<Note>;

  // Mock JWT tokens for testing
  const tenant1Token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMSIsImVtYWlsIjoidXNlcjFAdGVuYW50MS5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC0wMDEiLCJyb2xlcyI6WyJ1c2VyIl0sImVuYWJsZWRTZXJ2aWNlcyI6WyJub3RlcyJdLCJpYXQiOjE3NjIwMDEwMTksImV4cCI6MTc2MjA4NzQxOX0.eByjiQuMAoJIaSYOFj9s4kP1UPGgWX8APsOQrwZVAS0';
  const tenant2Token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTAwMiIsImVtYWlsIjoidXNlcjJAdGVuYW50Mi5jb20iLCJ0ZW5hbnRJZCI6InRlbmFudC0wMDIiLCJyb2xlcyI6WyJ1c2VyIl0sImVuYWJsZWRTZXJ2aWNlcyI6WyJub3RlcyJdLCJpYXQiOjE3NjIwMDEwMTksImV4cCI6MTc2MjA4NzQxOX0.M1i2akaTvFjxyrITlOz2ZoClgQ2Cu-ZgIzImZGyQSVg';
  const adminToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi0wMDEiLCJlbWFpbCI6ImFkbWluQHRlbmFudDEuY29tIiwidGVuYW50SWQiOiJ0ZW5hbnQtMDAxIiwicm9sZXMiOlsiYWRtaW4iXSwiZW5hYmxlZFNlcnZpY2VzIjpbIm5vdGVzIl0sImlhdCI6MTc2MjAwMTAxOSwiZXhwIjoxNzYyMDg3NDE5fQ.Y2Yfx4ZQjUh4vz_Tqk5Rp79Zs2k-UtBrBoO-21d4k7M';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    foldersRepo = moduleFixture.get<Repository<Folder>>(getRepositoryToken(Folder));
    notesRepo = moduleFixture.get<Repository<Note>>(getRepositoryToken(Note));
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await notesRepo.query('DELETE FROM notes');
    await foldersRepo.query('DELETE FROM folders');
  });

  describe('Full Folder Lifecycle', () => {
    it('should create → read → update → delete folder', async () => {
      // CREATE
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe('Work');
      const folderId = createResponse.body.data.id;

      // READ
      const getAllResponse = await request(app.getHttpServer())
        .get('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);
      expect(getAllResponse.body.data.length).toBe(1);
      expect(getAllResponse.body.data[0].id).toBe(folderId);

      // UPDATE
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/folders/${folderId}`)
        .set('Authorization', tenant1Token)
        .send({ name: 'Work Updated' })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.name).toBe('Work Updated');

      // DELETE
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/folders/${folderId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deletion
      const verifyResponse = await request(app.getHttpServer())
        .get('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(verifyResponse.body.data.length).toBe(0);
    });
  });

  describe('Folder Tree Structure', () => {
    it('should return folders as hierarchical tree', async () => {
      // Create parent folder
      const parentResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const parentId = parentResponse.body.data.id;

      // Create child folder
      await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Projects', parent_id: parentId })
        .expect(201);

      // Get tree structure
      const treeResponse = await request(app.getHttpServer())
        .get('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(treeResponse.body.data.length).toBe(1);
      expect(treeResponse.body.data[0].name).toBe('Work');
      expect(treeResponse.body.data[0].children.length).toBe(1);
      expect(treeResponse.body.data[0].children[0].name).toBe('Projects');
    });
  });

  describe('Single-Level Nesting Enforcement', () => {
    it('should allow creating folder with parent (one level)', async () => {
      const parentResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const childResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Projects', parent_id: parentResponse.body.data.id })
        .expect(201);

      expect(childResponse.body.data.parent_id).toBe(parentResponse.body.data.id);
    });

    it('should reject multi-level nesting', async () => {
      const parentResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const childResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Projects', parent_id: parentResponse.body.data.id })
        .expect(201);

      // Try to create grandchild
      const grandchildResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: '2024', parent_id: childResponse.body.data.id })
        .expect(400);

      expect(grandchildResponse.body.success).toBe(false);
      expect(grandchildResponse.body.message).toContain('one level deep');
    });

    it('should reject moving folder with children under another folder', async () => {
      const parent1Response = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const childResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Projects', parent_id: parent1Response.body.data.id })
        .expect(201);

      const parent2Response = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Personal' })
        .expect(201);

      // Try to move parent1 (which has child) under parent2
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/folders/${parent1Response.body.data.id}`)
        .set('Authorization', tenant1Token)
        .send({ parent_id: parent2Response.body.data.id })
        .expect(400);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toContain('single-level nesting');
    });
  });

  describe('Folder Deletion Cascade', () => {
    it('should move notes to root when folder deleted', async () => {
      // Create folder
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const folderId = folderResponse.body.data.id;

      // Create note in folder
      const noteResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Test Note', folder_id: folderId })
        .expect(201);

      const noteId = noteResponse.body.data.id;

      // Delete folder
      await request(app.getHttpServer())
        .delete(`/api/v1/folders/${folderId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      // Verify note moved to root
      const noteCheck = await request(app.getHttpServer())
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(noteCheck.body.data.folder_id).toBeNull();
    });

    it('should delete child folders and move their notes to root', async () => {
      // Create parent folder
      const parentResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const parentId = parentResponse.body.data.id;

      // Create child folder
      const childResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Projects', parent_id: parentId })
        .expect(201);

      const childId = childResponse.body.data.id;

      // Create note in child folder
      const noteResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Test Note', folder_id: childId })
        .expect(201);

      const noteId = noteResponse.body.data.id;

      // Delete parent folder
      await request(app.getHttpServer())
        .delete(`/api/v1/folders/${parentId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      // Verify child folder deleted
      const foldersResponse = await request(app.getHttpServer())
        .get('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(foldersResponse.body.data.length).toBe(0);

      // Verify note moved to root
      const noteCheck = await request(app.getHttpServer())
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(noteCheck.body.data.folder_id).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow tenant to see folders from other tenant', async () => {
      // Tenant 1 creates folder
      await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Tenant 1 Folder' })
        .expect(201);

      // Tenant 2 gets folders - should be empty
      const tenant2Response = await request(app.getHttpServer())
        .get('/api/v1/folders')
        .set('Authorization', tenant2Token)
        .expect(200);

      expect(tenant2Response.body.data.length).toBe(0);
    });

    it('should not allow tenant to create folder under another tenant folder', async () => {
      // Tenant 1 creates folder
      const tenant1FolderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Tenant 1 Folder' })
        .expect(201);

      // Tenant 2 tries to create child folder under tenant 1 folder
      const tenant2Response = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant2Token)
        .send({ name: 'Tenant 2 Folder', parent_id: tenant1FolderResponse.body.data.id })
        .expect(404);

      expect(tenant2Response.body.success).toBe(false);
    });

    it('should not allow tenant to update another tenant folder', async () => {
      // Tenant 1 creates folder
      const tenant1FolderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Tenant 1 Folder' })
        .expect(201);

      // Tenant 2 tries to update tenant 1 folder
      const tenant2Response = await request(app.getHttpServer())
        .patch(`/api/v1/folders/${tenant1FolderResponse.body.data.id}`)
        .set('Authorization', tenant2Token)
        .send({ name: 'Hacked Folder' })
        .expect(404);

      expect(tenant2Response.body.success).toBe(false);
    });

    it('should not allow tenant to delete another tenant folder', async () => {
      // Tenant 1 creates folder
      const tenant1FolderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Tenant 1 Folder' })
        .expect(201);

      // Tenant 2 tries to delete tenant 1 folder
      const tenant2Response = await request(app.getHttpServer())
        .delete(`/api/v1/folders/${tenant1FolderResponse.body.data.id}`)
        .set('Authorization', tenant2Token)
        .expect(404);

      expect(tenant2Response.body.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should allow folder owner to modify folder', async () => {
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'My Folder' })
        .expect(201);

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/folders/${folderResponse.body.data.id}`)
        .set('Authorization', tenant1Token)
        .send({ name: 'Updated Folder' })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Updated Folder');
    });

    it('should allow admin to modify any folder in tenant', async () => {
      // User creates folder
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'User Folder' })
        .expect(201);

      // Admin updates folder
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/folders/${folderResponse.body.data.id}`)
        .set('Authorization', adminToken)
        .send({ name: 'Admin Updated' })
        .expect(200);

      expect(updateResponse.body.data.name).toBe('Admin Updated');
    });

    it('should allow admin to delete any folder in tenant', async () => {
      // User creates folder
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'User Folder' })
        .expect(201);

      // Admin deletes folder
      await request(app.getHttpServer())
        .delete(`/api/v1/folders/${folderResponse.body.data.id}`)
        .set('Authorization', adminToken)
        .expect(200);
    });
  });

  describe('Folder Filter on Notes', () => {
    it('should filter notes by folder_id', async () => {
      // Create folder
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      const folderId = folderResponse.body.data.id;

      // Create note in folder
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Work Note', folder_id: folderId })
        .expect(201);

      // Create note without folder
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Personal Note' })
        .expect(201);

      // Filter by folder
      const folderNotesResponse = await request(app.getHttpServer())
        .get(`/api/v1/notes?folder_id=${folderId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(folderNotesResponse.body.data.length).toBe(1);
      expect(folderNotesResponse.body.data[0].title).toBe('Work Note');
    });

    it('should return notes with no folder when folder_id=root', async () => {
      // Create folder
      const folderResponse = await request(app.getHttpServer())
        .post('/api/v1/folders')
        .set('Authorization', tenant1Token)
        .send({ name: 'Work' })
        .expect(201);

      // Create note in folder
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Work Note', folder_id: folderResponse.body.data.id })
        .expect(201);

      // Create note without folder
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Personal Note' })
        .expect(201);

      // Get root notes
      const rootNotesResponse = await request(app.getHttpServer())
        .get('/api/v1/notes?folder_id=root')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(rootNotesResponse.body.data.length).toBe(1);
      expect(rootNotesResponse.body.data[0].title).toBe('Personal Note');
    });
  });
});

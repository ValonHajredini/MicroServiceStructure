import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../src/notes/entities/note.entity';
import { Folder } from '../src/folders/entities/folder.entity';

describe('Notes API (e2e)', () => {
  let app: INestApplication;
  let notesRepo: Repository<Note>;
  let foldersRepo: Repository<Folder>;

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

    notesRepo = moduleFixture.get<Repository<Note>>(getRepositoryToken(Note));
    foldersRepo = moduleFixture.get<Repository<Folder>>(getRepositoryToken(Folder));
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await notesRepo.query('DELETE FROM notes');
    await foldersRepo.query('DELETE FROM folders');
  });

  describe('Full CRUD Flow', () => {
    it('should create → read → update → delete note', async () => {
      // CREATE
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Test Note', content: 'Test Content' })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe('Test Note');
      const noteId = createResponse.body.data.id;

      // READ (single)
      const getOneResponse = await request(app.getHttpServer())
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(getOneResponse.body.success).toBe(true);
      expect(getOneResponse.body.data.id).toBe(noteId);

      // READ (list)
      const getAllResponse = await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(getAllResponse.body.success).toBe(true);
      expect(getAllResponse.body.data.length).toBeGreaterThan(0);

      // UPDATE
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .send({ title: 'Updated Title', is_pinned: true })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe('Updated Title');
      expect(updateResponse.body.data.is_pinned).toBe(true);

      // DELETE
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify deleted (should return 404)
      await request(app.getHttpServer())
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(404);
    });
  });

  describe('Tenant Isolation', () => {
    it('tenant A cannot access tenant B notes', async () => {
      // Tenant 1 creates a note
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Tenant 1 Note' })
        .expect(201);

      const noteId = createResponse.body.data.id;

      // Tenant 2 tries to access tenant 1's note
      await request(app.getHttpServer())
        .get(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant2Token)
        .expect(404);

      // Tenant 2 tries to update tenant 1's note
      await request(app.getHttpServer())
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant2Token)
        .send({ title: 'Hacked' })
        .expect(404);

      // Tenant 2 tries to delete tenant 1's note
      await request(app.getHttpServer())
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant2Token)
        .expect(404);
    });

    it('tenant B list should not include tenant A notes', async () => {
      // Tenant 1 creates notes
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Tenant 1 Note 1' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Tenant 1 Note 2' })
        .expect(201);

      // Tenant 2 creates notes
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant2Token)
        .send({ title: 'Tenant 2 Note' })
        .expect(201);

      // Tenant 2 should only see their own note
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', tenant2Token)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe('Tenant 2 Note');
    });
  });

  describe('Pagination', () => {
    it('should paginate results correctly', async () => {
      // Create 25 notes
      for (let i = 1; i <= 25; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/notes')
          .set('Authorization', tenant1Token)
          .send({ title: `Note ${i}` });
      }

      // Get page 1 (default limit 20)
      const page1 = await request(app.getHttpServer())
        .get('/api/v1/notes?page=1&limit=20')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(page1.body.data.length).toBe(20);
      expect(page1.body.meta.page).toBe(1);
      expect(page1.body.meta.total).toBe(25);
      expect(page1.body.meta.totalPages).toBe(2);

      // Get page 2
      const page2 = await request(app.getHttpServer())
        .get('/api/v1/notes?page=2&limit=20')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(page2.body.data.length).toBe(5);
      expect(page2.body.meta.page).toBe(2);
    });
  });

  describe('Soft Delete', () => {
    it('should exclude deleted notes from queries', async () => {
      // Create two notes
      const note1 = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Note 1' })
        .expect(201);

      const note2 = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Note 2' })
        .expect(201);

      const note1Id = note1.body.data.id;

      // Delete first note
      await request(app.getHttpServer())
        .delete(`/api/v1/notes/${note1Id}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      // List should only show second note
      const listResponse = await request(app.getHttpServer())
        .get('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(listResponse.body.data.length).toBe(1);
      expect(listResponse.body.data[0].title).toBe('Note 2');

      // Getting deleted note should return 404
      await request(app.getHttpServer())
        .get(`/api/v1/notes/${note1Id}`)
        .set('Authorization', tenant1Token)
        .expect(404);
    });
  });

  describe('Authorization', () => {
    it('note owner can update their note', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'My Note' })
        .expect(201);

      const noteId = createResponse.body.data.id;

      await request(app.getHttpServer())
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .send({ title: 'Updated' })
        .expect(200);
    });

    it('admin can update any note in their tenant', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'User Note' })
        .expect(201);

      const noteId = createResponse.body.data.id;

      // Admin from same tenant can update
      await request(app.getHttpServer())
        .patch(`/api/v1/notes/${noteId}`)
        .set('Authorization', adminToken)
        .send({ title: 'Admin Updated' })
        .expect(200);
    });
  });

  describe('Input Validation', () => {
    it('should reject title exceeding 500 characters', async () => {
      const longTitle = 'a'.repeat(501);

      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: longTitle })
        .expect(400);
    });

    it('should reject invalid UUID for folder_id', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({ title: 'Test', folder_id: 'invalid-uuid' })
        .expect(400);
    });
  });
});

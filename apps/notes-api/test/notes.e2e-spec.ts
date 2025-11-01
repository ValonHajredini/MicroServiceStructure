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

  describe('Full-Text Search (Story 3.5)', () => {
    beforeEach(async () => {
      // Create test notes with various content
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({
          title: 'Project Requirements Document',
          content: 'This document contains detailed requirements for the new project including functional and non-functional requirements.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({
          title: 'Meeting Notes',
          content: 'Discussed the project requirements with the team. Need to finalize the technical specifications.',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({
          title: 'Shopping List',
          content: 'Milk, bread, eggs, coffee, and some vegetables.',
        })
        .expect(201);

      // Create note for tenant 2
      await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant2Token)
        .send({
          title: 'Project Requirements',
          content: 'Tenant 2 requirements document.',
        })
        .expect(201);
    });

    it('should search notes by title match', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.data[0].title).toContain('Requirements');
      expect(response.body.meta.query).toBe('requirements');
      expect(response.body.meta.total).toBe(2);
    });

    it('should search notes by content match', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'project' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should handle multi-word queries with AND logic', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'project requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      // Should only match notes containing BOTH words
    });

    it('should return results ordered by relevance', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      const ranks = response.body.data.map((note) => note.rank);
      // Verify ranks are in descending order
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i - 1]).toBeGreaterThanOrEqual(ranks[i]);
      }
    });

    it('should generate highlighted snippets', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      const snippets = response.body.data.map((note) => note.snippet);
      // At least one snippet should contain highlighting
      const hasHighlight = snippets.some((snippet) => snippet.includes('<mark>') || snippet.includes('<b>'));
      expect(hasHighlight).toBe(true);
    });

    it('should filter search results by tenant_id', async () => {
      const tenant1Response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      const tenant2Response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant2Token)
        .expect(200);

      // Tenant 1 should have 2 matches
      expect(tenant1Response.body.data.length).toBe(2);
      // Tenant 2 should have 1 match
      expect(tenant2Response.body.data.length).toBe(1);

      // Ensure no cross-tenant results
      tenant1Response.body.data.forEach((note) => {
        expect(note.title).not.toContain('Tenant 2');
      });
    });

    it('should exclude deleted notes from search results', async () => {
      // Create a note and delete it
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/notes')
        .set('Authorization', tenant1Token)
        .send({
          title: 'Deleted Requirements Note',
          content: 'This will be deleted.',
        })
        .expect(201);

      const noteId = createResponse.body.data.id;

      // Verify it appears in search
      let searchResponse = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'deleted requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(searchResponse.body.data.length).toBeGreaterThan(0);

      // Delete the note
      await request(app.getHttpServer())
        .delete(`/api/v1/notes/${noteId}`)
        .set('Authorization', tenant1Token)
        .expect(200);

      // Verify it no longer appears in search
      searchResponse = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'deleted requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      const deletedNoteInResults = searchResponse.body.data.find((note) => note.id === noteId);
      expect(deletedNoteInResults).toBeUndefined();
    });

    it('should handle pagination correctly', async () => {
      // Page 1 with limit 2
      const page1Response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'project requirements', page: 1, limit: 2 })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(page1Response.body.data.length).toBeLessThanOrEqual(2);
      expect(page1Response.body.meta.page).toBe(1);
      expect(page1Response.body.meta.limit).toBe(2);
      expect(page1Response.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('should reject empty search query', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: '' })
        .set('Authorization', tenant1Token)
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: '   ' })
        .set('Authorization', tenant1Token)
        .expect(400);
    });

    it('should reject query with only special characters', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: '!!!@@@###' })
        .set('Authorization', tenant1Token)
        .expect(400);
    });

    it('should reject query longer than 255 characters', async () => {
      const longQuery = 'a'.repeat(256);

      await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: longQuery })
        .set('Authorization', tenant1Token)
        .expect(400);
    });

    it('should return empty array when no matches found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'nonexistentterm12345' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.totalPages).toBe(0);
    });

    it('should sanitize query by trimming whitespace', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: '  project    requirements  ' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.meta.query).toBe('project requirements');
    });

    it('should enforce maximum limit of 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'project', limit: 200 })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.meta.limit).toBe(100);
    });

    it('should include rank score in results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'requirements' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((note) => {
        expect(note.rank).toBeDefined();
        expect(typeof note.rank).toBe('number');
        expect(note.rank).toBeGreaterThan(0);
      });
    });

    it('should include all required fields in search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/notes/search')
        .query({ q: 'project' })
        .set('Authorization', tenant1Token)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((note) => {
        expect(note.id).toBeDefined();
        expect(note.title).toBeDefined();
        expect(note.snippet).toBeDefined();
        expect(note.rank).toBeDefined();
        expect(note).toHaveProperty('folder_id');
        expect(note.is_pinned).toBeDefined();
        expect(note.updated_at).toBeDefined();
      });
    });
  });
});

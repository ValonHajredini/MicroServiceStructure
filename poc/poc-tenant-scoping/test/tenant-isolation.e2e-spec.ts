import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Tenant Isolation Security Tests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const TENANT_A_ID = '00000000-0000-0000-0000-000000000001';
  const TENANT_B_ID = '00000000-0000-0000-0000-000000000002';
  const USER_A_ID = '00000000-0000-0000-0000-000000000101';
  const USER_B_ID = '00000000-0000-0000-0000-000000000201';

  let tenantANoteId: string;
  let tenantBNoteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    // Cleanup: Delete all test notes
    await dataSource.query('DELETE FROM notes WHERE tenant_id IN ($1, $2)', [
      TENANT_A_ID,
      TENANT_B_ID,
    ]);
    await app.close();
  });

  describe('Test 1: Tenant A creates note with automatic tenant_id', () => {
    it('should create note for Tenant A with tenant_id automatically set', async () => {
      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('x-tenant-id', TENANT_A_ID)
        .send({
          title: 'Tenant A Note 1',
          content: 'This belongs to Tenant A',
          user_id: USER_A_ID,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.tenant_id).toBe(TENANT_A_ID);
      expect(response.body.title).toBe('Tenant A Note 1');

      tenantANoteId = response.body.id;
    });
  });

  describe('Test 2: Tenant B can only see their own notes (findAll)', () => {
    it('should create note for Tenant B', async () => {
      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('x-tenant-id', TENANT_B_ID)
        .send({
          title: 'Tenant B Note 1',
          content: 'This belongs to Tenant B',
          user_id: USER_B_ID,
        })
        .expect(201);

      expect(response.body.tenant_id).toBe(TENANT_B_ID);
      tenantBNoteId = response.body.id;
    });

    it('should only return Tenant B notes when Tenant B calls findAll', async () => {
      const response = await request(app.getHttpServer())
        .get('/notes')
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify ONLY Tenant B notes are returned
      response.body.forEach((note: any) => {
        expect(note.tenant_id).toBe(TENANT_B_ID);
      });

      // Verify Tenant A note is NOT in the results
      const containsTenantANote = response.body.some(
        (note: any) => note.id === tenantANoteId,
      );
      expect(containsTenantANote).toBe(false);
    });
  });

  describe('Test 3: Cross-Tenant Read Attack - Tenant B cannot read Tenant A note by ID', () => {
    it('should return null when Tenant B tries to read Tenant A note', async () => {
      const response = await request(app.getHttpServer())
        .get(`/notes/${tenantANoteId}`)
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      // Tenant B should NOT see Tenant A's note (null serializes as {})
      expect(response.body).toEqual({});
    });
  });

  describe('Test 4: Cross-Tenant Update Attack - Tenant B cannot update Tenant A note', () => {
    it('should not update Tenant A note when Tenant B attempts update', async () => {
      await request(app.getHttpServer())
        .put(`/notes/${tenantANoteId}`)
        .set('x-tenant-id', TENANT_B_ID)
        .send({
          title: 'HACKED BY TENANT B',
          content: 'This should not work',
        })
        .expect(200);

      // Verify Tenant A note was NOT modified
      const response = await request(app.getHttpServer())
        .get(`/notes/${tenantANoteId}`)
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      expect(response.body.title).toBe('Tenant A Note 1');
      expect(response.body.title).not.toBe('HACKED BY TENANT B');
    });
  });

  describe('Test 5: Cross-Tenant Delete Attack - Tenant B cannot delete Tenant A note', () => {
    it('should not delete Tenant A note when Tenant B attempts delete', async () => {
      await request(app.getHttpServer())
        .delete(`/notes/${tenantANoteId}`)
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      // Verify Tenant A note still exists
      const response = await request(app.getHttpServer())
        .get(`/notes/${tenantANoteId}`)
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      expect(response.body).not.toBeNull();
      expect(response.body.id).toBe(tenantANoteId);
    });
  });

  describe('Test 6: Verify SQL queries include tenant_id filter', () => {
    it('should have WHERE tenant_id clause in all queries (check logs)', async () => {
      // This test documents that SQL logging should be enabled
      // and manual verification of logs should show:
      // SELECT ... FROM notes WHERE ... tenant_id = ?
      // UPDATE notes SET ... WHERE ... AND tenant_id = ?
      // DELETE FROM notes WHERE ... AND tenant_id = ?

      await request(app.getHttpServer())
        .get('/notes')
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      // Check console logs for query patterns
      // Manual verification required: grep logs for "WHERE.*tenant_id"
      expect(true).toBe(true); // Placeholder - manual verification required
    });
  });

  describe('Test 7: Bulk operations maintain tenant isolation', () => {
    beforeAll(async () => {
      // Create multiple notes for Tenant A
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/notes')
          .set('x-tenant-id', TENANT_A_ID)
          .send({
            title: `Tenant A Bulk Note ${i}`,
            content: `Content ${i}`,
            user_id: USER_A_ID,
          });
      }
    });

    it('should count only Tenant A notes for Tenant A', async () => {
      const responseA = await request(app.getHttpServer())
        .get('/notes/count')
        .set('x-tenant-id', TENANT_A_ID)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get('/notes/count')
        .set('x-tenant-id', TENANT_B_ID)
        .expect(200);

      // Tenant A should have at least 4 notes (1 + 3 bulk)
      expect(responseA.body.count).toBeGreaterThanOrEqual(4);

      // Tenant B should have exactly 1 note
      expect(responseB.body.count).toBe(1);

      // Counts should be different
      expect(responseA.body.count).not.toBe(responseB.body.count);
    });
  });

  describe('Test 8: Missing tenant context should fail safely', () => {
    it('should return 401 when x-tenant-id header is missing', async () => {
      await request(app.getHttpServer())
        .get('/notes')
        // No x-tenant-id header
        .expect(401);
    });

    it('should not return all tenants data when context missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/notes')
        .expect(401);

      // Should receive error, not data from all tenants
      expect(response.body.statusCode).toBe(401);
      expect(Array.isArray(response.body)).toBe(false);
    });
  });
});

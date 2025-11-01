import { BaseTenantRepository } from './base-tenant.repository';
import { Repository } from 'typeorm';

// Mock entity type
interface MockEntity {
  id: string;
  tenant_id: string;
  name: string;
}

// Concrete implementation for testing
class TestTenantRepository extends BaseTenantRepository<MockEntity> {
  constructor(repository: Repository<MockEntity>, request: any) {
    super(repository, request);
  }
}

describe('BaseTenantRepository', () => {
  let repository: TestTenantRepository;
  let mockRepository: jest.Mocked<Repository<MockEntity>>;
  let mockRequest: any;

  const TENANT_ID = 'tenant-123';
  const OTHER_TENANT_ID = 'tenant-456';

  beforeEach(() => {
    // Mock TypeORM repository
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    // Mock request with tenant context
    mockRequest = {
      tenantId: TENANT_ID,
    };

    repository = new TestTenantRepository(mockRepository, mockRequest);
  });

  describe('getTenantId', () => {
    it('should return tenant ID from request context', () => {
      const tenantId = (repository as any).getTenantId();
      expect(tenantId).toBe(TENANT_ID);
    });

    it('should throw error if tenant context is missing', () => {
      mockRequest.tenantId = undefined;
      expect(() => (repository as any).getTenantId()).toThrow(
        'Tenant context not found in request',
      );
    });
  });

  describe('addTenantScope', () => {
    it('should add tenant_id to simple WHERE clause', () => {
      const where = { name: 'test' };
      const scoped = (repository as any).addTenantScope(where);
      expect(scoped).toEqual({ name: 'test', tenant_id: TENANT_ID });
    });

    it('should add tenant_id to array of WHERE clauses', () => {
      const where = [{ name: 'test1' }, { name: 'test2' }];
      const scoped = (repository as any).addTenantScope(where);
      expect(scoped).toEqual([
        { name: 'test1', tenant_id: TENANT_ID },
        { name: 'test2', tenant_id: TENANT_ID },
      ]);
    });

    it('should handle undefined WHERE clause', () => {
      const scoped = (repository as any).addTenantScope(undefined);
      expect(scoped).toEqual({ tenant_id: TENANT_ID });
    });
  });

  describe('find', () => {
    it('should automatically add tenant_id to query', async () => {
      mockRepository.find.mockResolvedValue([]);
      await repository.find({ where: { name: 'test' } });

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { name: 'test', tenant_id: TENANT_ID },
      });
    });

    it('should work without WHERE clause', async () => {
      mockRepository.find.mockResolvedValue([]);
      await repository.find();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID },
      });
    });
  });

  describe('findOne', () => {
    it('should automatically add tenant_id to query', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await repository.findOne({ where: { name: 'test' } });

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'test', tenant_id: TENANT_ID },
      });
    });
  });

  describe('findById', () => {
    it('should find by ID with tenant scope', async () => {
      const entityId = 'entity-123';
      mockRepository.findOne.mockResolvedValue(null);
      await repository.findById(entityId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: entityId, tenant_id: TENANT_ID },
      });
    });
  });

  describe('count', () => {
    it('should automatically add tenant_id to count query', async () => {
      mockRepository.count.mockResolvedValue(5);
      const count = await repository.count({ where: { name: 'test' } });

      expect(count).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { name: 'test', tenant_id: TENANT_ID },
      });
    });
  });

  describe('save', () => {
    it('should automatically add tenant_id when saving entity', async () => {
      const entity = { id: 'entity-123', name: 'test' } as any;
      mockRepository.save.mockResolvedValue(entity);

      await repository.save(entity);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...entity,
        tenant_id: TENANT_ID,
      });
    });

    it('should prevent saving entity with different tenant_id', async () => {
      const entity = {
        id: 'entity-123',
        name: 'test',
        tenant_id: OTHER_TENANT_ID,
      } as any;
      mockRepository.save.mockResolvedValue(entity);

      await repository.save(entity);

      // Should override with current tenant
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...entity,
        tenant_id: TENANT_ID,
      });
    });
  });

  describe('saveMany', () => {
    it('should automatically add tenant_id to all entities', async () => {
      const entities = [
        { id: 'entity-1', name: 'test1' } as any,
        { id: 'entity-2', name: 'test2' } as any,
      ];
      const entitiesWithTenant = [
        { ...entities[0], tenant_id: TENANT_ID },
        { ...entities[1], tenant_id: TENANT_ID },
      ];
      mockRepository.save.mockResolvedValue(entitiesWithTenant as any);

      await repository.saveMany(entities);

      const callArg = mockRepository.save.mock.calls[0][0] as any[];
      expect(Array.isArray(callArg)).toBe(true);
      expect(callArg.length).toBe(2);
      expect(callArg[0]).toEqual({ id: 'entity-1', name: 'test1', tenant_id: TENANT_ID });
      expect(callArg[1]).toEqual({ id: 'entity-2', name: 'test2', tenant_id: TENANT_ID });
    });
  });

  describe('update', () => {
    it('should only update entity in current tenant', async () => {
      const entityId = 'entity-123';
      const updates = { name: 'updated' };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      await repository.update(entityId, updates);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: entityId, tenant_id: TENANT_ID },
        updates,
      );
    });
  });

  describe('softDelete', () => {
    it('should only soft delete entity in current tenant', async () => {
      const entityId = 'entity-123';
      mockRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await repository.softDelete(entityId);

      expect(mockRepository.softDelete).toHaveBeenCalledWith({
        id: entityId,
        tenant_id: TENANT_ID,
      });
    });
  });

  describe('delete', () => {
    it('should only delete entity in current tenant', async () => {
      const entityId = 'entity-123';
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await repository.delete(entityId);

      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: entityId,
        tenant_id: TENANT_ID,
      });
    });
  });

  describe('createQueryBuilder', () => {
    it('should create query builder with tenant scope', () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQb as any);

      repository.createQueryBuilder('entity');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('entity');
      expect(mockQb.where).toHaveBeenCalledWith('entity.tenant_id = :tenantId', {
        tenantId: TENANT_ID,
      });
    });
  });

  describe('tenant isolation enforcement', () => {
    it('should prevent cross-tenant data access in find operations', async () => {
      mockRepository.find.mockResolvedValue([]);

      // Attempt to query with different tenant_id (should be overridden)
      await repository.find({
        where: { tenant_id: OTHER_TENANT_ID } as any,
      });

      // Should enforce current tenant, not the one in the query
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenant_id: TENANT_ID },
      });
    });

    it('should prevent cross-tenant data modification', async () => {
      const entityId = 'entity-123';
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Attempt to update entity in different tenant
      await repository.update(entityId, { name: 'hacked' });

      // Should only update in current tenant
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: entityId, tenant_id: TENANT_ID },
        { name: 'hacked' },
      );
    });
  });
});

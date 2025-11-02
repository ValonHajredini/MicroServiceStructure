import { BaseTenantRepository } from "./base-tenant.repository";

describe("BaseTenantRepository", () => {
  class TestEntity {
    id!: string;
    tenant_id!: string;
  }

  class TestRepository extends BaseTenantRepository<TestEntity> {}

  const tenantId = "tenant-test";
  const repositoryMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest
      .fn()
      .mockReturnValue({ where: jest.fn().mockReturnThis() }),
  } as any;

  let repo: TestRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new TestRepository(repositoryMock, { tenantId });
  });

  it("adds tenant scope when finding entities", async () => {
    repositoryMock.find.mockResolvedValueOnce([]);
    await repo.find({ where: { id: "123" } } as any);
    expect(repositoryMock.find).toHaveBeenCalledWith({
      where: { id: "123", tenant_id: tenantId },
    });
  });

  it("sets tenant_id when saving", async () => {
    repositoryMock.save.mockImplementation(async (entity: any) => entity);
    const result = await repo.save({ id: "abc" });
    expect(result.tenant_id).toBe(tenantId);
  });

  it("throws when tenant missing", async () => {
    const repoWithoutTenant = new TestRepository(repositoryMock, {});
    await expect(repoWithoutTenant.find()).rejects.toThrow();
  });
});

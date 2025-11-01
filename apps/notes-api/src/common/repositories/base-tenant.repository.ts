import { Repository, FindOptionsWhere, FindManyOptions, FindOneOptions } from 'typeorm';
import { Injectable, Scope } from '@nestjs/common';

/**
 * Base repository that automatically enforces tenant isolation
 *
 * All queries are automatically scoped to the current tenant context.
 * This prevents accidental cross-tenant data leakage by ensuring
 * tenant_id is always included in WHERE clauses.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class NotesRepository extends BaseTenantRepository<Note> {
 *   constructor(
 *     @InjectRepository(Note) repository: Repository<Note>,
 *     @Inject(REQUEST) request: Request,
 *   ) {
 *     super(repository, request);
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.REQUEST })
export abstract class BaseTenantRepository<T extends { tenant_id: string }> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly request: any,
  ) {}

  /**
   * Get the current tenant ID from the request context
   * This is set by TenantContextMiddleware
   */
  protected getTenantId(): string {
    const tenantId = this.request.tenantId;
    if (!tenantId) {
      throw new Error('Tenant context not found in request. Ensure TenantContextMiddleware is applied.');
    }
    return tenantId;
  }

  /**
   * Automatically add tenant_id to WHERE conditions
   */
  protected addTenantScope<W extends FindOptionsWhere<T>>(where?: W | W[]): W | W[] {
    const tenantId = this.getTenantId();

    if (Array.isArray(where)) {
      return where.map(condition => ({ ...condition, tenant_id: tenantId } as W));
    }

    return { ...where, tenant_id: tenantId } as W;
  }

  /**
   * Find all entities for the current tenant
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: this.addTenantScope(options?.where),
    });
  }

  /**
   * Find one entity for the current tenant
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: this.addTenantScope(options.where),
    });
  }

  /**
   * Find entity by ID for the current tenant
   */
  async findById(id: string): Promise<T | null> {
    return this.findOne({ where: { id } as any });
  }

  /**
   * Count entities for the current tenant
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count({
      ...options,
      where: this.addTenantScope(options?.where),
    });
  }

  /**
   * Save entity with tenant_id automatically set
   */
  async save(entity: Partial<T>): Promise<T> {
    const tenantId = this.getTenantId();
    return this.repository.save({
      ...entity,
      tenant_id: tenantId,
    } as any);
  }

  /**
   * Save multiple entities with tenant_id automatically set
   */
  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const tenantId = this.getTenantId();
    return this.repository.save(
      entities.map(entity => ({
        ...entity,
        tenant_id: tenantId,
      })) as any,
    );
  }

  /**
   * Update entity for the current tenant
   */
  async update(id: string, partial: Partial<T>): Promise<void> {
    const tenantId = this.getTenantId();
    await this.repository.update(
      { id, tenant_id: tenantId } as any,
      partial as any,
    );
  }

  /**
   * Soft delete entity for the current tenant
   */
  async softDelete(id: string): Promise<void> {
    const tenantId = this.getTenantId();
    await this.repository.softDelete({ id, tenant_id: tenantId } as any);
  }

  /**
   * Hard delete entity for the current tenant
   */
  async delete(id: string): Promise<void> {
    const tenantId = this.getTenantId();
    await this.repository.delete({ id, tenant_id: tenantId } as any);
  }

  /**
   * Create query builder with tenant scope automatically applied
   */
  createQueryBuilder(alias: string) {
    const tenantId = this.getTenantId();
    return this.repository
      .createQueryBuilder(alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }
}

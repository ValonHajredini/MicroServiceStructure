import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  DeepPartial,
  SaveOptions,
  RemoveOptions,
} from 'typeorm';
import { TenantContextService } from '../tenant-context/tenant-context.service';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class TenantScopedRepository<Entity extends { tenant_id: string }> extends Repository<Entity> {
  constructor(
    private readonly tenantContext: TenantContextService,
    repository: Repository<Entity>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  private addTenantFilter(where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[] {
    const tenantId = this.tenantContext.getTenant();

    if (Array.isArray(where)) {
      return where.map(w => ({ ...w, tenant_id: tenantId } as FindOptionsWhere<Entity>));
    }

    return { ...where, tenant_id: tenantId } as FindOptionsWhere<Entity>;
  }

  async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
    const modifiedOptions: FindManyOptions<Entity> = {
      ...options,
      where: this.addTenantFilter(options?.where),
    };
    return super.find(modifiedOptions);
  }

  async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
    const modifiedOptions: FindOneOptions<Entity> = {
      ...options,
      where: this.addTenantFilter(options.where),
    };
    return super.findOne(modifiedOptions);
  }

  async findOneBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity | null> {
    return super.findOneBy(this.addTenantFilter(where));
  }

  async findBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity[]> {
    return super.findBy(this.addTenantFilter(where));
  }

  async save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
  async save<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
  async save<T extends DeepPartial<Entity>>(
    entityOrEntities: T | T[],
    options?: SaveOptions,
  ): Promise<T & Entity | (T & Entity)[]> {
    const tenantId = this.tenantContext.getTenant();

    if (Array.isArray(entityOrEntities)) {
      const entitiesWithTenant = entityOrEntities.map(e => ({ ...e, tenant_id: tenantId }));
      return super.save(entitiesWithTenant as any, options);
    }

    const entityWithTenant = { ...entityOrEntities, tenant_id: tenantId };
    return super.save(entityWithTenant as any, options);
  }

  async remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;
  async remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
  async remove(entityOrEntities: Entity | Entity[], options?: RemoveOptions): Promise<Entity | Entity[]> {
    const tenantId = this.tenantContext.getTenant();

    if (Array.isArray(entityOrEntities)) {
      const entitiesFiltered = entityOrEntities.filter(e => e.tenant_id === tenantId);
      if (entitiesFiltered.length !== entityOrEntities.length) {
        throw new Error('Cannot remove entities from different tenants');
      }
      return super.remove(entitiesFiltered, options);
    }

    if (entityOrEntities.tenant_id !== tenantId) {
      throw new Error('Cannot remove entity from different tenant');
    }
    return super.remove(entityOrEntities, options);
  }

  async update(
    criteria: FindOptionsWhere<Entity>,
    partialEntity: QueryDeepPartialEntity<Entity>,
  ): Promise<any> {
    const modifiedCriteria = this.addTenantFilter(criteria);
    return super.update(modifiedCriteria, partialEntity);
  }

  async delete(criteria: FindOptionsWhere<Entity>): Promise<any> {
    const modifiedCriteria = this.addTenantFilter(criteria);
    return super.delete(modifiedCriteria);
  }

  async count(options?: FindManyOptions<Entity>): Promise<number> {
    const modifiedOptions: FindManyOptions<Entity> = {
      ...options,
      where: this.addTenantFilter(options?.where),
    };
    return super.count(modifiedOptions);
  }
}

import {
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";

export interface TenantScopedEntity {
  tenant_id: string;
}

@Injectable({ scope: Scope.REQUEST })
export abstract class BaseTenantRepository<T extends TenantScopedEntity> {
  constructor(
    protected readonly repository: Repository<T>,
    @Inject(REQUEST) protected readonly request: any,
  ) {}

  protected getTenantId(): string {
    const tenantId = this.request?.tenantId;
    if (!tenantId) {
      throw new Error(
        "Tenant context not found in request. Ensure TenantContextMiddleware is applied.",
      );
    }
    return tenantId;
  }

  protected addTenantScope<W extends FindOptionsWhere<T>>(
    where?: W | W[],
  ): W | W[] {
    const tenantId = this.getTenantId();

    if (Array.isArray(where)) {
      return where.map(
        (condition) => ({ ...condition, tenant_id: tenantId }) as W,
      );
    }

    return { ...(where ?? {}), tenant_id: tenantId } as W;
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...options,
      where: this.addTenantScope(options?.where),
    });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({
      ...options,
      where: this.addTenantScope(options.where),
    });
  }

  async findById(id: string): Promise<T | null> {
    return this.findOne({ where: { id } as any });
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count({
      ...options,
      where: this.addTenantScope(options?.where),
    });
  }

  async save(entity: Partial<T>): Promise<T> {
    const tenant_id = this.getTenantId();
    return this.repository.save({ ...entity, tenant_id } as T);
  }

  async saveMany(entities: Partial<T>[]): Promise<T[]> {
    const tenant_id = this.getTenantId();
    return this.repository.save(
      entities.map((entity) => ({ ...entity, tenant_id })) as T[],
    );
  }

  async update(id: string, partial: Partial<T>): Promise<void> {
    const tenant_id = this.getTenantId();
    await this.repository.update({ id, tenant_id } as any, partial);
  }

  async softDelete(id: string): Promise<void> {
    const tenant_id = this.getTenantId();
    await this.repository.softDelete({ id, tenant_id } as any);
  }

  async delete(id: string): Promise<void> {
    const tenant_id = this.getTenantId();
    await this.repository.delete({ id, tenant_id } as any);
  }

  createQueryBuilder(alias: string) {
    const tenantId = this.getTenantId();
    return this.repository
      .createQueryBuilder(alias)
      .where(`${alias}.tenant_id = :tenantId`, { tenantId });
  }
}

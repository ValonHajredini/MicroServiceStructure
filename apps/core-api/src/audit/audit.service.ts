import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogsRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<AuditLog> {
    const auditLog = this.auditLogsRepository.create({
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      metadata: entry.metadata,
    });

    return this.auditLogsRepository.save(auditLog);
  }

  async getAuditLogs(tenantId: string, filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    const queryBuilder = this.auditLogsRepository
      .createQueryBuilder('audit')
      .where('audit.tenant_id = :tenantId', { tenantId });

    if (filters?.entityType) {
      queryBuilder.andWhere('audit.entity_type = :entityType', {
        entityType: filters.entityType,
      });
    }

    if (filters?.entityId) {
      queryBuilder.andWhere('audit.entity_id = :entityId', {
        entityId: filters.entityId,
      });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('audit.user_id = :userId', {
        userId: filters.userId,
      });
    }

    return queryBuilder
      .orderBy('audit.created_at', 'DESC')
      .limit(filters?.limit || 100)
      .getMany();
  }
}

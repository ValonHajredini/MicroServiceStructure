import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenant_id: string;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column()
  action: string;

  @Column()
  entity_type: string;

  @Column({ name: 'entity_id' })
  entity_id: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}

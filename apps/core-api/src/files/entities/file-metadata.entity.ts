import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('file_metadata')
@Index(['tenantId'])
@Index(['uploadedByUserId'])
@Index(['service'])
@Index(['status'])
export class FileMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId: string;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  @Index()
  uploadedByUserId: string;

  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string;

  @Column({ name: 'storage_url', type: 'text', nullable: true })
  storageUrl: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  service: string;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  @Index()
  status: 'pending' | 'active' | 'deleted';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;
}

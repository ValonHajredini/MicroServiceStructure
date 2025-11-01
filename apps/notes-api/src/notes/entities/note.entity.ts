import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Folder } from '../../folders/entities/folder.entity';
import { Attachment } from './attachment.entity';

@Entity('notes')
@Index('idx_notes_tenant_id', ['tenant_id'])
@Index('idx_notes_user_id', ['user_id'])
@Index('idx_notes_folder_id', ['folder_id'])
@Index('idx_notes_is_pinned', ['is_pinned'])
@Index('idx_notes_deleted_at', ['deleted_at'])
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'uuid', nullable: true })
  folder_id: string;

  @Column({ type: 'boolean', default: false })
  is_pinned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Folder, (folder) => folder.notes, { nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @OneToMany(() => Attachment, (attachment) => attachment.note)
  attachments: Attachment[];
}

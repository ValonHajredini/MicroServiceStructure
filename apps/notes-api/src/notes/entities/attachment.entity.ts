import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Note } from './note.entity';

@Entity('attachments')
@Index('idx_attachments_tenant_id', ['tenant_id'])
@Index('idx_attachments_note_id', ['note_id'])
@Index('idx_attachments_file_id', ['file_id'])
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  note_id: string;

  /**
   * Logical foreign key to core_db.file_metadata
   * This is NOT enforced by the database due to cross-database reference
   * Must be validated at application level
   */
  @Column('uuid')
  file_id: string;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  // Relationship with Note entity (cascade on delete)
  @ManyToOne(() => Note, (note) => note.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'note_id' })
  note: Note;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { TaskEntity } from "./task.entity";

export enum CommentStatus {
  ACTIVE = "active",
  DELETED = "deleted",
}

@Entity({ name: "task_comments" })
@Index("idx_task_comments_tenant_id", ["tenant_id"])
@Index("idx_task_comments_task_id", ["task_id"])
@Index("idx_task_comments_user_id", ["user_id"])
@Index("idx_task_comments_status", ["status"])
export class TaskCommentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  task_id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({ type: "text" })
  content!: string;

  @Column({
    type: "varchar",
    length: 20,
    default: CommentStatus.ACTIVE,
  })
  status!: CommentStatus;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => TaskEntity, (task) => task.comments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task!: TaskEntity;
}

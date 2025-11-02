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

@Entity({ name: "task_comments" })
@Index("idx_task_comments_tenant_id", ["tenant_id"])
@Index("idx_task_comments_task_id", ["task_id"])
@Index("idx_task_comments_user_id", ["user_id"])
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

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TaskEntity } from "./task.entity";

export enum TaskActionType {
  CREATED = "created",
  ASSIGNED = "assigned",
  MOVED = "moved",
  COMPLETED = "completed",
  UPDATED = "updated",
}

@Entity({ name: "task_activities" })
@Index("idx_task_activities_tenant_id", ["tenant_id"])
@Index("idx_task_activities_task_id", ["task_id"])
@Index("idx_task_activities_created_at", ["created_at"])
export class TaskActivityEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  task_id!: string;

  @Column({ type: "uuid" })
  user_id!: string;

  @Column({
    type: "enum",
    enum: TaskActionType,
  })
  action_type!: TaskActionType;

  @Column({ type: "text", nullable: true })
  old_value?: string | null;

  @Column({ type: "text", nullable: true })
  new_value?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @ManyToOne(() => TaskEntity, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task!: TaskEntity;
}

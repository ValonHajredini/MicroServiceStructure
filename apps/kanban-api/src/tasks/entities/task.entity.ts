import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { BoardEntity } from "../../boards/entities/board.entity";
import { TaskCommentEntity } from "./task-comment.entity";

export enum TaskPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

@Entity({ name: "tasks" })
@Index("idx_tasks_tenant_id", ["tenant_id"])
@Index("idx_tasks_column_id", ["column_id"])
@Index("idx_tasks_board_id", ["board_id"])
@Index("idx_tasks_assigned_to", ["assigned_to"])
@Index("idx_tasks_column_position", ["column_id", "position"])
export class TaskEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  column_id!: string;

  @Column({ type: "uuid" })
  board_id!: string;

  @Column({ type: "varchar", length: 500 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "uuid", nullable: true })
  assigned_to?: string | null;

  @Column({
    type: "enum",
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: "timestamp with time zone", nullable: true })
  due_date?: Date | null;

  @Column({ type: "integer" })
  position!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => ColumnEntity, (column) => column.tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "column_id" })
  column!: ColumnEntity;

  @ManyToOne(() => BoardEntity, (board) => board.tasks, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "board_id" })
  board!: BoardEntity;

  @OneToMany(() => TaskCommentEntity, (comment) => comment.task, {
    cascade: false,
  })
  comments?: TaskCommentEntity[];
}

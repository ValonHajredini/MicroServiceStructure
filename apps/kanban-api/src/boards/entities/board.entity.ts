import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { TaskEntity } from "../../tasks/entities/task.entity";

export enum BoardStatus {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DELETED = "deleted",
}

@Entity({ name: "boards" })
@Index("idx_boards_tenant_id", ["tenant_id"])
@Index("idx_boards_owner_id", ["owner_id"])
@Index("idx_boards_status", ["status"])
export class BoardEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  owner_id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: BoardStatus.ACTIVE,
  })
  status!: BoardStatus;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @OneToMany(() => ColumnEntity, (column) => column.board, {
    cascade: false,
  })
  columns?: ColumnEntity[];

  @OneToMany(() => TaskEntity, (task) => task.board, {
    cascade: false,
  })
  tasks?: TaskEntity[];
}

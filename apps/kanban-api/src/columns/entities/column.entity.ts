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
import { BoardEntity } from "../../boards/entities/board.entity";
import { TaskEntity } from "../../tasks/entities/task.entity";

@Entity({ name: "columns" })
@Index("idx_columns_tenant_id", ["tenant_id"])
@Index("idx_columns_board_id", ["board_id"])
@Index("idx_columns_board_position", ["board_id", "position"])
export class ColumnEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenant_id!: string;

  @Column({ type: "uuid" })
  board_id!: string;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "integer" })
  position!: number;

  @Column({ type: "integer", nullable: true })
  wip_limit?: number | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @ManyToOne(() => BoardEntity, (board) => board.columns, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "board_id" })
  board!: BoardEntity;

  @OneToMany(() => TaskEntity, (task) => task.column, {
    cascade: false,
  })
  tasks?: TaskEntity[];
}

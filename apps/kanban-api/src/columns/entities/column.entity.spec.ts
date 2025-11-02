import "reflect-metadata";
import { getMetadataArgsStorage } from "typeorm";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import { ColumnEntity } from "./column.entity";
import { BoardEntity } from "../../boards/entities/board.entity";
import { TaskEntity } from "../../tasks/entities/task.entity";

describe("ColumnEntity", () => {
  it("should map to columns table with expected indexes", () => {
    const table = getMetadataArgsStorage().tables.find(
      (t) => t.target === ColumnEntity,
    );
    expect(table).toBeDefined();
    expect(table?.name).toBe("columns");

    const indices = getMetadataArgsStorage().indices.filter(
      (idx) => idx.target === ColumnEntity,
    );
    const indexNames = indices.map((idx) => idx.name);
    expect(indexNames).toEqual(
      expect.arrayContaining([
        "idx_columns_tenant_id",
        "idx_columns_board_id",
        "idx_columns_board_position",
      ]),
    );
  });

  it("should define board and task relationships", () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (rel) => rel.target === ColumnEntity,
    );
    const resolver = (rel?: RelationMetadataArgs) =>
      (rel && typeof rel.type === "function"
        ? rel.type()
        : rel?.type) as unknown;
    expect(
      resolver(relations.find((rel) => rel.propertyName === "board")),
    ).toBe(BoardEntity);
    expect(
      resolver(relations.find((rel) => rel.propertyName === "tasks")),
    ).toBe(TaskEntity);
  });
});

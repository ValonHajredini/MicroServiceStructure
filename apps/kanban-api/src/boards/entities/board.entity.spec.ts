import "reflect-metadata";
import { getMetadataArgsStorage } from "typeorm";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import { BoardEntity, BoardStatus } from "./board.entity";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { TaskEntity } from "../../tasks/entities/task.entity";

describe("BoardEntity", () => {
  it("should map to boards table", () => {
    const table = getMetadataArgsStorage().tables.find(
      (t) => t.target === BoardEntity,
    );
    expect(table).toBeDefined();
    expect(table?.name).toBe("boards");
  });

  it("should define expected columns", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (col) => col.target === BoardEntity,
    );
    const columnNames = columns.map(
      (col) => col.options.name ?? col.propertyName,
    );
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "tenant_id",
        "owner_id",
        "name",
        "description",
        "status",
        "created_at",
        "updated_at",
      ]),
    );
  });

  it("should define relationships", () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (rel) => rel.target === BoardEntity,
    );
    const relationTypes = relations.map((rel) => rel.propertyName);
    expect(relationTypes).toEqual(expect.arrayContaining(["columns", "tasks"]));
    const resolver = (rel?: RelationMetadataArgs) =>
      (rel && typeof rel.type === "function"
        ? rel.type()
        : rel?.type) as unknown;
    expect(
      resolver(relations.find((rel) => rel.propertyName === "columns")),
    ).toBe(ColumnEntity);
    expect(
      resolver(relations.find((rel) => rel.propertyName === "tasks")),
    ).toBe(TaskEntity);
  });

  it("should use status enum defaults", () => {
    const board = new BoardEntity();
    board.status = BoardStatus.ACTIVE;
    expect(board.status).toBe(BoardStatus.ACTIVE);
  });
});

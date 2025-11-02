import "reflect-metadata";
import { getMetadataArgsStorage } from "typeorm";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import { TaskEntity, TaskPriority } from "./task.entity";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { BoardEntity } from "../../boards/entities/board.entity";
import { TaskCommentEntity } from "./task-comment.entity";

describe("TaskEntity", () => {
  it("should map to tasks table with enum priority", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (col) => col.target === TaskEntity,
    );
    const priorityColumn = columns.find(
      (col) => col.propertyName === "priority",
    );
    expect(priorityColumn?.options.type).toBe("enum");
    expect(priorityColumn?.options.enum).toEqual(TaskPriority);
  });

  it("should configure relationships", () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (rel) => rel.target === TaskEntity,
    );
    const resolver = (rel?: RelationMetadataArgs) =>
      (rel && typeof rel.type === "function"
        ? rel.type()
        : rel?.type) as unknown;
    expect(
      resolver(relations.find((rel) => rel.propertyName === "column")),
    ).toBe(ColumnEntity);
    expect(
      resolver(relations.find((rel) => rel.propertyName === "board")),
    ).toBe(BoardEntity);
    expect(
      resolver(relations.find((rel) => rel.propertyName === "comments")),
    ).toBe(TaskCommentEntity);
  });
});

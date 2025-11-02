import "reflect-metadata";
import { getMetadataArgsStorage } from "typeorm";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import { TaskCommentEntity } from "./task-comment.entity";
import { TaskEntity } from "./task.entity";

describe("TaskCommentEntity", () => {
  it("should map to task_comments table and link to task", () => {
    const table = getMetadataArgsStorage().tables.find(
      (t) => t.target === TaskCommentEntity,
    );
    expect(table?.name).toBe("task_comments");

    const relations = getMetadataArgsStorage().relations.filter(
      (rel) => rel.target === TaskCommentEntity,
    );
    const resolver = (rel?: RelationMetadataArgs) =>
      (rel && typeof rel.type === "function"
        ? rel.type()
        : rel?.type) as unknown;
    expect(resolver(relations.find((rel) => rel.propertyName === "task"))).toBe(
      TaskEntity,
    );
  });
});

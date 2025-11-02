import { InitialKanbanSchema1715731200000 } from "./1715731200000-InitialKanbanSchema";

describe("InitialKanbanSchema migration", () => {
  const migration = new InitialKanbanSchema1715731200000();

  it("should create core tables on up", async () => {
    const query = jest.fn();
    await migration.up({ query } as any);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS "boards"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS "columns"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS "tasks"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS "task_comments"'),
    );
  });

  it("should drop core tables on down", async () => {
    const query = jest.fn();
    await migration.down({ query } as any);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP TABLE IF EXISTS "task_comments"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP TABLE IF EXISTS "tasks"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP TABLE IF EXISTS "columns"'),
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('DROP TABLE IF EXISTS "boards"'),
    );
  });
});

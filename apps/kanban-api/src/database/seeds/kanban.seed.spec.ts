import { seedKanbanData } from "./kanban.seed";
import { BoardEntity } from "../../boards/entities/board.entity";
import { ColumnEntity } from "../../columns/entities/column.entity";
import { TaskEntity } from "../../tasks/entities/task.entity";
import { TaskCommentEntity } from "../../tasks/entities/task-comment.entity";

const repoMocks: Record<string, { delete: jest.Mock; save: jest.Mock }> = {};

jest.mock("../data-source", () => {
  return {
    __esModule: true,
    default: {
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
      getRepository: jest.fn().mockImplementation((entity: any) => {
        const name = entity.name ?? entity.constructor.name;
        if (!repoMocks[name]) {
          repoMocks[name] = {
            delete: jest.fn().mockResolvedValue(undefined),
            save: jest
              .fn()
              .mockImplementation(async (records: any[]) => records),
          };
        }
        return repoMocks[name];
      }),
    },
  } as const;
});

const dataSourceModule = jest.requireMock("../data-source");
const dataSource = dataSourceModule.default as {
  initialize: jest.Mock;
  destroy: jest.Mock;
  getRepository: jest.Mock;
};

describe("Kanban seed script", () => {
  beforeEach(() => {
    Object.values(repoMocks).forEach((repo) => {
      repo.delete.mockClear();
      repo.save.mockClear();
    });
    dataSource.initialize.mockClear();
    dataSource.destroy.mockClear();
  });

  it("should insert boards, columns, tasks, and comments", async () => {
    await seedKanbanData();

    expect(dataSource.initialize).toHaveBeenCalled();
    expect(repoMocks[BoardEntity.name].delete).toHaveBeenCalled();
    expect(repoMocks[BoardEntity.name].save).toHaveBeenCalled();
    expect(repoMocks[ColumnEntity.name].save).toHaveBeenCalled();
    expect(repoMocks[TaskEntity.name].save).toHaveBeenCalled();
    expect(repoMocks[TaskCommentEntity.name].save).toHaveBeenCalled();
    expect(dataSource.destroy).toHaveBeenCalled();
  });
});

import { Test, TestingModule } from "@nestjs/testing";
import { TaskActivityService } from "./task-activity.service";
import { TaskActivityRepository } from "./repositories/task-activity.repository";
import {
  TaskActivityEntity,
  TaskActionType,
} from "./entities/task-activity.entity";

describe("TaskActivityService", () => {
  let service: TaskActivityService;
  let activityRepository: jest.Mocked<TaskActivityRepository>;

  const mockActivity: TaskActivityEntity = {
    id: "activity-uuid",
    tenant_id: "tenant-uuid",
    task_id: "task-uuid",
    user_id: "user-uuid",
    action_type: TaskActionType.CREATED,
    old_value: null,
    new_value: null,
    created_at: new Date(),
  } as TaskActivityEntity;

  beforeEach(async () => {
    const mockActivityRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskActivityService,
        {
          provide: TaskActivityRepository,
          useValue: mockActivityRepository,
        },
      ],
    }).compile();

    service = module.get<TaskActivityService>(TaskActivityService);
    activityRepository = module.get(TaskActivityRepository);
  });

  describe("logActivity", () => {
    it("should create activity record", async () => {
      activityRepository.save.mockResolvedValue(mockActivity);

      const result = await service.logActivity(
        "task-uuid",
        TaskActionType.CREATED,
        "user-uuid",
        "tenant-uuid",
      );

      expect(activityRepository.save).toHaveBeenCalledWith({
        task_id: "task-uuid",
        user_id: "user-uuid",
        action_type: TaskActionType.CREATED,
        old_value: null,
        new_value: null,
      });
      expect(result).toEqual(mockActivity);
    });

    it("should create activity record with old and new values", async () => {
      const activityWithValues = {
        ...mockActivity,
        action_type: TaskActionType.MOVED,
        old_value: "To Do",
        new_value: "In Progress",
      };

      activityRepository.save.mockResolvedValue(
        activityWithValues as TaskActivityEntity,
      );

      const result = await service.logActivity(
        "task-uuid",
        TaskActionType.MOVED,
        "user-uuid",
        "tenant-uuid",
        "To Do",
        "In Progress",
      );

      expect(activityRepository.save).toHaveBeenCalledWith({
        task_id: "task-uuid",
        user_id: "user-uuid",
        action_type: TaskActionType.MOVED,
        old_value: "To Do",
        new_value: "In Progress",
      });
      expect(result.old_value).toBe("To Do");
      expect(result.new_value).toBe("In Progress");
    });
  });

  describe("findAllByTask", () => {
    it("should return ordered activities (DESC)", async () => {
      const activities = [
        {
          ...mockActivity,
          id: "activity-1",
          created_at: new Date("2025-01-02"),
        },
        {
          ...mockActivity,
          id: "activity-2",
          created_at: new Date("2025-01-01"),
        },
      ];

      activityRepository.find.mockResolvedValue(
        activities as TaskActivityEntity[],
      );

      const result = await service.findAllByTask("task-uuid", "tenant-uuid");

      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { task_id: "task-uuid" } as any,
        order: { created_at: "DESC" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("activity-1"); // Newest first
    });
  });
});

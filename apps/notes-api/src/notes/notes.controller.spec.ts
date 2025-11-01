import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { AttachmentsService } from './attachments.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Note } from './entities/note.entity';

describe('NotesController', () => {
  let controller: NotesController;
  let service: NotesService;

  const mockUser: JwtPayload = {
    sub: 'user-001',
    email: 'test@example.com',
    tenantId: 'tenant-001',
    roles: ['user'],
    enabledServices: ['notes'],
  };

  const mockNote: Partial<Note> = {
    id: 'note-001',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    title: 'Test Note',
    content: 'Test content',
    is_pinned: false,
  };

  const mockNotesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    search: jest.fn(),
  };

  beforeEach(async () => {
    const mockAttachmentsService = {
      create: jest.fn(),
      delete: jest.fn(),
      findByNote: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        {
          provide: NotesService,
          useValue: mockNotesService,
        },
        {
          provide: AttachmentsService,
          useValue: mockAttachmentsService,
        },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
    service = module.get<NotesService>(NotesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create note (response formatting handled by interceptor)', async () => {
      const createDto: CreateNoteDto = {
        title: 'New Note',
        content: 'Content',
      };
      mockNotesService.create.mockResolvedValue(mockNote);

      const result = await controller.create(createDto, mockUser);

      expect(result).toBe(mockNote as any);
      expect(service.create).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return paginated notes (response formatting handled by interceptor)', async () => {
      const paginatedResult = {
        data: [mockNote],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockNotesService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(mockUser, 1, 20);

      expect(result).toBe(paginatedResult as any);
      expect(result.data.length).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      const paginatedResult = {
        data: [mockNote],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockNotesService.findAll.mockResolvedValue(paginatedResult);

      await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser, {
        page: 1,
        limit: 20,
        folder_id: undefined,
      });
    });

    it('should filter by folder_id when provided', async () => {
      const paginatedResult = {
        data: [mockNote],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockNotesService.findAll.mockResolvedValue(paginatedResult);

      await controller.findAll(mockUser, 1, 20, 'folder-001');

      expect(service.findAll).toHaveBeenCalledWith(mockUser, {
        page: 1,
        limit: 20,
        folder_id: 'folder-001',
      });
    });
  });

  describe('findOne', () => {
    it('should return single note (response formatting handled by interceptor)', async () => {
      mockNotesService.findOne.mockResolvedValue(mockNote);

      const result = await controller.findOne('note-001', mockUser);

      expect(result).toBe(mockNote as any);
      expect(service.findOne).toHaveBeenCalledWith('note-001', mockUser, undefined);
    });
  });

  describe('update', () => {
    it('should update note (response formatting handled by interceptor)', async () => {
      const updateDto: UpdateNoteDto = { title: 'Updated Title' };
      const updatedNote = { ...mockNote, ...updateDto };
      mockNotesService.update.mockResolvedValue(updatedNote);

      const result = await controller.update('note-001', updateDto, mockUser);

      expect(result).toBe(updatedNote as any);
      expect(result.title).toBe('Updated Title');
      expect(service.update).toHaveBeenCalledWith(
        'note-001',
        updateDto,
        mockUser,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete note (response formatting handled by interceptor)', async () => {
      mockNotesService.softDelete.mockResolvedValue(undefined);

      const result = await controller.remove('note-001', mockUser);

      expect(result).toEqual({ message: 'Note deleted successfully' });
      expect(service.softDelete).toHaveBeenCalledWith('note-001', mockUser);
    });
  });

  describe('search', () => {
    // Story 3.5 - Task 12: Controller unit tests for search endpoint

    const mockSearchResponse = {
      data: [
        {
          id: 'note-001',
          title: 'Project Requirements',
          snippet: '...detailed <mark>requirements</mark>...',
          rank: 0.9,
          folder_id: 'folder-001',
          is_pinned: false,
          updated_at: new Date('2025-10-29T10:00:00Z'),
        },
      ],
      meta: {
        query: 'requirements',
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    it('should return search results (response formatting handled by interceptor)', async () => {
      const searchDto = { q: 'requirements', page: 1, limit: 20 };
      mockNotesService.search.mockResolvedValue(mockSearchResponse);

      const result = await controller.search(searchDto, mockUser);

      expect(result).toBe(mockSearchResponse as any);
      expect(service.search).toHaveBeenCalledWith('requirements', 'tenant-001', {
        page: 1,
        limit: 20,
      });
    });

    it('should use default pagination for search', async () => {
      const searchDto = { q: 'test' };
      mockNotesService.search.mockResolvedValue({
        data: [],
        meta: { query: 'test', page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await controller.search(searchDto as any, mockUser);

      expect(service.search).toHaveBeenCalledWith('test', 'tenant-001', {
        page: undefined,
        limit: undefined,
      });
    });

    it('should pass custom pagination to search', async () => {
      const searchDto = { q: 'test', page: 2, limit: 50 };
      mockNotesService.search.mockResolvedValue({
        data: [],
        meta: { query: 'test', page: 2, limit: 50, total: 0, totalPages: 0 },
      });

      await controller.search(searchDto, mockUser);

      expect(service.search).toHaveBeenCalledWith('test', 'tenant-001', {
        page: 2,
        limit: 50,
      });
    });

    it('should extract tenantId from JWT', async () => {
      const searchDto = { q: 'requirements', page: 1, limit: 20 };
      mockNotesService.search.mockResolvedValue(mockSearchResponse);

      await controller.search(searchDto, mockUser);

      const callArgs = (service.search as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('requirements');
      expect(callArgs[1]).toBe('tenant-001');
      expect(callArgs[2]).toBeDefined();
    });
  });
});

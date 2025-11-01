import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { AttachmentsService } from './attachments.service';
import { Note } from './entities/note.entity';
import { Attachment } from './entities/attachment.entity';
import { FilesClientService } from '../files/files-client.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

describe('AttachmentsService', () => {
  let service: AttachmentsService;
  let notesRepo: jest.Mocked<Repository<Note>>;
  let attachmentsRepo: jest.Mocked<Repository<Attachment>>;
  let filesClientService: jest.Mocked<FilesClientService>;

  const mockUser: JwtPayload = {
    sub: 'user-001',
    email: 'user@test.com',
    tenantId: 'tenant-001',
    roles: ['user'],
    enabledServices: ['notes'],
  };

  const mockAdminUser: JwtPayload = {
    ...mockUser,
    sub: 'admin-001',
    roles: ['admin'],
  };

  const mockNote: Partial<Note> = {
    id: 'note-001',
    tenant_id: 'tenant-001',
    user_id: 'user-001',
    title: 'Test Note',
    deleted_at: null,
  };

  const mockAttachment = {
    id: 'attachment-001',
    tenant_id: 'tenant-001',
    note_id: 'note-001',
    file_id: 'file-001',
    deleted_at: null,
    created_at: new Date(),
    note: null,
  } as Attachment;

  const mockFileMetadata: any = {
    id: 'file-001',
    tenant_id: 'tenant-001',
    filename: 'test.pdf',
    file_size: 1024000, // ~1MB
    mime_type: 'application/pdf',
    storage_url: 'https://storage.example.com/file-001',
  };

  beforeEach(async () => {
    const mockNotesRepo = {
      findOne: jest.fn(),
    };

    const mockAttachmentsRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockFilesClient = {
      getFileMetadata: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentsService,
        {
          provide: getRepositoryToken(Note),
          useValue: mockNotesRepo,
        },
        {
          provide: getRepositoryToken(Attachment),
          useValue: mockAttachmentsRepo,
        },
        {
          provide: FilesClientService,
          useValue: mockFilesClient,
        },
      ],
    }).compile();

    service = module.get<AttachmentsService>(AttachmentsService);
    notesRepo = module.get(getRepositoryToken(Note));
    attachmentsRepo = module.get(getRepositoryToken(Attachment));
    filesClientService = module.get(FilesClientService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create attachment successfully', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(filesClientService, 'getFileMetadata').mockResolvedValue(mockFileMetadata);
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);
      jest.spyOn(attachmentsRepo, 'create').mockReturnValue(mockAttachment);
      jest.spyOn(attachmentsRepo, 'save').mockResolvedValue(mockAttachment);

      const result = await service.create(
        'note-001',
        'file-001',
        mockUser,
        'mock-token',
      );

      expect(result.id).toBe(mockAttachment.id);
      expect(notesRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: 'note-001',
          tenant_id: 'tenant-001',
          deleted_at: IsNull(),
        },
      });
      expect(filesClientService.getFileMetadata).toHaveBeenCalledWith(
        'file-001',
        'mock-token',
      );
      expect(attachmentsRepo.create).toHaveBeenCalledWith({
        tenant_id: 'tenant-001',
        note_id: 'note-001',
        file_id: 'file-001',
      });
    });

    it('should throw NotFoundException if note does not exist', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.create('note-001', 'file-001', mockUser, 'mock-token');
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should throw ForbiddenException if user is not note owner or admin', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);

      try {
        await service.create('note-001', 'file-001', mockUser, 'mock-token');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow admin to create attachment on any note', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);
      jest.spyOn(filesClientService, 'getFileMetadata').mockResolvedValue(mockFileMetadata);
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);
      jest.spyOn(attachmentsRepo, 'create').mockReturnValue(mockAttachment);
      jest.spyOn(attachmentsRepo, 'save').mockResolvedValue(mockAttachment);

      const result = await service.create(
        'note-001',
        'file-001',
        mockAdminUser,
        'mock-token',
      );

      expect(result.id).toBe(mockAttachment.id);
    });

    it('should throw ForbiddenException if file does not belong to same tenant', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(filesClientService, 'getFileMetadata').mockResolvedValue({
        ...mockFileMetadata,
        tenant_id: 'other-tenant',
      });

      try {
        await service.create('note-001', 'file-001', mockUser, 'mock-token');
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should throw BadRequestException if file exceeds 25MB', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(filesClientService, 'getFileMetadata').mockResolvedValue({
        ...mockFileMetadata,
        file_size: 26 * 1024 * 1024, // 26MB
      });
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);

      try {
        await service.create('note-001', 'file-001', mockUser, 'mock-token');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw BadRequestException if total size would exceed 100MB', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(filesClientService, 'getFileMetadata')
        .mockResolvedValueOnce({
          ...mockFileMetadata,
          file_size: 50 * 1024 * 1024, // 50MB for new file
        })
        .mockResolvedValueOnce({
          ...mockFileMetadata,
          file_size: 60 * 1024 * 1024, // 60MB for existing attachment
        });
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([
        { ...mockAttachment, file_id: 'file-002' } as Attachment,
      ]);

      try {
        await service.create('note-001', 'file-001', mockUser, 'mock-token');
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('findByNote', () => {
    it('should return all active attachments for a note', async () => {
      const mockAttachments = [mockAttachment, { ...mockAttachment, id: 'attachment-002' } as Attachment];
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue(mockAttachments);

      const result = await service.findByNote('note-001');

      expect(result.length).toBe(2);
      expect(attachmentsRepo.find).toHaveBeenCalledWith({
        where: {
          note_id: 'note-001',
          deleted_at: IsNull(),
        },
        order: {
          created_at: 'ASC',
        },
      });
    });

    it('should return empty array if no attachments', async () => {
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);

      const result = await service.findByNote('note-001');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete attachment successfully', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(attachmentsRepo, 'findOne').mockResolvedValue(mockAttachment);
      jest.spyOn(attachmentsRepo, 'delete').mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.delete('note-001', 'attachment-001', mockUser);

      expect(attachmentsRepo.delete).toHaveBeenCalledWith('attachment-001');
    });

    it('should throw NotFoundException if note does not exist', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.delete('note-001', 'attachment-001', mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });

    it('should throw ForbiddenException if user is not note owner or admin', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);

      try {
        await service.delete('note-001', 'attachment-001', mockUser);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow admin to delete attachment from any note', async () => {
      const otherUserNote = { ...mockNote, user_id: 'other-user' };
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(otherUserNote as Note);
      jest.spyOn(attachmentsRepo, 'findOne').mockResolvedValue(mockAttachment);
      jest.spyOn(attachmentsRepo, 'delete').mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.delete('note-001', 'attachment-001', mockAdminUser);

      expect(attachmentsRepo.delete).toHaveBeenCalledWith('attachment-001');
    });

    it('should throw NotFoundException if attachment does not exist', async () => {
      jest.spyOn(notesRepo, 'findOne').mockResolvedValue(mockNote as Note);
      jest.spyOn(attachmentsRepo, 'findOne').mockResolvedValue(null);

      try {
        await service.delete('note-001', 'attachment-001', mockUser);
        fail('Should have thrown NotFoundException');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('validateAttachmentSize', () => {
    it('should pass validation for small file with no existing attachments', async () => {
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);

      await service.validateAttachmentSize('note-001', 1024000, 'mock-token');
      // No assertion needed - test passes if no exception is thrown
    });

    it('should throw BadRequestException if file exceeds 25MB', async () => {
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([]);

      try {
        await service.validateAttachmentSize(
          'note-001',
          26 * 1024 * 1024,
          'mock-token',
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should throw BadRequestException if total would exceed 100MB', async () => {
      jest.spyOn(filesClientService, 'getFileMetadata').mockResolvedValue({
        ...mockFileMetadata,
        file_size: 60 * 1024 * 1024, // 60MB existing
      });
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([
        { ...mockAttachment, file_id: 'file-002' } as Attachment,
      ]);

      try {
        await service.validateAttachmentSize(
          'note-001',
          50 * 1024 * 1024, // 50MB new
          'mock-token',
        );
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });

    it('should handle Core Service errors gracefully and skip unavailable files', async () => {
      jest.spyOn(filesClientService, 'getFileMetadata').mockRejectedValue(
        new Error('Service unavailable'),
      );
      jest.spyOn(attachmentsRepo, 'find').mockResolvedValue([
        { ...mockAttachment, file_id: 'file-002' } as Attachment,
      ]);

      // Should not throw because unavailable file is skipped
      await service.validateAttachmentSize('note-001', 1024000, 'mock-token');
      // No assertion needed - test passes if no exception is thrown
    });
  });
});

/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { Invitation } from './entities/invitation.entity';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockInvitationsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockUsersRepository = {
    findOne: jest.fn(),
  };

  const mockEmailService = {
    sendInvitationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        {
          provide: getRepositoryToken(Invitation),
          useValue: mockInvitationsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvitation', () => {
    const tenantId = 'tenant-123';
    const invitedByUserId = 'user-456';
    const createDto: CreateInvitationDto = {
      email: 'newuser@example.com',
      role: 'user',
    };

    it('should successfully create an invitation with valid data', async () => {
      const mockInvitation = {
        id: 'invitation-789',
        tenant_id: tenantId,
        email: createDto.email,
        role: createDto.role,
        token: 'generated-token',
        expires_at: new Date(),
        invited_by_user_id: invitedByUserId,
        status: 'pending',
      };

      const mockInvitationWithRelations = {
        ...mockInvitation,
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockUsersRepository.findOne.mockResolvedValue(null); // No existing user
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null) // No pending invitation
        .mockResolvedValueOnce(mockInvitationWithRelations); // Return with relations
      mockInvitationsRepository.create.mockReturnValue(mockInvitation);
      mockInvitationsRepository.save.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue(true);

      const result = await service.createInvitation(
        createDto,
        tenantId,
        invitedByUserId,
      );

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createDto.email,
          tenant_id: tenantId,
        },
      });
      expect(mockInvitationsRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: createDto.email,
          tenant_id: tenantId,
          status: 'pending',
        },
      });
      expect(mockInvitationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          email: createDto.email,
          role: createDto.role,
          invited_by_user_id: invitedByUserId,
          status: 'pending',
        }),
      );
      expect(mockInvitationsRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockInvitation);
    });

    it('should throw ConflictException if user already exists in tenant', async () => {
      const existingUser = {
        id: 'existing-user-123',
        email: createDto.email,
        tenant_id: tenantId,
      };

      mockUsersRepository.findOne.mockResolvedValue(existingUser);

      await expect(
        service.createInvitation(createDto, tenantId, invitedByUserId),
      ).rejects.toThrow(
        new ConflictException('User already member of this organization'),
      );

      expect(mockUsersRepository.findOne).toHaveBeenCalled();
      expect(mockInvitationsRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if pending invitation already exists', async () => {
      const pendingInvitation = {
        id: 'pending-invitation-123',
        email: createDto.email,
        tenant_id: tenantId,
        status: 'pending',
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne.mockResolvedValue(pendingInvitation);

      await expect(
        service.createInvitation(createDto, tenantId, invitedByUserId),
      ).rejects.toThrow(
        new ConflictException('Invitation already sent to this email'),
      );

      expect(mockUsersRepository.findOne).toHaveBeenCalled();
      expect(mockInvitationsRepository.findOne).toHaveBeenCalled();
    });

    it('should generate cryptographically secure token', async () => {
      const mockInvitation = {
        id: 'invitation-789',
        tenant_id: tenantId,
        email: createDto.email,
        role: createDto.role,
        token: 'generated-token',
        expires_at: new Date(),
        invited_by_user_id: invitedByUserId,
        status: 'pending',
      };

      const mockInvitationWithRelations = {
        ...mockInvitation,
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInvitationWithRelations);
      mockInvitationsRepository.create.mockReturnValue(mockInvitation);
      mockInvitationsRepository.save.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue(true);

      await service.createInvitation(createDto, tenantId, invitedByUserId);

      const createdInvitation =
        mockInvitationsRepository.create.mock.calls[0][0];
      expect(createdInvitation.token).toBeDefined();
      expect(createdInvitation.token).toHaveLength(64); // 32 bytes in hex = 64 characters
      expect(/^[a-f0-9]{64}$/i.test(createdInvitation.token)).toBe(true);
    });

    it('should set expiration to 7 days from now', async () => {
      const mockInvitation = {
        id: 'invitation-789',
        tenant_id: tenantId,
        email: createDto.email,
        role: createDto.role,
        token: 'generated-token',
        expires_at: new Date(),
        invited_by_user_id: invitedByUserId,
        status: 'pending',
      };

      const mockInvitationWithRelations = {
        ...mockInvitation,
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInvitationWithRelations);
      mockInvitationsRepository.create.mockReturnValue(mockInvitation);
      mockInvitationsRepository.save.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue(true);

      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() + 7);
      const beforeTime = beforeDate.getTime();

      await service.createInvitation(createDto, tenantId, invitedByUserId);

      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() + 7);
      const afterTime = afterDate.getTime();

      const createdInvitation =
        mockInvitationsRepository.create.mock.calls[0][0];
      const expiresAtTime = createdInvitation.expires_at.getTime();

      // Check expiration is within 1 second of 7 days from now
      expect(expiresAtTime).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(expiresAtTime).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should handle email sending failure gracefully', async () => {
      const mockInvitation = {
        id: 'invitation-789',
        tenant_id: tenantId,
        email: createDto.email,
        role: createDto.role,
        token: 'generated-token',
        expires_at: new Date(),
        invited_by_user_id: invitedByUserId,
        status: 'pending',
      };

      const mockInvitationWithRelations = {
        ...mockInvitation,
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInvitationWithRelations);
      mockInvitationsRepository.create.mockReturnValue(mockInvitation);
      mockInvitationsRepository.save.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockResolvedValue(false);

      const result = await service.createInvitation(
        createDto,
        tenantId,
        invitedByUserId,
      );

      expect(result).toEqual(mockInvitation);
      // Email failure should not throw, but should be logged (tested via logger mock if needed)
    });

    it('should handle email service exception gracefully', async () => {
      const mockInvitation = {
        id: 'invitation-789',
        tenant_id: tenantId,
        email: createDto.email,
        role: createDto.role,
        token: 'generated-token',
        expires_at: new Date(),
        invited_by_user_id: invitedByUserId,
        status: 'pending',
      };

      const mockInvitationWithRelations = {
        ...mockInvitation,
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockInvitationWithRelations);
      mockInvitationsRepository.create.mockReturnValue(mockInvitation);
      mockInvitationsRepository.save.mockResolvedValue(mockInvitation);
      mockEmailService.sendInvitationEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await service.createInvitation(
        createDto,
        tenantId,
        invitedByUserId,
      );

      expect(result).toEqual(mockInvitation);
      // Should not throw despite email failure
    });
  });

  describe('getInvitationByToken', () => {
    const validToken = 'valid-token-123';

    it('should successfully retrieve invitation with valid token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days in future

      const mockInvitation = {
        id: 'invitation-123',
        token: validToken,
        email: 'user@example.com',
        role: 'user',
        expires_at: futureDate,
        status: 'pending',
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockInvitationsRepository.findOne.mockResolvedValue(mockInvitation);

      const result = await service.getInvitationByToken(validToken);

      expect(mockInvitationsRepository.findOne).toHaveBeenCalledWith({
        where: { token: validToken },
        relations: ['tenant', 'invitedBy'],
      });
      expect(result).toEqual(mockInvitation);
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockInvitationsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getInvitationByToken('invalid-token'),
      ).rejects.toThrow(new NotFoundException('Invalid invitation link'));
    });

    it('should throw ConflictException for expired token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in past

      const expiredInvitation = {
        id: 'invitation-123',
        token: validToken,
        expires_at: pastDate,
        status: 'pending',
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockInvitationsRepository.findOne.mockResolvedValue(expiredInvitation);

      await expect(service.getInvitationByToken(validToken)).rejects.toThrow(
        new ConflictException('Invitation has expired'),
      );
    });

    it('should throw ConflictException for already accepted invitation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const acceptedInvitation = {
        id: 'invitation-123',
        token: validToken,
        expires_at: futureDate,
        status: 'accepted',
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockInvitationsRepository.findOne.mockResolvedValue(acceptedInvitation);

      await expect(service.getInvitationByToken(validToken)).rejects.toThrow(
        new ConflictException('Invitation already used or cancelled'),
      );
    });

    it('should throw ConflictException for cancelled invitation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const cancelledInvitation = {
        id: 'invitation-123',
        token: validToken,
        expires_at: futureDate,
        status: 'cancelled',
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockInvitationsRepository.findOne.mockResolvedValue(cancelledInvitation);

      await expect(service.getInvitationByToken(validToken)).rejects.toThrow(
        new ConflictException('Invitation already used or cancelled'),
      );
    });

    it('should throw ConflictException for email_failed status invitation', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const failedInvitation = {
        id: 'invitation-123',
        token: validToken,
        expires_at: futureDate,
        status: 'email_failed',
        tenant: { name: 'Test Tenant' },
        invitedBy: { first_name: 'John', last_name: 'Doe' },
      };

      mockInvitationsRepository.findOne.mockResolvedValue(failedInvitation);

      await expect(service.getInvitationByToken(validToken)).rejects.toThrow(
        new ConflictException('Invitation already used or cancelled'),
      );
    });
  });

  describe('markInvitationAsAccepted', () => {
    it('should successfully mark invitation as accepted', async () => {
      const token = 'valid-token-123';
      mockInvitationsRepository.update.mockResolvedValue({ affected: 1 });

      await service.markInvitationAsAccepted(token);

      expect(mockInvitationsRepository.update).toHaveBeenCalledWith(
        { token },
        expect.objectContaining({
          status: 'accepted',
          updated_at: expect.any(Date),
        }),
      );
    });
  });

  describe('token generation', () => {
    it('should generate unique tokens for multiple invitations', async () => {
      const tokens = new Set<string>();
      const createDto: CreateInvitationDto = {
        email: 'user@example.com',
        role: 'user',
      };

      mockUsersRepository.findOne.mockResolvedValue(null);
      mockInvitationsRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          tenant: { name: 'Test' },
          invitedBy: { first_name: 'John', last_name: 'Doe' },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          tenant: { name: 'Test' },
          invitedBy: { first_name: 'John', last_name: 'Doe' },
        })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          tenant: { name: 'Test' },
          invitedBy: { first_name: 'John', last_name: 'Doe' },
        });

      mockInvitationsRepository.create.mockImplementation((data) => data);
      mockInvitationsRepository.save.mockImplementation(async (data) => data);
      mockEmailService.sendInvitationEmail.mockResolvedValue(true);

      // Generate 3 invitations
      for (let i = 0; i < 3; i++) {
        await service.createInvitation(
          { ...createDto, email: `user${i}@example.com` },
          'tenant-123',
          'user-456',
        );
        const token = mockInvitationsRepository.create.mock.calls[i][0].token;
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(3);
    });
  });
});

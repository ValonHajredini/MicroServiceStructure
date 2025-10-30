import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Invitation } from './entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectRepository(Invitation)
    private readonly invitationsRepository: Repository<Invitation>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  private generateInvitationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateExpirationDate(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    return expiresAt;
  }

  async createInvitation(
    createDto: CreateInvitationDto,
    tenantId: string,
    invitedByUserId: string,
  ): Promise<Invitation> {
    // Check if user already exists in tenant
    const existingUser = await this.usersRepository.findOne({
      where: {
        email: createDto.email,
        tenant_id: tenantId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User already member of this organization');
    }

    // Check if pending invitation already exists
    const pendingInvitation = await this.invitationsRepository.findOne({
      where: {
        email: createDto.email,
        tenant_id: tenantId,
        status: 'pending',
      },
    });

    if (pendingInvitation) {
      throw new ConflictException('Invitation already sent to this email');
    }

    // Generate token and create invitation
    const token = this.generateInvitationToken();
    const expiresAt = this.calculateExpirationDate();

    const invitation = this.invitationsRepository.create({
      tenant_id: tenantId,
      email: createDto.email,
      role: createDto.role,
      token,
      expires_at: expiresAt,
      invited_by_user_id: invitedByUserId,
      status: 'pending',
    });

    const savedInvitation = await this.invitationsRepository.save(invitation);

    // Load relations for email sending
    const invitationWithRelations = await this.invitationsRepository.findOne({
      where: { id: savedInvitation.id },
      relations: ['tenant', 'invitedBy'],
    });

    // Send invitation email asynchronously
    if (invitationWithRelations) {
      void this.sendInvitationEmailAsync(invitationWithRelations);
    }

    return savedInvitation;
  }

  private async sendInvitationEmailAsync(
    invitation: Invitation,
  ): Promise<void> {
    try {
      const inviterName = `${invitation.invitedBy.first_name} ${invitation.invitedBy.last_name}`;

      const emailSent = await this.emailService.sendInvitationEmail({
        to: invitation.email,
        token: invitation.token,
        inviterName,
        tenantName: invitation.tenant.name,
        expirationDate: invitation.expires_at,
      });

      if (!emailSent) {
        this.logger.error(
          `Failed to send invitation email to ${invitation.email}`,
        );
        await this.invitationsRepository.update(invitation.id, {
          status: 'email_failed',
        });
      }
    } catch (error) {
      this.logger.error(
        `Error sending invitation email to ${invitation.email}`,
        error,
      );
      await this.invitationsRepository.update(invitation.id, {
        status: 'email_failed',
      });
    }
  }

  async getInvitationByToken(token: string): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { token },
      relations: ['tenant', 'invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation link');
    }

    // Check if expired
    if (invitation.expires_at < new Date()) {
      throw new ConflictException('Invitation has expired');
    }

    // Check if already used
    if (invitation.status !== 'pending') {
      throw new ConflictException('Invitation already used or cancelled');
    }

    return invitation;
  }

  async markInvitationAsAccepted(token: string): Promise<void> {
    await this.invitationsRepository.update(
      { token },
      { status: 'accepted', updated_at: new Date() },
    );
  }
}

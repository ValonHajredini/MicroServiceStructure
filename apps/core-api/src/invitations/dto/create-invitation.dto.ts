import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

enum InvitationRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class CreateInvitationDto {
  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Email address of the user to invite',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'user',
    description: 'Role to assign to the invited user',
    enum: InvitationRole,
  })
  @IsEnum(InvitationRole)
  role: string;
}

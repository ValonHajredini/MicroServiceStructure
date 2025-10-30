import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateJoinRequestDto {
  @ApiProperty({
    description: 'Action to take on the join request',
    enum: ['approve', 'reject'],
    example: 'approve',
  })
  @IsEnum(['approve', 'reject'], {
    message: 'Action must be either "approve" or "reject"',
  })
  action: 'approve' | 'reject';

  @ApiProperty({
    description: 'Optional response message from admin',
    example: 'Welcome to the team!',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Admin response must not exceed 1000 characters',
  })
  adminResponse?: string;
}

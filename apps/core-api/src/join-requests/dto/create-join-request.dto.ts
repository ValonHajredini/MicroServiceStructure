import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJoinRequestDto {
  @ApiProperty({
    description: 'Optional message from user explaining why they want to join',
    example:
      'I work for this company and need access to collaborate with my team.',
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000, {
    message: 'Message must not exceed 1000 characters',
  })
  message?: string;
}

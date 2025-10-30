import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeRoleDto {
  @ApiProperty({
    example: 'admin',
    enum: ['admin', 'user', 'viewer'],
    description: 'New role for the user',
  })
  @IsString()
  @IsIn(['admin', 'user', 'viewer'])
  role: string;
}

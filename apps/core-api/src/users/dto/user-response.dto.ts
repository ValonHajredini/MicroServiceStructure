import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'user', 'viewer'] })
  role: string;

  @ApiProperty({ example: '2025-10-29T10:00:00Z' })
  updatedAt: Date;
}

export class UserRoleUpdateResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserResponseDto })
  data: UserResponseDto;
}

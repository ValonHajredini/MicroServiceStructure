import { ApiProperty } from '@nestjs/swagger';

export class UserInTenantDto {
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

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'suspended'] })
  status: string;

  @ApiProperty({ example: '2025-10-01T10:00:00Z' })
  createdAt: Date;
}

export class UsersInTenantResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserInTenantDto] })
  data: UserInTenantDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
    },
  })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

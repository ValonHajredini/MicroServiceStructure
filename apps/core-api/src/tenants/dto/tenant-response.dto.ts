import { ApiProperty } from '@nestjs/swagger';

/**
 * Tenant response DTO
 * Used for GET /tenants/:id and PATCH /tenants/:id responses
 */
export class TenantResponseDto {
  @ApiProperty({
    description: 'Tenant unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tenant name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: 'Tenant subdomain (optional)',
    example: 'acme',
    required: false,
  })
  subdomain?: string;

  @ApiProperty({
    description: 'Array of enabled service names',
    example: ['notes', 'kanban'],
    type: [String],
  })
  enabled_services: string[];

  @ApiProperty({
    description: 'Tenant status',
    example: 'active',
    enum: ['active', 'inactive', 'suspended'],
  })
  status: string;

  @ApiProperty({
    description: 'Tenant creation timestamp',
    example: '2025-10-30T10:00:00.000Z',
    required: false,
  })
  created_at?: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-10-30T12:00:00.000Z',
  })
  updated_at: Date;
}

/**
 * Wrapper for tenant response with success flag and metadata
 */
export class TenantResponse {
  @ApiProperty({
    description: 'Request success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Tenant data',
    type: TenantResponseDto,
  })
  data: TenantResponseDto;

  @ApiProperty({
    description: 'Response metadata',
    example: { timestamp: '2025-10-30T12:00:00.000Z' },
  })
  meta: {
    timestamp: string;
  };
}

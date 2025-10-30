import { ApiProperty } from '@nestjs/swagger';

/**
 * Service update response DTO
 * Used for PATCH /tenants/:id/services response
 */
export class ServiceUpdateResponseDto {
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
    description:
      'Array of enabled service names (camelCase for API consistency)',
    example: ['notes', 'kanban'],
    type: [String],
  })
  enabledServices: string[];

  @ApiProperty({
    description: 'Last update timestamp (camelCase for API consistency)',
    example: '2025-10-30T12:00:00.000Z',
  })
  updatedAt: Date;
}

/**
 * Wrapper for service update response with success flag and metadata
 */
export class ServiceUpdateResponse {
  @ApiProperty({
    description: 'Request success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Updated tenant service data',
    type: ServiceUpdateResponseDto,
  })
  data: ServiceUpdateResponseDto;

  @ApiProperty({
    description: 'Response metadata',
    example: { timestamp: '2025-10-30T12:00:00.000Z' },
  })
  meta: {
    timestamp: string;
  };
}

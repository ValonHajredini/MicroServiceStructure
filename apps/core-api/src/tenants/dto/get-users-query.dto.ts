import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetUsersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'admin',
    enum: ['admin', 'user', 'viewer'],
    description: 'Filter by role',
  })
  @IsOptional()
  @IsIn(['admin', 'user', 'viewer'])
  role?: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: ['active', 'inactive', 'suspended'],
    description: 'Filter by status',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: string;
}

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchTenantsDto {
  @ApiProperty({
    description: 'Search query for tenant names (minimum 2 characters)',
    example: 'acme',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Search query must be at least 2 characters long' })
  name: string;
}

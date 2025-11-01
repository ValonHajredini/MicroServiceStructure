import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for searching notes with full-text search
 * Story 3.5 - Task 2
 * AC: 1, 7 - Search query with pagination
 */
export class SearchNotesDto {
  /**
   * Search query string
   * Searches in both title and content fields
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  q: string;

  /**
   * Page number for pagination
   * Default: 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  /**
   * Number of results per page
   * Default: 20, Max: 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

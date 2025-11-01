import { IsString, IsOptional, IsUUID, MaxLength, IsBoolean } from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Title must not exceed 500 characters' })
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUUID('4', { message: 'folder_id must be a valid UUID' })
  @IsOptional()
  folder_id?: string | null;

  @IsBoolean()
  @IsOptional()
  is_pinned?: boolean;
}

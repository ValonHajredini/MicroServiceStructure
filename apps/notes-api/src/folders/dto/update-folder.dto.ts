import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Folder name must not exceed 255 characters' })
  name?: string;

  @IsUUID('4', { message: 'parent_id must be a valid UUID' })
  @IsOptional()
  parent_id?: string | null;
}

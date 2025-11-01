import { IsUUID, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating an attachment
 * AC: 1, 5 - File ID validation and size limits enforced at service level
 */
export class CreateAttachmentDto {
  @IsUUID()
  @IsNotEmpty()
  file_id: string;
}

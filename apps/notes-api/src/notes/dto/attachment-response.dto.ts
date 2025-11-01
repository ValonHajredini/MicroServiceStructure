/**
 * DTO for attachment response with file metadata
 * AC: 3 - Response format for GET /notes/:id with attachments
 */
export class AttachmentResponseDto {
  id: string;
  note_id: string;
  file_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  created_at: Date;
}

export interface Attachment {
  id: string;
  note_id: string;
  file_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  storage_url: string;
  created_at: Date;
}

import { Attachment } from './attachment.model';

export interface Note {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  content: string;
  folder_id: string | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
  attachments?: Attachment[];
}

export interface CreateNoteDto {
  title?: string;
  content?: string;
  folder_id?: string;
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  folder_id?: string | null;
  is_pinned?: boolean;
}

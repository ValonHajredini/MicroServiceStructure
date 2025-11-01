export class NoteResponseDto {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  content: string;
  folder_id: string | null;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
}

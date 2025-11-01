export interface Folder {
  id: string;
  tenant_id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: Date;
  children?: Folder[];
  noteCount?: number;
}

export interface CreateFolderDto {
  name: string;
  parent_id?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parent_id?: string | null;
}

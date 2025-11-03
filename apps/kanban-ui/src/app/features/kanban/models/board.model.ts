export interface Board {
  id: string;
  name: string;
  description: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  columns?: Column[];
  taskCount?: number; // Computed field
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  wip_limit?: number;
  created_at: string;
  updated_at: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  column_id: string;
  title: string;
  description?: string;
  position: number;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBoardDto {
  name: string;
  description?: string;
}

export interface BoardListResponse {
  success: boolean;
  data: Board[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface BoardDetailResponse {
  success: boolean;
  data: Board;
}

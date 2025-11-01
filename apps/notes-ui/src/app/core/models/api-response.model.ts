export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
  timestamp: string;
}

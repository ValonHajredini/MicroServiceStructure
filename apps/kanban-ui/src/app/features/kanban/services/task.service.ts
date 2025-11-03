import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Task } from '../models/board.model';

export interface MoveTaskDto {
  columnId: string;
  position: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
}

export interface TaskResponse {
  success: boolean;
  data: Task;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Create a new task in a column
   * Endpoint: POST /api/v1/columns/:columnId/tasks
   */
  createTask(columnId: string, dto: CreateTaskDto): Observable<Task> {
    return this.http.post<TaskResponse>(
      `${this.apiUrl}/api/v1/columns/${columnId}/tasks`,
      dto
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Move task to new column and/or position
   * Endpoint: PATCH /api/v1/tasks/:id/move
   */
  moveTask(taskId: string, columnId: string, position: number): Observable<Task> {
    const payload: MoveTaskDto = { columnId, position };

    return this.http.patch<TaskResponse>(
      `${this.apiUrl}/api/v1/tasks/${taskId}/move`,
      payload
    ).pipe(
      map(response => response.data)
    );
  }
}

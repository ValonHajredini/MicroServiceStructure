import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Column } from '../models/board.model';

export interface CreateColumnDto {
  boardId: string;
  title: string;
  wipLimit?: number;
}

export interface ColumnResponse {
  success: boolean;
  data: Column;
}

@Injectable({
  providedIn: 'root'
})
export class ColumnService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Create new column in a board
   */
  createColumn(dto: CreateColumnDto): Observable<Column> {
    return this.http.post<ColumnResponse>(
      `${this.apiUrl}/api/v1/boards/${dto.boardId}/columns`,
      {
        title: dto.title,
        wip_limit: dto.wipLimit
      }
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Update column
   */
  updateColumn(columnId: string, updates: Partial<Column>): Observable<Column> {
    return this.http.patch<ColumnResponse>(
      `${this.apiUrl}/api/v1/columns/${columnId}`,
      updates
    ).pipe(
      map(response => response.data)
    );
  }

  /**
   * Delete column
   */
  deleteColumn(columnId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/v1/columns/${columnId}`);
  }
}

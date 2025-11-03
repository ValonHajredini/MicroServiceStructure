import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Board,
  CreateBoardDto,
  BoardListResponse,
  BoardDetailResponse
} from '../models/board.model';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Get list of boards for current user
   */
  getBoards(): Observable<Board[]> {
    return this.http.get<BoardListResponse>(`${this.apiUrl}/api/v1/boards`)
      .pipe(
        map(response => {
          // Calculate task count for each board
          return response.data.map(board => ({
            ...board,
            taskCount: this.calculateTaskCount(board)
          }));
        })
      );
  }

  /**
   * Get single board with columns and tasks
   */
  getBoard(id: string): Observable<Board> {
    return this.http.get<BoardDetailResponse>(`${this.apiUrl}/api/v1/boards/${id}`)
      .pipe(
        map(response => ({
          ...response.data,
          taskCount: this.calculateTaskCount(response.data)
        }))
      );
  }

  /**
   * Create new board
   */
  createBoard(board: CreateBoardDto): Observable<Board> {
    return this.http.post<BoardDetailResponse>(`${this.apiUrl}/api/v1/boards`, board)
      .pipe(
        map(response => response.data)
      );
  }

  /**
   * Calculate total task count for a board
   */
  private calculateTaskCount(board: Board): number {
    if (!board.columns) return 0;
    return board.columns.reduce((total, column) => {
      return total + (column.tasks?.length || 0);
    }, 0);
  }
}

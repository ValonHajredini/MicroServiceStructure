import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Note, CreateNoteDto, UpdateNoteDto } from '../models/note.model';
import { ApiResponse } from '../../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api/v1/notes';

  getNotes(params?: { folder_id?: string; page?: number; limit?: number }): Observable<Note[]> {
    let httpParams = new HttpParams();
    if (params?.folder_id) {
      httpParams = httpParams.set('folder_id', params.folder_id);
    }
    if (params?.page !== undefined) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params?.limit !== undefined) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<ApiResponse<Note[]>>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.data)
    );
  }

  getNote(id: string): Observable<Note> {
    return this.http.get<ApiResponse<Note>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createNote(note: CreateNoteDto): Observable<Note> {
    return this.http.post<ApiResponse<Note>>(this.apiUrl, note).pipe(
      map(response => response.data)
    );
  }

  updateNote(id: string, note: UpdateNoteDto): Observable<Note> {
    return this.http.patch<ApiResponse<Note>>(`${this.apiUrl}/${id}`, note).pipe(
      map(response => response.data)
    );
  }

  deleteNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteAttachment(noteId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${noteId}/attachments/${attachmentId}`);
  }
}

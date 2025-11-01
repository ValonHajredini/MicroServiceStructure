import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Folder, CreateFolderDto, UpdateFolderDto } from '../models/folder.model';
import { ApiResponse } from '../../../core/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class FoldersService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/api/v1/folders';

  getFolders(): Observable<Folder[]> {
    return this.http.get<ApiResponse<Folder[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  getFolder(id: string): Observable<Folder> {
    return this.http.get<ApiResponse<Folder>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createFolder(folder: CreateFolderDto): Observable<Folder> {
    return this.http.post<ApiResponse<Folder>>(this.apiUrl, folder).pipe(
      map(response => response.data)
    );
  }

  updateFolder(id: string, folder: UpdateFolderDto): Observable<Folder> {
    return this.http.patch<ApiResponse<Folder>>(`${this.apiUrl}/${id}`, folder).pipe(
      map(response => response.data)
    );
  }

  deleteFolder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

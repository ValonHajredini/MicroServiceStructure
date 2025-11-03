import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';
import { Task } from '../models/board.model';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

describe('TaskService', () => {
  let service: TaskService;
  let httpMock: HttpTestingController;

  const mockTask: Task = {
    id: 'task-1',
    column_id: 'col-2',
    title: 'Moved Task',
    position: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskService
      ]
    });
    service = TestBed.inject(TaskService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call PATCH /tasks/:id/move with correct payload', () => {
    const taskId = 'task-1';
    const columnId = 'col-2';
    const position = 1;

    service.moveTask(taskId, columnId, position).subscribe(task => {
      expect(task).toEqual(mockTask);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tasks/${taskId}/move`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ columnId, position });

    req.flush({ success: true, data: mockTask });
  });

  it('should handle error response', () => {
    const taskId = 'task-1';
    const errorMessage = 'Task not found';

    service.moveTask(taskId, 'col-2', 0).subscribe({
      next: () => fail('should have failed with 404'),
      error: (error) => {
        expect(error.status).toBe(404);
        expect(error.error.message).toBe(errorMessage);
      }
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/v1/tasks/${taskId}/move`);
    req.flush({ message: errorMessage }, { status: 404, statusText: 'Not Found' });
  });
});

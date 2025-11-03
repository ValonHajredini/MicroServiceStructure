import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BoardService } from './board.service';
import { Board, BoardListResponse, BoardDetailResponse, CreateBoardDto } from '../models/board.model';
import { environment } from '../../../../environments/environment';

describe('BoardService', () => {
  let service: BoardService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BoardService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BoardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getBoards', () => {
    it('should return boards with calculated task counts', (done) => {
      const mockResponse: BoardListResponse = {
        success: true,
        data: [
          {
            id: 'board-1',
            name: 'Test Board 1',
            description: 'Description 1',
            tenant_id: 'tenant-1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            columns: [
              {
                id: 'col-1',
                board_id: 'board-1',
                title: 'To Do',
                position: 0,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z',
                tasks: [
                  {
                    id: 'task-1',
                    column_id: 'col-1',
                    title: 'Task 1',
                    position: 0,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z'
                  },
                  {
                    id: 'task-2',
                    column_id: 'col-1',
                    title: 'Task 2',
                    position: 1,
                    created_at: '2025-01-01T00:00:00Z',
                    updated_at: '2025-01-01T00:00:00Z'
                  }
                ]
              }
            ]
          },
          {
            id: 'board-2',
            name: 'Test Board 2',
            description: 'Description 2',
            tenant_id: 'tenant-1',
            created_at: '2025-01-02T00:00:00Z',
            updated_at: '2025-01-02T00:00:00Z'
          }
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 2
        }
      };

      service.getBoards().subscribe((boards) => {
        expect(boards.length).toBe(2);
        expect(boards[0].taskCount).toBe(2);
        expect(boards[1].taskCount).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle boards with no columns', (done) => {
      const mockResponse: BoardListResponse = {
        success: true,
        data: [
          {
            id: 'board-1',
            name: 'Empty Board',
            description: 'No columns',
            tenant_id: 'tenant-1',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z'
          }
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1
        }
      };

      service.getBoards().subscribe((boards) => {
        expect(boards[0].taskCount).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      req.flush(mockResponse);
    });

    it('should handle HTTP error', (done) => {
      const errorMessage = 'Failed to load boards';

      service.getBoards().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          expect(error.error).toBe(errorMessage);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getBoard', () => {
    it('should return board with calculated task count', (done) => {
      const mockResponse: BoardDetailResponse = {
        success: true,
        data: {
          id: 'board-1',
          name: 'Test Board',
          description: 'Test Description',
          tenant_id: 'tenant-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          columns: [
            {
              id: 'col-1',
              board_id: 'board-1',
              title: 'To Do',
              position: 0,
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
              tasks: [
                {
                  id: 'task-1',
                  column_id: 'col-1',
                  title: 'Task 1',
                  position: 0,
                  created_at: '2025-01-01T00:00:00Z',
                  updated_at: '2025-01-01T00:00:00Z'
                }
              ]
            },
            {
              id: 'col-2',
              board_id: 'board-1',
              title: 'In Progress',
              position: 1,
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
              tasks: []
            }
          ]
        }
      };

      service.getBoard('board-1').subscribe((board) => {
        expect(board.id).toBe('board-1');
        expect(board.taskCount).toBe(1);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards/board-1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle board with no columns', (done) => {
      const mockResponse: BoardDetailResponse = {
        success: true,
        data: {
          id: 'board-1',
          name: 'Empty Board',
          description: 'No columns',
          tenant_id: 'tenant-1',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      };

      service.getBoard('board-1').subscribe((board) => {
        expect(board.taskCount).toBe(0);
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards/board-1`);
      req.flush(mockResponse);
    });

    it('should handle HTTP 404 error', (done) => {
      service.getBoard('non-existent').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(404);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards/non-existent`);
      req.flush('Board not found', { status: 404, statusText: 'Not Found' });
    });
  });

  describe('createBoard', () => {
    it('should create board and return board data', (done) => {
      const createDto: CreateBoardDto = {
        name: 'New Board',
        description: 'New board description'
      };

      const mockResponse: BoardDetailResponse = {
        success: true,
        data: {
          id: 'board-new',
          name: 'New Board',
          description: 'New board description',
          tenant_id: 'tenant-1',
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z',
          columns: []
        }
      };

      service.createBoard(createDto).subscribe((board) => {
        expect(board.id).toBe('board-new');
        expect(board.name).toBe('New Board');
        expect(board.description).toBe('New board description');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush(mockResponse);
    });

    it('should create board without description', (done) => {
      const createDto: CreateBoardDto = {
        name: 'New Board'
      };

      const mockResponse: BoardDetailResponse = {
        success: true,
        data: {
          id: 'board-new',
          name: 'New Board',
          description: '',
          tenant_id: 'tenant-1',
          created_at: '2025-01-03T00:00:00Z',
          updated_at: '2025-01-03T00:00:00Z'
        }
      };

      service.createBoard(createDto).subscribe((board) => {
        expect(board.name).toBe('New Board');
        done();
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle validation error', (done) => {
      const createDto: CreateBoardDto = {
        name: ''
      };

      service.createBoard(createDto).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          done();
        }
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards`);
      req.flush('Validation failed', { status: 400, statusText: 'Bad Request' });
    });
  });

  describe('calculateTaskCount', () => {
    it('should calculate task count correctly for multiple columns', () => {
      const board: Board = {
        id: 'board-1',
        name: 'Test Board',
        description: 'Test',
        tenant_id: 'tenant-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        columns: [
          {
            id: 'col-1',
            board_id: 'board-1',
            title: 'To Do',
            position: 0,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tasks: [
              {
                id: 'task-1',
                column_id: 'col-1',
                title: 'Task 1',
                position: 0,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              },
              {
                id: 'task-2',
                column_id: 'col-1',
                title: 'Task 2',
                position: 1,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              }
            ]
          },
          {
            id: 'col-2',
            board_id: 'board-1',
            title: 'In Progress',
            position: 1,
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            tasks: [
              {
                id: 'task-3',
                column_id: 'col-2',
                title: 'Task 3',
                position: 0,
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              }
            ]
          }
        ]
      };

      // Access private method via board response mapping
      service.getBoard('board-1').subscribe((result) => {
        // calculateTaskCount is called internally, we test it through the public API
        expect(result.taskCount).toBe(3); // 2 tasks in col-1 + 1 task in col-2 = 3 total
      });

      const req = httpMock.expectOne(`${apiUrl}/api/v1/boards/board-1`);
      req.flush({ success: true, data: board });
    });
  });
});

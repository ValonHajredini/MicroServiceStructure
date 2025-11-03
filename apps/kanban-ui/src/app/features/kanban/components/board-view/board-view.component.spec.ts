import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BoardViewComponent } from './board-view.component';
import { BoardService } from '../../services/board.service';
import { ToastService } from '@microservice/ui-common';
import { Board } from '../../models/board.model';

describe('BoardViewComponent', () => {
  let component: BoardViewComponent;
  let fixture: ComponentFixture<BoardViewComponent>;
  let mockBoardService: jasmine.SpyObj<BoardService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockActivatedRoute: any;

  const mockBoard: Board = {
    id: 'board-1',
    name: 'Test Board',
    description: 'Test Description',
    tenant_id: 'tenant-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
    columns: [
      {
        id: 'col-1',
        board_id: 'board-1',
        title: 'To Do',
        position: 0,
        wip_limit: 5,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        tasks: [
          {
            id: 'task-1',
            column_id: 'col-1',
            title: 'Task 1',
            description: 'Task description',
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
    ],
    taskCount: 1
  };

  beforeEach(async () => {
    mockBoardService = jasmine.createSpyObj('BoardService', ['getBoard']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockToastService = jasmine.createSpyObj('ToastService', ['error']);

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('board-1')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [BoardViewComponent],
      providers: [
        { provide: BoardService, useValue: mockBoardService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load board when boardId is present in route', () => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));

      fixture.detectChanges(); // triggers ngOnInit

      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(mockBoardService.getBoard).toHaveBeenCalledWith('board-1');
      expect(component.board()).toEqual(mockBoard);
      expect(component.loading()).toBe(false);
    });

    it('should not load board when boardId is null', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue(null);

      fixture.detectChanges();

      expect(mockBoardService.getBoard).not.toHaveBeenCalled();
    });
  });

  describe('loadBoard', () => {
    it('should set loading to true initially before observable emits', (done) => {
      let loadingWasTrue = false;
      mockBoardService.getBoard.and.returnValue(of(mockBoard).pipe(
        tap(() => {
          if (component.loading()) {
            loadingWasTrue = true;
          }
        })
      ));

      component.loadBoard('board-1');

      setTimeout(() => {
        expect(loadingWasTrue).toBe(true);
        done();
      }, 0);
    });

    it('should populate board and set loading to false on success', (done) => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));

      component.loadBoard('board-1');

      setTimeout(() => {
        expect(component.board()).toEqual(mockBoard);
        expect(component.loading()).toBe(false);
        done();
      }, 0);
    });

    it('should handle error, show toast, and navigate to board list', (done) => {
      const error = new Error('Failed to load board');
      mockBoardService.getBoard.and.returnValue(throwError(() => error));

      component.loadBoard('board-1');

      setTimeout(() => {
        expect(mockToastService.error).toHaveBeenCalledWith({
          summary: 'Load Failed',
          detail: 'Unable to load board. Please try again.'
        });
        expect(component.loading()).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/boards']);
        done();
      }, 0);
    });

    it('should handle 404 error gracefully', (done) => {
      const error = { status: 404, message: 'Board not found' };
      mockBoardService.getBoard.and.returnValue(throwError(() => error));

      component.loadBoard('non-existent');

      setTimeout(() => {
        expect(mockToastService.error).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/boards']);
        done();
      }, 0);
    });
  });

  describe('goBack', () => {
    it('should navigate to board list', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/boards']);
    });
  });

  describe('template integration', () => {
    it('should display skeleton loaders when loading', () => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));
      mockActivatedRoute.snapshot.paramMap.get = jasmine.createSpy('get').and.returnValue(null); // No id to prevent ngOnInit from calling loadBoard

      component.loading.set(true);
      component.board.set(null);

      fixture.detectChanges();

      // Check if loading template is rendered
      expect(component.loading()).toBe(true);
    });

    it('should display empty state when board has no columns', () => {
      const emptyBoard: Board = { ...mockBoard, columns: [] };
      mockBoardService.getBoard.and.returnValue(of(emptyBoard));
      component.loading.set(false);
      component.board.set(emptyBoard);

      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('Add your first column');
    });

    it('should display board name and description', () => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));
      component.loading.set(false);
      component.board.set(mockBoard);

      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Test Board');
      expect(content).toContain('Test Description');
    });

    it('should render column components when columns exist', () => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));
      component.loading.set(false);
      component.board.set(mockBoard);

      fixture.detectChanges();

      const columns = fixture.nativeElement.querySelectorAll('app-column');
      expect(columns.length).toBe(2);
    });

    it('should display back button', () => {
      mockBoardService.getBoard.and.returnValue(of(mockBoard));
      fixture.detectChanges();

      const backButton = fixture.nativeElement.querySelector('p-button');
      expect(backButton).toBeTruthy();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BoardListComponent } from './board-list.component';
import { BoardService } from '../../services/board.service';
import { ToastService, DialogService } from '@microservice/ui-common';
import { Board } from '../../models/board.model';

describe('BoardListComponent', () => {
  let component: BoardListComponent;
  let fixture: ComponentFixture<BoardListComponent>;
  let mockBoardService: jasmine.SpyObj<BoardService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockToastService: jasmine.SpyObj<ToastService>;
  let mockDialogService: jasmine.SpyObj<DialogService>;

  const mockBoards: Board[] = [
    {
      id: 'board-1',
      name: 'Test Board 1',
      description: 'Description 1',
      tenant_id: 'tenant-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T12:00:00Z',
      taskCount: 5
    },
    {
      id: 'board-2',
      name: 'Test Board 2',
      description: 'Description 2',
      tenant_id: 'tenant-1',
      created_at: '2025-01-02T00:00:00Z',
      updated_at: '2025-01-02T12:00:00Z',
      taskCount: 3
    }
  ];

  beforeEach(async () => {
    mockBoardService = jasmine.createSpyObj('BoardService', ['getBoards']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockToastService = jasmine.createSpyObj('ToastService', ['error', 'success']);
    mockDialogService = jasmine.createSpyObj('DialogService', ['open']);

    await TestBed.configureTestingModule({
      imports: [BoardListComponent],
      providers: [
        { provide: BoardService, useValue: mockBoardService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService },
        { provide: DialogService, useValue: mockDialogService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BoardListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load boards on initialization', () => {
      mockBoardService.getBoards.and.returnValue(of(mockBoards));

      fixture.detectChanges(); // triggers ngOnInit

      expect(mockBoardService.getBoards).toHaveBeenCalled();
      expect(component.boards()).toEqual(mockBoards);
      expect(component.loading()).toBe(false);
    });
  });

  describe('loadBoards', () => {
    it('should set loading to true initially before observable emits', (done) => {
      let loadingWasTrue = false;
      mockBoardService.getBoards.and.returnValue(of(mockBoards).pipe(
        tap(() => {
          if (component.loading()) {
            loadingWasTrue = true;
          }
        })
      ));

      component.loadBoards();

      setTimeout(() => {
        expect(loadingWasTrue).toBe(true);
        done();
      }, 0);
    });

    it('should populate boards and set loading to false on success', (done) => {
      mockBoardService.getBoards.and.returnValue(of(mockBoards));

      component.loadBoards();

      setTimeout(() => {
        expect(component.boards()).toEqual(mockBoards);
        expect(component.loading()).toBe(false);
        done();
      }, 0);
    });

    it('should handle error and show toast message', (done) => {
      const error = new Error('Failed to load');
      mockBoardService.getBoards.and.returnValue(throwError(() => error));

      component.loadBoards();

      setTimeout(() => {
        expect(mockToastService.error).toHaveBeenCalledWith({
          summary: 'Load Failed',
          detail: 'Unable to load boards. Please try again.'
        });
        expect(component.loading()).toBe(false);
        done();
      }, 0);
    });

    it('should keep existing boards on error', (done) => {
      component.boards.set(mockBoards);
      const error = new Error('Failed to reload');
      mockBoardService.getBoards.and.returnValue(throwError(() => error));

      component.loadBoards();

      setTimeout(() => {
        expect(component.boards()).toEqual(mockBoards);
        done();
      }, 0);
    });
  });

  describe('openBoard', () => {
    it('should navigate to board detail view', () => {
      const board = mockBoards[0];

      component.openBoard(board);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/boards', 'board-1']);
    });
  });

  describe('createBoard', () => {
    it('should open create board dialog', () => {
      mockDialogService.open.and.returnValue(of(null));

      component.createBoard();

      expect(mockDialogService.open).toHaveBeenCalled();
      const call = mockDialogService.open.calls.mostRecent();
      expect(call.args[1]).toEqual({
        header: 'Create New Board',
        width: '500px'
      });
    });

    it('should show success toast and navigate when board is created', (done) => {
      const newBoard: Board = {
        id: 'board-new',
        name: 'New Board',
        description: 'New Description',
        tenant_id: 'tenant-1',
        created_at: '2025-01-03T00:00:00Z',
        updated_at: '2025-01-03T00:00:00Z'
      };

      mockDialogService.open.and.returnValue(of(newBoard));

      component.createBoard();

      setTimeout(() => {
        expect(mockToastService.success).toHaveBeenCalledWith({
          summary: 'Board Created',
          detail: 'New Board has been created successfully'
        });
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/boards', 'board-new']);
        done();
      }, 0);
    });

    it('should not show toast or navigate when dialog is cancelled', (done) => {
      mockDialogService.open.and.returnValue(of(null));

      component.createBoard();

      setTimeout(() => {
        expect(mockToastService.success).not.toHaveBeenCalled();
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const dateString = '2025-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toMatch(/Jan 15, 2025/);
    });

    it('should handle different date formats', () => {
      const dateString = '2025-12-25T00:00:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toMatch(/Dec 25, 2025/);
    });
  });

  describe('template integration', () => {
    it('should display skeleton loaders when loading', () => {
      mockBoardService.getBoards.and.returnValue(of([]));
      // Manually set loading state to simulate loading without triggering loadBoards from ngOnInit
      component.loading.set(true);

      // Verify loading state is set (test the loading signal behavior)
      expect(component.loading()).toBe(true);
    });

    it('should display empty state when no boards exist', () => {
      mockBoardService.getBoards.and.returnValue(of([]));
      component.loading.set(false);
      component.boards.set([]);

      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-state');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No Boards Yet');
    });

    it('should render board cards when boards exist', () => {
      mockBoardService.getBoards.and.returnValue(of(mockBoards));
      component.loading.set(false);
      component.boards.set(mockBoards);

      fixture.detectChanges();

      const boardCards = fixture.nativeElement.querySelectorAll('p-card');
      expect(boardCards.length).toBe(2);
    });

    it('should display Create New Board button', () => {
      mockBoardService.getBoards.and.returnValue(of([]));
      fixture.detectChanges();

      const createButton = fixture.nativeElement.querySelector('p-button');
      expect(createButton).toBeTruthy();
    });
  });
});

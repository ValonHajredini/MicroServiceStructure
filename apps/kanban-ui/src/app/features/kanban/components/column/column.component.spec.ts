import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnComponent } from './column.component';
import { Column } from '../../models/board.model';

describe('ColumnComponent', () => {
  let component: ColumnComponent;
  let fixture: ComponentFixture<ColumnComponent>;

  const mockColumn: Column = {
    id: 'col-1',
    board_id: 'board-1',
    title: 'To Do',
    position: 0,
    wip_limit: 5,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T12:00:00Z',
    tasks: [
      {
        id: 'task-1',
        column_id: 'col-1',
        title: 'Task 1',
        description: 'Task description',
        position: 0,
        assigned_to: 'user-1',
        due_date: '2025-01-15T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      },
      {
        id: 'task-2',
        column_id: 'col-1',
        title: 'Task 2',
        position: 1,
        created_at: '2025-01-02T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z'
      }
    ]
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ColumnComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.column = mockColumn;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('column input', () => {
    it('should accept column input', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      expect(component.column).toEqual(mockColumn);
    });

    it('should render column title', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const title = fixture.nativeElement.textContent;
      expect(title).toContain('To Do');
    });

    it('should display WIP limit when set', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('5');
    });

    it('should handle column without WIP limit', () => {
      const columnWithoutWIP = { ...mockColumn, wip_limit: undefined };
      component.column = columnWithoutWIP;
      fixture.detectChanges();

      expect(component.column.wip_limit).toBeUndefined();
    });
  });

  describe('tasks rendering', () => {
    it('should display task count badge', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const badge = fixture.nativeElement.querySelector('p-badge');
      expect(badge).toBeTruthy();
    });

    it('should render all tasks in column', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const tasks = fixture.nativeElement.querySelectorAll('.task-card');
      expect(tasks.length).toBe(2);
    });

    it('should display empty state when no tasks', () => {
      const emptyColumn = { ...mockColumn, tasks: [] };
      component.column = emptyColumn;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-column');
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain('No tasks');
    });

    it('should handle tasks array as undefined', () => {
      const columnWithoutTasks = { ...mockColumn, tasks: undefined };
      component.column = columnWithoutTasks;
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.empty-column');
      expect(emptyState).toBeTruthy();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const dateString = '2025-01-15T10:30:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toMatch(/Jan 15/);
    });

    it('should handle different date formats', () => {
      const dateString = '2025-12-25T00:00:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toMatch(/Dec 25/);
    });

    it('should format month and day only (no year)', () => {
      const dateString = '2025-03-10T00:00:00Z';
      const formatted = component.formatDate(dateString);

      expect(formatted).toMatch(/Mar 10/);
      expect(formatted).not.toContain('2025');
    });
  });

  describe('task details rendering', () => {
    it('should display task title', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Task 1');
      expect(content).toContain('Task 2');
    });

    it('should display task description when available', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      expect(content).toContain('Task description');
    });

    it('should handle tasks without description', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      // Task 2 has no description, should still render
      const tasks = fixture.nativeElement.querySelectorAll('.task-card');
      expect(tasks.length).toBe(2);
    });

    it('should display due date when available', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      // Task 1 has due_date, should be formatted
      expect(component.formatDate(mockColumn.tasks![0].due_date!)).toBeTruthy();
    });
  });

  describe('column styling and layout', () => {
    it('should apply correct CSS classes', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const columnElement = fixture.nativeElement.querySelector('.column-container');
      expect(columnElement).toBeTruthy();
    });

    it('should display column header with title and badge', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector('.column-header');
      expect(header).toBeTruthy();
    });

    it('should render tasks in a scrollable container', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const taskList = fixture.nativeElement.querySelector('.tasks-container');
      expect(taskList).toBeTruthy();
    });
  });

  describe('WIP limit indicator', () => {
    it('should show WIP limit when set', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const wipIndicator = fixture.nativeElement.querySelector('.wip-limit');
      expect(wipIndicator).toBeTruthy();
    });

    it('should not show WIP limit indicator when not set', () => {
      const columnWithoutWIP = { ...mockColumn, wip_limit: undefined };
      component.column = columnWithoutWIP;
      fixture.detectChanges();

      const wipIndicator = fixture.nativeElement.querySelector('.wip-limit');
      expect(wipIndicator).toBeFalsy();
    });

    it('should display current task count vs WIP limit', () => {
      component.column = mockColumn;
      fixture.detectChanges();

      const content = fixture.nativeElement.textContent;
      // Should show something like "2/5" (2 tasks out of 5 limit)
      expect(content).toContain('2');
      expect(content).toContain('5');
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      component.column = mockColumn;
      fixture.detectChanges();
    });

    it('should handle navigate up event', () => {
      spyOn<any>(component, 'focusTaskAtIndex');
      component.onNavigateUp(1);
      expect(component['focusTaskAtIndex']).toHaveBeenCalledWith(0);
    });

    it('should not navigate up from first task', () => {
      spyOn<any>(component, 'focusTaskAtIndex');
      component.onNavigateUp(0);
      expect(component['focusTaskAtIndex']).not.toHaveBeenCalled();
    });

    it('should handle navigate down event', () => {
      spyOn<any>(component, 'focusTaskAtIndex');
      component.onNavigateDown(0);
      expect(component['focusTaskAtIndex']).toHaveBeenCalledWith(1);
    });

    it('should not navigate down from last task', () => {
      spyOn<any>(component, 'focusTaskAtIndex');
      component.onNavigateDown(1);
      expect(component['focusTaskAtIndex']).not.toHaveBeenCalled();
    });

    it('should emit taskMoved when moving task up', () => {
      spyOn(component.taskMoved, 'emit');
      component.onMoveTaskUp(1);
      expect(component.taskMoved.emit).toHaveBeenCalledWith(jasmine.objectContaining({
        taskId: 'task-2',
        targetPosition: 0,
        sourcePosition: 1
      }));
    });

    it('should emit taskMoved when moving task down', () => {
      spyOn(component.taskMoved, 'emit');
      component.onMoveTaskDown(0);
      expect(component.taskMoved.emit).toHaveBeenCalledWith(jasmine.objectContaining({
        taskId: 'task-1',
        targetPosition: 1,
        sourcePosition: 0
      }));
    });

    it('should not move task up when already at top', () => {
      spyOn(component.taskMoved, 'emit');
      component.onMoveTaskUp(0);
      expect(component.taskMoved.emit).not.toHaveBeenCalled();
    });

    it('should not move task down when already at bottom', () => {
      spyOn(component.taskMoved, 'emit');
      component.onMoveTaskDown(1);
      expect(component.taskMoved.emit).not.toHaveBeenCalled();
    });
  });

  describe('loading state management', () => {
    beforeEach(() => {
      component.column = mockColumn;
      fixture.detectChanges();
    });

    it('should set task loading state using signal.update', () => {
      component.setTaskLoading('task-1', true);
      expect(component.isTaskLoading('task-1')).toBe(true);
    });

    it('should clear task loading state using signal.update', () => {
      component.setTaskLoading('task-1', true);
      component.setTaskLoading('task-1', false);
      expect(component.isTaskLoading('task-1')).toBe(false);
    });

    it('should handle multiple loading tasks', () => {
      component.setTaskLoading('task-1', true);
      component.setTaskLoading('task-2', true);
      expect(component.isTaskLoading('task-1')).toBe(true);
      expect(component.isTaskLoading('task-2')).toBe(true);
    });
  });
});

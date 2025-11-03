import { Component, OnInit, inject, signal, DestroyRef, viewChildren, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { BoardService } from '../../services/board.service';
import { TaskService } from '../../services/task.service';
import { ColumnService } from '../../services/column.service';
import { ToastService } from '@microservice/ui-common';
import { Board, Column, Task } from '../../models/board.model';
import { ColumnComponent, TaskMoveEvent } from '../column/column.component';

interface TaskMoveSnapshot {
  taskId: string;
  sourceColumnId: string;
  sourcePosition: number;
  task: Task;
}

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    SkeletonModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    ColumnComponent
  ],
  templateUrl: './board-view.component.html',
  styleUrl: './board-view.component.scss'
})
export class BoardViewComponent implements OnInit {
  private boardService = inject(BoardService);
  private taskService = inject(TaskService);
  private columnService = inject(ColumnService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  columnComponents = viewChildren(ColumnComponent);

  board = signal<Board | null>(null);
  loading = signal(true);

  // Connected drop lists for drag-drop
  connectedDropLists = computed(() => {
    const board = this.board();
    if (!board?.columns) return [];
    return board.columns.map(col => `column-${col.id}`);
  });

  // Column creation
  showColumnDialog = signal(false);
  columnTitle = '';
  columnWipLimit: number | undefined = undefined;
  savingColumn = signal(false);

  ngOnInit() {
    const boardId = this.route.snapshot.paramMap.get('id');
    if (boardId) {
      this.loadBoard(boardId);
    }
  }

  loadBoard(id: string) {
    this.loading.set(true);
    this.boardService.getBoard(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (board: Board) => {
          this.board.set(board);
          this.loading.set(false);
        },
        error: (error) => {
          this.toastService.error({
            summary: 'Load Failed',
            detail: 'Unable to load board. Please try again.'
          });
          this.loading.set(false);
          this.router.navigate(['/boards']);
        }
      });
  }

  onTaskMoved(event: TaskMoveEvent): void {
    const currentBoard = this.board();
    if (!currentBoard) return;

    // Create snapshot for rollback
    const snapshot = this.createSnapshot(event, currentBoard);

    // Optimistic update already done by column component
    // Now call API
    this.taskService.moveTask(event.taskId, event.targetColumnId, event.targetPosition)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedTask: Task) => {
          // Success - update task with server response
          this.updateTaskInBoard(updatedTask);
          this.clearTaskLoading(event.taskId);

          this.toastService.success({
            summary: 'Task Moved',
            detail: 'Task position updated successfully'
          });
        },
        error: (error) => {
          // Revert optimistic update
          this.revertTaskMove(snapshot, currentBoard);
          this.clearTaskLoading(event.taskId);

          this.toastService.error({
            summary: 'Move Failed',
            detail: error.error?.message || 'Unable to move task. Please try again.'
          });
        }
      });
  }

  private createSnapshot(event: TaskMoveEvent, board: Board): TaskMoveSnapshot {
    // Find task by ID since it's already been moved optimistically
    let task: Task | undefined;

    // Look in target column (where task was moved to)
    const targetColumn = board.columns?.find(col => col.id === event.targetColumnId);
    task = targetColumn?.tasks?.find(t => t.id === event.taskId);

    // If not found in target, look in source column (shouldn't happen, but safety check)
    if (!task) {
      const sourceColumn = board.columns?.find(col => col.id === event.sourceColumnId);
      task = sourceColumn?.tasks?.find(t => t.id === event.taskId);
    }

    if (!task) {
      throw new Error('Task not found for snapshot');
    }

    return {
      taskId: event.taskId,
      sourceColumnId: event.sourceColumnId,
      sourcePosition: event.sourcePosition,
      task: { ...task }
    };
  }

  private revertTaskMove(snapshot: TaskMoveSnapshot, board: Board): void {
    if (!board.columns) return;

    // Find columns
    const sourceColumn = board.columns.find(col => col.id === snapshot.sourceColumnId);
    const targetColumn = board.columns.find(col =>
      col.tasks?.some(t => t.id === snapshot.taskId)
    );

    if (!sourceColumn || !targetColumn) return;

    // Remove from target
    if (targetColumn.tasks) {
      targetColumn.tasks = targetColumn.tasks.filter(t => t.id !== snapshot.taskId);
    }

    // Add back to source
    if (!sourceColumn.tasks) {
      sourceColumn.tasks = [];
    }
    sourceColumn.tasks.splice(snapshot.sourcePosition, 0, snapshot.task);

    // Trigger change detection
    this.board.set({ ...board });
  }

  private updateTaskInBoard(updatedTask: Task): void {
    const currentBoard = this.board();
    if (!currentBoard?.columns) return;

    // Find and update task
    for (const column of currentBoard.columns) {
      if (column.tasks) {
        const taskIndex = column.tasks.findIndex(t => t.id === updatedTask.id);
        if (taskIndex !== -1) {
          column.tasks[taskIndex] = updatedTask;
          this.board.set({ ...currentBoard });
          return;
        }
      }
    }
  }

  private clearTaskLoading(taskId: string): void {
    // Clear loading state from all columns
    this.columnComponents().forEach(col => {
      col.setTaskLoading(taskId, false);
    });
  }

  onTaskClick(task: Task): void {
    // TODO: Open task detail dialog
    console.log('Task clicked:', task);
  }

  goBack() {
    this.router.navigate(['/boards']);
  }

  // Column creation methods
  openColumnDialog(): void {
    this.columnTitle = '';
    this.columnWipLimit = undefined;
    this.showColumnDialog.set(true);
  }

  closeColumnDialog(): void {
    this.showColumnDialog.set(false);
    this.columnTitle = '';
    this.columnWipLimit = undefined;
  }

  saveColumn(): void {
    const currentBoard = this.board();
    if (!currentBoard) return;

    if (!this.columnTitle.trim()) {
      this.toastService.error({
        summary: 'Validation Error',
        detail: 'Column title is required'
      });
      return;
    }

    this.savingColumn.set(true);
    this.columnService.createColumn({
      boardId: currentBoard.id,
      title: this.columnTitle.trim(),
      wipLimit: this.columnWipLimit
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newColumn: Column) => {
          // Add column to board
          const updatedBoard = { ...currentBoard };
          if (!updatedBoard.columns) {
            updatedBoard.columns = [];
          }
          updatedBoard.columns.push(newColumn);
          this.board.set(updatedBoard);

          this.toastService.success({
            summary: 'Column Created',
            detail: `Column "${newColumn.title}" created successfully`
          });

          this.savingColumn.set(false);
          this.closeColumnDialog();
        },
        error: (error) => {
          this.toastService.error({
            summary: 'Creation Failed',
            detail: error.error?.message || 'Unable to create column. Please try again.'
          });
          this.savingColumn.set(false);
        }
      });
  }
}

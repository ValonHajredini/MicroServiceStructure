import { Component, Input, Output, EventEmitter, signal, ElementRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CdkDropList, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Column, Task } from '../../models/board.model';
import { TaskCard } from '../task-card/task-card';
import { TaskService, CreateTaskDto } from '../../services/task.service';
import { ToastService } from '@microservice/ui-common';

export interface TaskMoveEvent {
  taskId: string;
  targetColumnId: string;
  targetPosition: number;
  sourceColumnId: string;
  sourcePosition: number;
}

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    BadgeModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CdkDropList,
    TaskCard
  ],
  templateUrl: './column.component.html',
  styleUrl: './column.component.scss'
})
export class ColumnComponent {
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) column!: Column;
  @Input() connectedDropLists: string[] = [];

  @Output() taskMoved = new EventEmitter<TaskMoveEvent>();
  @Output() taskClick = new EventEmitter<Task>();
  @Output() taskCreated = new EventEmitter<Task>();

  loadingTasks = signal<Set<string>>(new Set());

  // Task creation
  showTaskDialog = signal(false);
  taskTitle = '';
  taskDescription = '';
  taskPriority: 'low' | 'medium' | 'high' = 'medium';
  taskDueDateString = '';
  savingTask = signal(false);

  priorityOptions = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];

  constructor(private elementRef: ElementRef) {}

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  get dropListId(): string {
    return `column-${this.column.id}`;
  }

  get isWipLimitExceeded(): boolean {
    if (!this.column.wip_limit) return false;
    return (this.column.tasks?.length || 0) >= this.column.wip_limit;
  }

  onDrop(event: CdkDragDrop<Task[]>): void {
    const task = event.item.data as Task;

    // Same column reordering
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.emitTaskMoved(task, this.column.id, event.currentIndex, this.column.id, event.previousIndex);
    }
    // Moving between columns
    else {
      // Check WIP limit before moving
      if (this.isWipLimitExceeded) {
        console.warn('WIP limit exceeded, cannot drop task');
        return;
      }

      const sourceColumnId = task.column_id;
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      this.emitTaskMoved(task, this.column.id, event.currentIndex, sourceColumnId, event.previousIndex);
    }
  }

  private emitTaskMoved(
    task: Task,
    targetColumnId: string,
    targetPosition: number,
    sourceColumnId: string,
    sourcePosition: number
  ): void {
    // Use signal.update() with new Set reference for proper change detection
    this.loadingTasks.update(tasks => {
      const newSet = new Set(tasks);
      newSet.add(task.id);
      return newSet;
    });

    this.taskMoved.emit({
      taskId: task.id,
      targetColumnId,
      targetPosition,
      sourceColumnId,
      sourcePosition
    });
  }

  setTaskLoading(taskId: string, loading: boolean): void {
    // Use signal.update() with new Set reference for proper change detection
    this.loadingTasks.update(tasks => {
      const newSet = new Set(tasks);
      if (loading) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  }

  isTaskLoading(taskId: string): boolean {
    return this.loadingTasks().has(taskId);
  }

  onTaskCardClick(task: Task): void {
    this.taskClick.emit(task);
  }

  onNavigateUp(currentIndex: number): void {
    // Move focus to previous task
    const targetIndex = currentIndex - 1;
    if (targetIndex >= 0) {
      this.focusTaskAtIndex(targetIndex);
    }
  }

  onNavigateDown(currentIndex: number): void {
    // Move focus to next task
    const targetIndex = currentIndex + 1;
    const totalTasks = this.column.tasks?.length || 0;
    if (targetIndex < totalTasks) {
      this.focusTaskAtIndex(targetIndex);
    }
  }

  onMoveTaskUp(currentIndex: number): void {
    // Move task position up (Shift+ArrowUp)
    if (currentIndex <= 0 || !this.column.tasks) return;

    const task = this.column.tasks[currentIndex];
    const targetIndex = currentIndex - 1;

    // Optimistically update UI
    moveItemInArray(this.column.tasks, currentIndex, targetIndex);

    // Emit event for API call
    this.emitTaskMoved(task, this.column.id, targetIndex, this.column.id, currentIndex);

    // Move focus to new position
    setTimeout(() => this.focusTaskAtIndex(targetIndex), 0);
  }

  onMoveTaskDown(currentIndex: number): void {
    // Move task position down (Shift+ArrowDown)
    const totalTasks = this.column.tasks?.length || 0;
    if (currentIndex >= totalTasks - 1 || !this.column.tasks) return;

    const task = this.column.tasks[currentIndex];
    const targetIndex = currentIndex + 1;

    // Optimistically update UI
    moveItemInArray(this.column.tasks, currentIndex, targetIndex);

    // Emit event for API call
    this.emitTaskMoved(task, this.column.id, targetIndex, this.column.id, currentIndex);

    // Move focus to new position
    setTimeout(() => this.focusTaskAtIndex(targetIndex), 0);
  }

  private focusTaskAtIndex(index: number): void {
    // Find task card element by data-task-index attribute
    const taskCards = this.elementRef.nativeElement.querySelectorAll('[data-task-index]');
    const targetCard = Array.from(taskCards).find(
      (el: any) => el.getAttribute('data-task-index') === index.toString()
    ) as HTMLElement;

    if (targetCard) {
      // Focus the first focusable element within the task card
      const focusableElement = targetCard.querySelector('[tabindex]') as HTMLElement;
      if (focusableElement) {
        focusableElement.focus();
      }
    }
  }

  // Task creation methods
  openTaskDialog(): void {
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskPriority = 'medium';
    this.taskDueDateString = '';
    this.showTaskDialog.set(true);
  }

  closeTaskDialog(): void {
    this.showTaskDialog.set(false);
    this.taskTitle = '';
    this.taskDescription = '';
    this.taskPriority = 'medium';
    this.taskDueDateString = '';
  }

  saveTask(): void {
    if (!this.taskTitle.trim()) {
      this.toastService.error({
        summary: 'Validation Error',
        detail: 'Task title is required'
      });
      return;
    }

    const dto: CreateTaskDto = {
      title: this.taskTitle.trim(),
      description: this.taskDescription.trim() || undefined,
      priority: this.taskPriority,
      dueDate: this.taskDueDateString ? new Date(this.taskDueDateString).toISOString() : undefined
    };

    this.savingTask.set(true);
    this.taskService.createTask(this.column.id, dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newTask: Task) => {
          // Add task to column
          if (!this.column.tasks) {
            this.column.tasks = [];
          }
          this.column.tasks.push(newTask);

          this.toastService.success({
            summary: 'Task Created',
            detail: `Task "${newTask.title}" created successfully`
          });

          this.taskCreated.emit(newTask);
          this.savingTask.set(false);
          this.closeTaskDialog();
        },
        error: (error) => {
          this.toastService.error({
            summary: 'Creation Failed',
            detail: error.error?.message || 'Unable to create task. Please try again.'
          });
          this.savingTask.set(false);
        }
      });
  }
}

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDrag } from '@angular/cdk/drag-drop';
import { Task } from '../../models/board.model';

@Component({
  selector: 'app-task-card',
  imports: [CommonModule, CdkDrag],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
})
export class TaskCard {
  task = input.required<Task>();
  isLoading = input<boolean>(false);

  taskClicked = output<Task>();
  navigateUp = output<void>();
  navigateDown = output<void>();
  moveTaskUp = output<Task>();
  moveTaskDown = output<Task>();

  onTaskClick(): void {
    if (!this.isLoading()) {
      this.taskClicked.emit(this.task());
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.isLoading()) return;

    switch (event.key) {
      case 'Enter':
      case ' ': // Space key
        event.preventDefault();
        this.taskClicked.emit(this.task());
        break;
      case 'Escape':
        // Blur to cancel any drag operation
        (event.target as HTMLElement)?.blur();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+ArrowUp: Move task up in column
          this.moveTaskUp.emit(this.task());
        } else {
          // ArrowUp: Navigate focus to previous task
          this.navigateUp.emit();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+ArrowDown: Move task down in column
          this.moveTaskDown.emit(this.task());
        } else {
          // ArrowDown: Navigate focus to next task
          this.navigateDown.emit();
        }
        break;
    }
  }

  getPriorityClass(): string {
    const priority = this.task().priority;
    if (!priority) return 'priority-none';
    return `priority-${priority}`;
  }

  formatDueDate(dueDate?: string): string {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  truncateDescription(description?: string): string {
    if (!description) return '';
    return description.length > 100 ? description.substring(0, 100) + '...' : description;
  }
}

import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule} from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastService, DialogService } from '@microservice/ui-common';
import { BoardService } from '../../services/board.service';
import { Board } from '../../models/board.model';
import { CreateBoardDialogComponent } from '../dialogs/create-board-dialog/create-board-dialog.component';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, SkeletonModule],
  templateUrl: './board-list.component.html',
  styleUrl: './board-list.component.scss'
})
export class BoardListComponent implements OnInit {
  private boardService = inject(BoardService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private dialogService = inject(DialogService);
  private destroyRef = inject(DestroyRef);

  boards = signal<Board[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.loadBoards();
  }

  loadBoards() {
    this.loading.set(true);
    this.boardService.getBoards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (boards: Board[]) => {
          this.boards.set(boards);
          this.loading.set(false);
        },
        error: (error) => {
          this.toastService.error({
            summary: 'Load Failed',
            detail: 'Unable to load boards. Please try again.'
          });
          this.loading.set(false);
        }
      });
  }

  openBoard(board: Board) {
    this.router.navigate(['/boards', board.id]);
  }

  createBoard() {
    this.dialogService.open<Board>(CreateBoardDialogComponent, {
      header: 'Create New Board',
      width: '500px'
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((board) => {
        if (board) {
          this.toastService.success({
            summary: 'Board Created',
            detail: `${board.name} has been created successfully`
          });
          this.router.navigate(['/boards', board.id]);
        }
      });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

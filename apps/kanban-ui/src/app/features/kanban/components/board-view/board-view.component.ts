import { Component, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { BoardService } from '../../services/board.service';
import { ToastService } from '@microservice/ui-common';
import { Board } from '../../models/board.model';
import { ColumnComponent } from '../column/column.component';

@Component({
  selector: 'app-board-view',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, SkeletonModule, TooltipModule, ColumnComponent],
  templateUrl: './board-view.component.html',
  styleUrl: './board-view.component.scss'
})
export class BoardViewComponent implements OnInit {
  private boardService = inject(BoardService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  board = signal<Board | null>(null);
  loading = signal(true);

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

  goBack() {
    this.router.navigate(['/boards']);
  }
}

import { Component, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { BoardService } from '../../../services/board.service';
import { ToastService } from '@microservice/ui-common';

@Component({
  selector: 'app-create-board-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TextareaModule
  ],
  templateUrl: './create-board-dialog.component.html',
  styleUrl: './create-board-dialog.component.scss'
})
export class CreateBoardDialogComponent {
  private fb = inject(FormBuilder);
  private boardService = inject(BoardService);
  private ref = inject(DynamicDialogRef);
  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  form: FormGroup;
  submitting = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]]
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.boardService.createBoard(this.form.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (board) => {
          this.ref.close(board);
        },
        error: (error) => {
          this.toastService.error({
            summary: 'Creation Failed',
            detail: 'Unable to create board. Please try again.'
          });
          this.submitting = false;
        }
      });
  }

  cancel() {
    this.ref.close();
  }
}

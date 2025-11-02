import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading',
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './loading.html',
  styleUrls: ['./loading.scss']
})
export class LoadingComponent {
  @Input() message = 'Loading...';
}

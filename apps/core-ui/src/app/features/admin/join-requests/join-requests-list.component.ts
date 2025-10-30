import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  JoinRequestsService,
  JoinRequest,
} from '../../../core/services/join-requests.service';
import { AuthService } from '../../../core/services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-join-requests-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-requests-list.component.html',
  styleUrls: ['./join-requests-list.component.scss'],
})
export class JoinRequestsListComponent implements OnInit {
  private joinRequestsService = inject(JoinRequestsService);
  private authService = inject(AuthService);

  joinRequests = signal<JoinRequest[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  showRejectModal = signal(false);
  selectedRequest = signal<JoinRequest | null>(null);
  rejectMessage = new FormControl('');
  isProcessing = signal(false);

  ngOnInit() {
    this.loadJoinRequests();
  }

  loadJoinRequests() {
    this.isLoading.set(true);
    this.error.set(null);

    // In a real app, get tenantId from auth state
    // For now, we'll assume it's available in the user object
    const tenantId = 'tenant-001'; // TODO: Get from auth service

    this.joinRequestsService
      .getJoinRequests(tenantId, 1, 20, 'pending')
      .pipe(
        catchError((error) => {
          this.error.set(
            error.error?.message ||
              'Unable to load join requests. Please try again.'
          );
          this.isLoading.set(false);
          return of({ success: false, data: [], meta: { page: 1, limit: 20, total: 0 } });
        })
      )
      .subscribe((response) => {
        this.joinRequests.set(response.data);
        this.isLoading.set(false);
      });
  }

  approveRequest(request: JoinRequest) {
    if (
      !confirm(
        `Are you sure you want to approve ${request.user.firstName} ${request.user.lastName}'s request?`
      )
    ) {
      return;
    }

    this.isProcessing.set(true);

    this.joinRequestsService
      .updateJoinRequest(request.id, {
        action: 'approve',
        adminResponse: 'Welcome to the team!',
      })
      .pipe(
        catchError((error) => {
          alert(
            error.error?.message ||
              'Unable to approve request. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.loadJoinRequests(); // Refresh list
        }
      });
  }

  openRejectModal(request: JoinRequest) {
    this.selectedRequest.set(request);
    this.rejectMessage.setValue('');
    this.showRejectModal.set(true);
  }

  closeRejectModal() {
    this.showRejectModal.set(false);
    this.selectedRequest.set(null);
  }

  submitReject() {
    const request = this.selectedRequest();
    if (!request) return;

    this.isProcessing.set(true);

    this.joinRequestsService
      .updateJoinRequest(request.id, {
        action: 'reject',
        adminResponse: this.rejectMessage.value || undefined,
      })
      .pipe(
        catchError((error) => {
          alert(
            error.error?.message ||
              'Unable to reject request. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.closeRejectModal();
          this.loadJoinRequests(); // Refresh list
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

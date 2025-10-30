import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  catchError,
} from 'rxjs/operators';
import { of } from 'rxjs';
import {
  TenantsService,
  Tenant,
} from '../../core/services/tenants.service';
import {
  JoinRequestsService,
  CreateJoinRequestRequest,
} from '../../core/services/join-requests.service';

@Component({
  selector: 'app-join-organization',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './join-organization.component.html',
  styleUrls: ['./join-organization.component.scss'],
})
export class JoinOrganizationComponent {
  private tenantsService = inject(TenantsService);
  private joinRequestsService = inject(JoinRequestsService);
  private router = inject(Router);

  searchControl = new FormControl('');
  searchResults = signal<Tenant[]>([]);
  isSearching = signal(false);
  searchError = signal<string | null>(null);

  selectedTenant = signal<Tenant | null>(null);
  showConfirmModal = signal(false);
  joinMessage = new FormControl('');
  isSubmitting = signal(false);
  submitError = signal<string | null>(null);
  submitSuccess = signal(false);

  ngOnInit() {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((query) => (query?.length ?? 0) >= 2),
        switchMap((query) => {
          this.isSearching.set(true);
          this.searchError.set(null);
          return this.tenantsService.searchTenants(query!).pipe(
            catchError((error) => {
              this.searchError.set(
                error.error?.message || 'Unable to search. Please try again.'
              );
              this.isSearching.set(false);
              return of({ success: false, data: [], meta: { count: 0, limit: 20 } });
            })
          );
        })
      )
      .subscribe((response) => {
        this.searchResults.set(response.data);
        this.isSearching.set(false);
      });

    // Clear results when query is too short
    this.searchControl.valueChanges
      .pipe(filter((query) => (query?.length ?? 0) < 2))
      .subscribe(() => {
        this.searchResults.set([]);
        this.searchError.set(null);
      });
  }

  openConfirmModal(tenant: Tenant) {
    this.selectedTenant.set(tenant);
    this.showConfirmModal.set(true);
    this.joinMessage.setValue('');
    this.submitError.set(null);
    this.submitSuccess.set(false);
  }

  closeConfirmModal() {
    this.showConfirmModal.set(false);
    this.selectedTenant.set(null);
  }

  submitJoinRequest() {
    const tenant = this.selectedTenant();
    if (!tenant) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const requestData: CreateJoinRequestRequest = {
      message: this.joinMessage.value || undefined,
    };

    this.joinRequestsService
      .createJoinRequest(tenant.id, requestData)
      .pipe(
        catchError((error) => {
          let errorMessage = 'Unable to send request. Please try again.';

          if (error.status === 409) {
            if (error.error?.message?.includes('member')) {
              errorMessage = 'You are already a member of this organization';
            } else if (error.error?.message?.includes('pending')) {
              errorMessage = 'You already have a pending request to this organization';
            }
          } else if (error.status === 400) {
            errorMessage = 'Organization not found';
          }

          this.submitError.set(errorMessage);
          this.isSubmitting.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isSubmitting.set(false);
          this.submitSuccess.set(true);

          setTimeout(() => {
            this.closeConfirmModal();
            this.router.navigate(['/dashboard']);
          }, 2000);
        }
      });
  }
}

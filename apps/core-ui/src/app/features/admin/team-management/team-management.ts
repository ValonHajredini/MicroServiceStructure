import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService, TeamUser } from '../../../core/services/team.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  JoinRequestsService,
  JoinRequest,
} from '../../../core/services/join-requests.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './team-management.html',
  styleUrl: './team-management.scss',
})
export class TeamManagement implements OnInit {
  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private joinRequestsService = inject(JoinRequestsService);
  private router = inject(Router);

  // State
  users = signal<TeamUser[]>([]);
  joinRequests = signal<JoinRequest[]>([]);
  isLoading = signal(false);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  currentUserId = '';
  isAdmin = false;
  selectedTab = signal(0);

  // Modal states
  showChangeRoleModal = signal(false);
  showRemoveUserModal = signal(false);
  showInviteModal = signal(false);
  selectedUser = signal<TeamUser | null>(null);
  selectedRole = new FormControl('user');

  ngOnInit() {
    this.checkAdminRole();
    this.loadUsers();
    if (this.isAdmin) {
      this.loadJoinRequests();
    }
  }

  checkAdminRole() {
    const user = this.authService.getUserFromToken();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUserId = user.id;
    this.isAdmin = user.roles?.includes('admin') || false;
  }

  loadUsers() {
    this.isLoading.set(true);
    this.error.set(null);

    const tenantId = this.authService.getUserTenantId();
    if (!tenantId) {
      this.error.set('Unable to load team members');
      this.isLoading.set(false);
      return;
    }

    this.teamService
      .getTeamMembers(tenantId)
      .pipe(
        catchError((error) => {
          this.error.set(
            error.error?.error?.message ||
              'Unable to load team members. Please try again.'
          );
          this.isLoading.set(false);
          return of({ success: false, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
        })
      )
      .subscribe((response) => {
        this.users.set(response.data);
        this.isLoading.set(false);
      });
  }

  loadJoinRequests() {
    const tenantId = this.authService.getUserTenantId();
    if (!tenantId) return;

    this.joinRequestsService
      .getJoinRequests(tenantId, 1, 20, 'pending')
      .pipe(
        catchError(() => {
          return of({ success: false, data: [], meta: { page: 1, limit: 20, total: 0 } });
        })
      )
      .subscribe((response) => {
        this.joinRequests.set(response.data);
      });
  }

  // Tab navigation
  selectTab(tabIndex: number) {
    this.selectedTab.set(tabIndex);
  }

  // Role management
  openChangeRoleDialog(user: TeamUser) {
    this.selectedUser.set(user);
    this.selectedRole.setValue(user.role === 'admin' ? 'user' : 'admin');
    this.showChangeRoleModal.set(true);
  }

  closeChangeRoleModal() {
    this.showChangeRoleModal.set(false);
    this.selectedUser.set(null);
  }

  submitChangeRole() {
    const user = this.selectedUser();
    const newRole = this.selectedRole.value;
    if (!user || !newRole) return;

    this.isProcessing.set(true);

    this.teamService
      .changeUserRole(user.id, newRole)
      .pipe(
        catchError((error) => {
          alert(
            error.error?.error?.message ||
              'Unable to change user role. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.closeChangeRoleModal();
          this.loadUsers();
        }
      });
  }

  // User removal
  openRemoveDialog(user: TeamUser) {
    this.selectedUser.set(user);
    this.showRemoveUserModal.set(true);
  }

  closeRemoveUserModal() {
    this.showRemoveUserModal.set(false);
    this.selectedUser.set(null);
  }

  submitRemoveUser() {
    const user = this.selectedUser();
    if (!user) return;

    const tenantId = this.authService.getUserTenantId();
    if (!tenantId) return;

    this.isProcessing.set(true);

    this.teamService
      .removeUser(tenantId, user.id)
      .pipe(
        catchError((error) => {
          alert(
            error.error?.error?.message ||
              'Unable to remove user. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.closeRemoveUserModal();
          this.loadUsers();
        }
      });
  }

  // Invite user (navigate to invitation page or show modal)
  openInviteDialog() {
    // For now, navigate to a dedicated invitation page
    // In a real app, this might open a modal
    this.router.navigate(['/admin/invite-user']);
  }

  // Join requests actions
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
            error.error?.error?.message ||
              'Unable to approve request. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.loadJoinRequests();
          this.loadUsers(); // Refresh users list
        }
      });
  }

  rejectRequest(request: JoinRequest) {
    const message = prompt(
      `Reject ${request.user.firstName} ${request.user.lastName}'s request? Enter optional message:`
    );
    if (message === null) return; // User cancelled

    this.isProcessing.set(true);

    this.joinRequestsService
      .updateJoinRequest(request.id, {
        action: 'reject',
        adminResponse: message || undefined,
      })
      .pipe(
        catchError((error) => {
          alert(
            error.error?.error?.message ||
              'Unable to reject request. Please try again.'
          );
          this.isProcessing.set(false);
          return of(null);
        })
      )
      .subscribe((response) => {
        if (response) {
          this.isProcessing.set(false);
          this.loadJoinRequests();
        }
      });
  }

  // Utility methods
  isCurrentUser(userId: string): boolean {
    return userId === this.currentUserId;
  }

  getStatusClass(status: string): string {
    return status.toLowerCase();
  }

  getRoleClass(role: string): string {
    return role.toLowerCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

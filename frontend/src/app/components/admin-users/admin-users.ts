import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { UserDto } from '../../models/product.model';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>User Management</h1>
        <div class="filter-bar">
          <button class="filter-btn" [class.active]="filter() === ''" (click)="loadUsers('')">All</button>
          <button class="filter-btn" [class.active]="filter() === 'ADMIN'" (click)="loadUsers('ADMIN')">Admin</button>
          <button class="filter-btn" [class.active]="filter() === 'CORPORATE'" (click)="loadUsers('CORPORATE')">Corporate</button>
          <button class="filter-btn" [class.active]="filter() === 'INDIVIDUAL'" (click)="loadUsers('INDIVIDUAL')">Individual</button>
        </div>
      </div>

      <div class="table-card card">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Gender</th><th>Store</th><th>Created</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.id }}</td>
                <td>{{ u.firstName }} {{ u.lastName }}</td>
                <td>{{ u.email }}</td>
                <td><span class="role-badge" [class]="'role-' + u.role.toLowerCase()">{{ u.role }}</span></td>
                <td>{{ u.gender || '-' }}</td>
                <td>{{ u.storeName || '-' }}</td>
                <td>{{ u.createdAt | date:'short' }}</td>
                <td>
                  @if (u.role !== 'ADMIN') {
                    <button class="btn-sm" [class]="u.suspended ? 'success' : 'warn'" (click)="toggleSuspend(u)">
                      {{ u.suspended ? 'Reactivate' : 'Suspend' }}
                    </button>
                    <button class="btn-sm danger" (click)="deleteUser(u.id)">Delete</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (users().length === 0) {
          <div class="empty">No users found</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 700; }
    .filter-bar { display: flex; gap: 6px; }
    .filter-btn {
      padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 6px;
      background: white; font-size: 13px; cursor: pointer; font-weight: 500; transition: all 0.15s;
    }
    .filter-btn.active { background: #4361ee; color: white; border-color: #4361ee; }
    .table-card { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 600; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 12px 16px; border-top: 1px solid #f1f5f9; }
    tr:hover td { background: #f8fafc; }
    .role-badge { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; }
    .role-admin { background: #fee2e2; color: #dc2626; }
    .role-corporate { background: #dbeafe; color: #2563eb; }
    .role-individual { background: #dcfce7; color: #16a34a; }
    .btn-sm { padding: 4px 10px; border: none; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 500; }
    .btn-sm.danger { background: #fee2e2; color: #dc2626; }
    .btn-sm.danger:hover { background: #fecaca; }
    .btn-sm.warn { background: #fef3c7; color: #d97706; margin-right: 4px; }
    .btn-sm.warn:hover { background: #fde68a; }
    .btn-sm.success { background: #dcfce7; color: #16a34a; margin-right: 4px; }
    .btn-sm.success:hover { background: #bbf7d0; }
    .empty { padding: 40px; text-align: center; color: #9ca3af; }
  `]
})
export class AdminUsersComponent implements OnInit {
  users = signal<UserDto[]>([]);
  filter = signal('');

  constructor(private adminService: AdminService) {}

  ngOnInit() { this.loadUsers(''); }

  loadUsers(role: string) {
    this.filter.set(role);
    if (role) {
      this.adminService.getUsersByRole(role).subscribe(u => this.users.set(u));
    } else {
      this.adminService.getAllUsers().subscribe(u => this.users.set(u));
    }
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.adminService.deleteUser(id).subscribe(() => this.loadUsers(this.filter()));
    }
  }

  toggleSuspend(user: UserDto) {
    const newState = !user.suspended;
    this.adminService.suspendUser(user.id, newState).subscribe(() => this.loadUsers(this.filter()));
  }
}

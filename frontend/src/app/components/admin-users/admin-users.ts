import { Component, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AdminCreateUserRequest, UserDto } from '../../models/product.model';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="filter-bar">
          <button class="filter-btn" [class.active]="filter() === ''" (click)="loadUsers('')">
            All
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'ADMIN'"
            (click)="loadUsers('ADMIN')"
          >
            Admin
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'CORPORATE'"
            (click)="loadUsers('CORPORATE')"
          >
            Corporate
          </button>
          <button
            class="filter-btn"
            [class.active]="filter() === 'INDIVIDUAL'"
            (click)="loadUsers('INDIVIDUAL')"
          >
            Individual
          </button>
        </div>
      </div>

      <div class="create-card card">
        <div class="card-header">
          <div>
            <h2>Create Account</h2>
            <p>Create individual or corporate accounts directly from the admin panel.</p>
          </div>
        </div>

        <form class="create-grid" (ngSubmit)="createUser()">
          <div class="field">
            <label>First Name</label>
            <input [(ngModel)]="form.firstName" name="firstName" required />
          </div>
          <div class="field">
            <label>Last Name</label>
            <input [(ngModel)]="form.lastName" name="lastName" required />
          </div>
          <div class="field">
            <label>Email</label>
            <input [(ngModel)]="form.email" name="email" type="email" required />
          </div>
          <div class="field">
            <label>Password</label>
            <input
              [(ngModel)]="form.password"
              name="password"
              type="password"
              minlength="6"
              required
            />
          </div>
          <div class="field">
            <label>Role</label>
            <select [(ngModel)]="form.role" name="role">
              <option value="INDIVIDUAL">Individual</option>
              <option value="CORPORATE">Corporate</option>
            </select>
          </div>
          <div class="field">
            <label>Gender</label>
            <select [(ngModel)]="form.gender" name="gender">
              <option value="">Unspecified</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>
          @if (form.role === 'CORPORATE') {
            <div class="field">
              <label>Store Name</label>
              <input [(ngModel)]="form.storeName" name="storeName" required />
            </div>
            <div class="field field-span-2">
              <label>Store Description</label>
              <input [(ngModel)]="form.storeDescription" name="storeDescription" />
            </div>
          }
          <div class="create-actions">
            <button class="create-btn" type="submit" [disabled]="saving()">
              {{ saving() ? 'Creating...' : 'Create User' }}
            </button>
            <button class="reset-btn" type="button" (click)="resetForm()">Reset</button>
          </div>
        </form>

        @if (createSuccess()) {
          <div class="feedback success">{{ createSuccess() }}</div>
        }
        @if (createError()) {
          <div class="feedback error">{{ createError() }}</div>
        }
      </div>

      <div class="table-card card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Gender</th>
              <th>Store</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.id }}</td>
                <td>{{ u.firstName }} {{ u.lastName }}</td>
                <td>{{ u.email }}</td>
                <td>
                  <span class="role-badge" [class]="'role-' + u.role.toLowerCase()">{{
                    u.role
                  }}</span>
                </td>
                <td>{{ u.gender || '-' }}</td>
                <td>{{ u.storeName || '-' }}</td>
                <td>{{ u.createdAt | date: 'short' }}</td>
                <td>
                  @if (u.role !== 'ADMIN') {
                    <button
                      class="btn-sm"
                      [class]="u.suspended ? 'success' : 'warn'"
                      (click)="toggleSuspend(u)"
                    >
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
  styles: [
    `
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .create-card {
        padding: 20px;
        margin-bottom: 20px;
      }
      .card-header {
        margin-bottom: 16px;
      }
      .card-header h2 {
        font-size: 18px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .card-header p {
        color: #666;
        font-size: 13px;
        margin-top: 4px;
      }
      .create-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px 16px;
        align-items: end;
      }
      .field label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #666;
        margin-bottom: 6px;
      }
      .field input,
      .field select {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        background: #ffffeb;
        color: #1a1a1a;
        font-size: 14px;
      }
      .field input:focus,
      .field select:focus {
        outline: none;
        border-color: #034f46;
      }
      .create-actions {
        display: flex;
        gap: 10px;
      }
      .field-span-2 {
        grid-column: span 2;
      }
      .create-btn,
      .reset-btn {
        height: 40px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
      .create-btn {
        border: none;
        background: #034f46;
        color: #ffffeb;
        padding: 0 16px;
      }
      .create-btn:disabled {
        opacity: 0.65;
        cursor: wait;
      }
      .reset-btn {
        border: 1px solid #c8c8b4;
        background: #ffffeb;
        color: #666;
        padding: 0 16px;
      }
      .feedback {
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
      }
      .feedback.success {
        background: #dcfce7;
        color: #166534;
      }
      .feedback.error {
        background: #fee2e2;
        color: #b91c1c;
      }
      .filter-bar {
        display: flex;
        gap: 6px;
      }
      .filter-btn {
        padding: 6px 14px;
        border: 1px solid #c8c8b4;
        border-radius: 6px;
        background: #ffffeb;
        font-size: 13px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s;
        color: #666;
      }
      .filter-btn.active {
        background: #034f46;
        color: white;
        border-color: #034f46;
      }
      .table-card {
        padding: 0;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      th {
        background: #f5f5e1;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #666;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      td {
        padding: 12px 16px;
        border-top: 1px solid #d5d5c0;
      }
      tr:hover td {
        background: #f5f5e1;
      }
      .role-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
      }
      .role-admin {
        background: #fee2e2;
        color: #dc2626;
      }
      .role-corporate {
        background: #034f46;
        color: #ffffeb;
      }
      .role-individual {
        background: #dcfce7;
        color: #16a34a;
      }
      .btn-sm {
        padding: 4px 10px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
      }
      .btn-sm.danger {
        background: #fee2e2;
        color: #dc2626;
      }
      .btn-sm.danger:hover {
        background: #fecaca;
      }
      .btn-sm.warn {
        background: #fef3c7;
        color: #d97706;
        margin-right: 4px;
      }
      .btn-sm.warn:hover {
        background: #fde68a;
      }
      .btn-sm.success {
        background: #dcfce7;
        color: #16a34a;
        margin-right: 4px;
      }
      .btn-sm.success:hover {
        background: #bbf7d0;
      }
      .empty {
        padding: 40px;
        text-align: center;
        color: #666;
      }
      @media (max-width: 960px) {
        .page-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .create-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
      @media (max-width: 640px) {
        .create-grid {
          grid-template-columns: 1fr;
        }
        .create-actions {
          flex-direction: column;
        }
        .create-btn,
        .reset-btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  users = signal<UserDto[]>([]);
  filter = signal('');
  saving = signal(false);
  createSuccess = signal('');
  createError = signal('');

  form: AdminCreateUserRequest = this.emptyForm();

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsers('');
  }

  loadUsers(role: string) {
    this.filter.set(role);
    if (role) {
      this.adminService.getUsersByRole(role).subscribe((u) => this.users.set(u));
    } else {
      this.adminService.getAllUsers().subscribe((u) => this.users.set(u));
    }
  }

  createUser() {
    if (this.form.role === 'CORPORATE' && !this.form.storeName?.trim()) {
      this.createError.set('Store name is required for corporate accounts.');
      return;
    }

    this.saving.set(true);
    this.createSuccess.set('');
    this.createError.set('');

    this.adminService.createUser(this.buildCreatePayload()).subscribe({
      next: (created) => {
        const storePart =
          created.role === 'CORPORATE' && created.storeName
            ? ` Store "${created.storeName}" is waiting for approval.`
            : '';
        this.createSuccess.set(`${created.role} account created for ${created.email}.${storePart}`);
        this.resetForm();
        this.loadUsers(created.role);
        this.saving.set(false);
      },
      error: (err) => {
        this.createError.set(err?.error?.message || err?.error?.error || 'Could not create user.');
        this.saving.set(false);
      },
    });
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

  resetForm() {
    this.form = this.emptyForm();
  }

  private emptyForm(): AdminCreateUserRequest {
    return {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      gender: '',
      role: 'INDIVIDUAL',
      storeName: '',
      storeDescription: '',
    };
  }

  private buildCreatePayload(): AdminCreateUserRequest {
    if (this.form.role === 'CORPORATE') {
      return {
        ...this.form,
        storeName: this.form.storeName?.trim() || '',
        storeDescription: this.form.storeDescription?.trim() || '',
      };
    }

    return {
      firstName: this.form.firstName,
      lastName: this.form.lastName,
      email: this.form.email,
      password: this.form.password,
      gender: this.form.gender,
      role: this.form.role,
    };
  }
}

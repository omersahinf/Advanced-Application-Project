/**
 * Admin Users — pixel-parity replica of Flower Prototype.html §AdmUsers.
 *
 * Inventory (verbatim from prototype):
 *   Root: padding "12px 32px 40px".
 *
 *   Toolbar row (flex gap 10 mb 16):
 *     [.input  placeholder="Search users…" maxWidth 320]
 *     [.select role filter (180w): All roles | Admin | Corporate |
 *                                   Individual]
 *     spacer
 *     [btn  <Icon download/> Export]
 *     [btn-primary <Icon plus/> Invite corporate]
 *
 *   Table card (padding 0):
 *     Columns: User · Role · Status · Joined · Actions (right, w 150)
 *     User cell:   <Avatar name size=32/> · (name weight 600) / (email
 *                  mono 11.5px text-3)
 *     Role:        <RoleBadge role={role}/>   (badge-err/corp/ind)
 *     Status:      <StatusPill ACTIVE/CANCELLED>  (← suspended flag)
 *     Joined:      fmtDate(createdAt) text-2
 *     Actions:     btn-ghost btn-sm  Suspend|Unsuspend
 *                  btn-ghost btn-sm btn-danger  <Icon trash/>
 *
 * Adaptations:
 *   - "Export" wires to AdminService.exportUsers() (blob download).
 *   - "Invite corporate" opens a <flower-dialog> with the existing
 *     create-user form (the backend needs email/password/names, so
 *     we keep that functionality but move it out of the page flow).
 *   - ADMIN accounts cannot be deleted/suspended (server-side rule).
 *
 * AdminService.{getAllUsers, getUsersByRole, createUser, suspendUser,
 *              deleteUser, exportUsers} are all untouched.
 */
import { Component, OnInit, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AdminCreateUserRequest, UserDto } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { FlowerDialogComponent } from '../../shared/flower-dialog/flower-dialog';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    FlowerIconComponent,
    StatusPillComponent,
    FlowerDialogComponent,
  ],
  template: `
    <div class="page">
      <!-- Toolbar row ————————————————————————————————— -->
      <div class="toolbar">
        <input
          class="input search-input"
          placeholder="Search users…"
          [(ngModel)]="searchQuery"
          [ngModelOptions]="{ standalone: true }"
        />
        <select
          class="select role-select"
          [(ngModel)]="roleFilter"
          [ngModelOptions]="{ standalone: true }"
          (change)="loadUsers(roleFilter)"
        >
          <option value="ALL">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="CORPORATE">Corporate</option>
          <option value="INDIVIDUAL">Individual</option>
        </select>
        <div class="toolbar-spacer"></div>
        <button type="button" class="btn" (click)="exportUsers()" [disabled]="exporting()">
          <flower-icon name="download" [size]="13" />
          {{ exporting() ? 'Exporting…' : 'Export' }}
        </button>
        <button type="button" class="btn btn-primary" (click)="openInvite()">
          <flower-icon name="plus" [size]="13" />
          Invite corporate
        </button>
      </div>

      <!-- Users table ——————————————————————————————— -->
      <div class="card users-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of visibleUsers(); track u.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <span class="avatar" aria-hidden="true">{{ initials(u) }}</span>
                      <div class="user-name-block">
                        <div class="user-name">{{ u.firstName }} {{ u.lastName }}</div>
                        <div class="user-email">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class]="'badge-' + roleClass(u.role)">
                      {{ u.role }}
                    </span>
                  </td>
                  <td>
                    <status-pill [status]="u.suspended ? 'CANCELLED' : 'ACTIVE'" />
                  </td>
                  <td class="joined">{{ u.createdAt | date: 'MMM d, y' }}</td>
                  <td class="actions-col">
                    @if (u.role !== 'ADMIN') {
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost"
                        (click)="toggleSuspend(u)"
                      >
                        {{ u.suspended ? 'Unsuspend' : 'Suspend' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-ghost btn-danger"
                        (click)="deleteUser(u.id)"
                        aria-label="Delete user"
                      >
                        <flower-icon name="trash" [size]="13" />
                      </button>
                    }
                  </td>
                </tr>
              }
              @if (visibleUsers().length === 0) {
                <tr>
                  <td colspan="5" class="empty-row">No users match these filters.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Invite dialog ——————————————————————————————— -->
      @if (inviteOpen()) {
        <flower-dialog
          [title]="form.role === 'CORPORATE' ? 'Invite corporate' : 'Create account'"
          [width]="560"
          (closed)="closeInvite()"
        >
          <form class="invite-grid" (ngSubmit)="createUser()">
            <div class="field">
              <label class="label">First name</label>
              <input
                class="input"
                [(ngModel)]="form.firstName"
                name="firstName"
                required
              />
            </div>
            <div class="field">
              <label class="label">Last name</label>
              <input
                class="input"
                [(ngModel)]="form.lastName"
                name="lastName"
                required
              />
            </div>
            <div class="field field-span-2">
              <label class="label">Email</label>
              <input
                class="input"
                [(ngModel)]="form.email"
                name="email"
                type="email"
                required
              />
            </div>
            <div class="field field-span-2">
              <label class="label">Password</label>
              <input
                class="input"
                [(ngModel)]="form.password"
                name="password"
                type="password"
                minlength="6"
                required
              />
            </div>
            <div class="field">
              <label class="label">Role</label>
              <select class="select" [(ngModel)]="form.role" name="role">
                <option value="INDIVIDUAL">Individual</option>
                <option value="CORPORATE">Corporate</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Gender</label>
              <select class="select" [(ngModel)]="form.gender" name="gender">
                <option value="">Unspecified</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            @if (form.role === 'CORPORATE') {
              <div class="field field-span-2">
                <label class="label">Store name</label>
                <input
                  class="input"
                  [(ngModel)]="form.storeName"
                  name="storeName"
                  required
                />
              </div>
              <div class="field field-span-2">
                <label class="label">Store description</label>
                <input
                  class="input"
                  [(ngModel)]="form.storeDescription"
                  name="storeDescription"
                />
              </div>
            }
            @if (createError()) {
              <div class="feedback error field-span-2">{{ createError() }}</div>
            }
          </form>
          <div footer>
            <button type="button" class="btn" (click)="closeInvite()">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="saving()"
              (click)="createUser()"
            >
              {{ saving() ? 'Creating…' : 'Create user' }}
            </button>
          </div>
        </flower-dialog>
      }

      @if (createSuccess()) {
        <div class="toast success">{{ createSuccess() }}</div>
      }
    </div>
  `,
  styleUrls: ['./admin-users.scss'],
})
export class AdminUsersComponent implements OnInit {
  users = signal<UserDto[]>([]);
  roleFilter = 'ALL';
  searchQuery = '';
  saving = signal(false);
  exporting = signal(false);
  createSuccess = signal('');
  createError = signal('');
  inviteOpen = signal(false);

  form: AdminCreateUserRequest = this.emptyForm();

  visibleUsers = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.users();
    if (!q) return list;
    return list.filter((u) => {
      const hay = `${u.firstName} ${u.lastName} ${u.email} ${u.storeName ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  });

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadUsers('ALL');
  }

  loadUsers(role: string) {
    const normalized = role && role !== 'ALL' ? role : '';
    this.roleFilter = role;
    if (normalized) {
      this.adminService.getUsersByRole(normalized).subscribe((u) => this.users.set(u));
    } else {
      this.adminService.getAllUsers().subscribe((u) => this.users.set(u));
    }
  }

  initials(u: UserDto): string {
    const f = u.firstName?.[0] ?? '';
    const l = u.lastName?.[0] ?? '';
    return `${f}${l}`.toUpperCase() || '?';
  }

  roleClass(role: string): 'err' | 'corp' | 'ind' {
    if (role === 'ADMIN') return 'err';
    if (role === 'CORPORATE') return 'corp';
    return 'ind';
  }

  openInvite() {
    this.form = this.emptyForm();
    this.form.role = 'CORPORATE';
    this.createError.set('');
    this.inviteOpen.set(true);
  }

  closeInvite() {
    this.inviteOpen.set(false);
  }

  createUser() {
    if (!this.form.firstName.trim() || !this.form.email.trim() || !this.form.password) {
      this.createError.set('First name, email, and password are required.');
      return;
    }
    if (this.form.role === 'CORPORATE' && !this.form.storeName?.trim()) {
      this.createError.set('Store name is required for corporate accounts.');
      return;
    }
    this.saving.set(true);
    this.createSuccess.set('');
    this.createError.set('');
    this.adminService.createUser(this.buildCreatePayload()).subscribe({
      next: (created) => {
        this.createSuccess.set(`${created.role} account created for ${created.email}.`);
        setTimeout(() => this.createSuccess.set(''), 4000);
        this.inviteOpen.set(false);
        this.saving.set(false);
        this.loadUsers(this.roleFilter);
      },
      error: (err) => {
        this.createError.set(
          err?.error?.message || err?.error?.error || 'Could not create user.',
        );
        this.saving.set(false);
      },
    });
  }

  toggleSuspend(user: UserDto) {
    this.adminService
      .suspendUser(user.id, !user.suspended)
      .subscribe(() => this.loadUsers(this.roleFilter));
  }

  deleteUser(id: number) {
    if (confirm('Delete this user? This cannot be undone.')) {
      this.adminService.deleteUser(id).subscribe(() => this.loadUsers(this.roleFilter));
    }
  }

  exportUsers() {
    this.exporting.set(true);
    this.adminService.exportUsers().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
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

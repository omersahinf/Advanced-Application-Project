import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UpdateProfileRequest } from '../../models/product.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="profile-grid">
        <div class="profile-card">
          <div class="avatar-big" aria-hidden="true">{{ initial() }}</div>
          <div class="profile-name">{{ displayName() }}</div>
          <div class="profile-email">{{ auth.currentEmail() }}</div>
          <span class="role-chip">{{ auth.currentRole() }}</span>
        </div>

        <div class="settings-card">
          <h3>Account details</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Email</label>
              <input type="text" [value]="auth.currentEmail()" disabled />
            </div>
            <div class="form-group">
              <label>Role</label>
              <input type="text" [value]="auth.currentRole()" disabled />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>First name</label>
              <input type="text" [(ngModel)]="profile.firstName" />
            </div>
            <div class="form-group">
              <label>Last name</label>
              <input type="text" [(ngModel)]="profile.lastName" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Gender</label>
              <select [(ngModel)]="profile.gender">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            @if (auth.isIndividual()) {
              <div class="form-group">
                <label>Age</label>
                <input type="number" [(ngModel)]="profile.age" />
              </div>
              <div class="form-group">
                <label>City</label>
                <input type="text" [(ngModel)]="profile.city" />
              </div>
            }
          </div>
          <button class="btn-save" type="button" (click)="save()" [disabled]="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          @if (successMsg) {
            <p class="msg-success">{{ successMsg }}</p>
          }
          @if (errorMsg) {
            <p class="msg-error">{{ errorMsg }}</p>
          }
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./profile.scss'],
})
export class ProfileComponent implements OnInit {
  profile: UpdateProfileRequest = {};
  saving = false;
  successMsg = '';
  errorMsg = '';

  displayName = computed(
    () => this.auth.currentFirstName() || this.auth.currentEmail()?.split('@')[0] || 'Guest',
  );

  initial = computed(() =>
    (this.auth.currentFirstName() || this.auth.currentEmail() || 'U')
      .trim()
      .charAt(0)
      .toUpperCase(),
  );

  constructor(public auth: AuthService) {}

  ngOnInit() {}

  save() {
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    this.auth.updateProfile(this.profile).subscribe({
      next: () => {
        this.successMsg = 'Profile updated successfully';
        this.saving = false;
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Failed to update profile';
        this.saving = false;
      },
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UpdateProfileRequest } from '../../models/product.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-page">
      <h2>Profile Settings</h2>
      <div class="profile-card">
        <div class="form-group">
          <label>Email</label>
          <input type="text" [value]="auth.currentEmail()" disabled />
        </div>
        <div class="form-group">
          <label>Role</label>
          <input type="text" [value]="auth.currentRole()" disabled />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" [(ngModel)]="profile.firstName" />
          </div>
          <div class="form-group">
            <label>Last Name</label>
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
        <button class="btn-save" (click)="save()" [disabled]="saving">
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </button>
        @if (successMsg) {
          <p class="success">{{ successMsg }}</p>
        }
        @if (errorMsg) {
          <p class="error">{{ errorMsg }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 600px; margin: 2rem auto; padding: 0 1rem; }
    .profile-card { background: #1e1e2e; border-radius: 12px; padding: 2rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; color: #9ca3af; margin-bottom: 0.3rem; font-size: 0.9rem; }
    .form-group input, .form-group select { width: 100%; padding: 0.6rem; border-radius: 6px; background: #111827; color: white; border: 1px solid #374151; box-sizing: border-box; }
    .form-group input:disabled { opacity: 0.5; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .btn-save { width: 100%; padding: 0.75rem; background: #7c3aed; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    .btn-save:disabled { opacity: 0.5; }
    .success { color: #6ee7b7; margin-top: 0.75rem; text-align: center; }
    .error { color: #fca5a5; margin-top: 0.75rem; text-align: center; }
  `]
})
export class ProfileComponent implements OnInit {
  profile: UpdateProfileRequest = {};
  saving = false;
  successMsg = '';
  errorMsg = '';

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
      }
    });
  }
}

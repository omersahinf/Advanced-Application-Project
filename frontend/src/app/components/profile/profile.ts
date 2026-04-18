/*
 * NOTE ON PROTOTYPE PARITY
 *  Flower Prototype.html has no dedicated Profile page — the avatar
 *  dropdown only surfaces "My orders" and "My reviews" for individuals.
 *  Our Angular app still exposes /profile via the topbar "Account settings"
 *  entry (topHeader), so this page has to exist. Since there is no
 *  prototype reference, we render it in the Flower visual language:
 *
 *    - serif heading handled by TopHeader (same pattern as other pages)
 *    - 2-column card layout: identity card (left) · form card (right)
 *    - primitives reused: .card, labeled .input/.select, .btn-primary,
 *      section-label, --hover helper background, accent-tinted avatar
 *
 *  Backend contract is untouched — AuthService.updateProfile() still
 *  receives the same UpdateProfileRequest payload.
 */
import { Component, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UpdateProfileRequest } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, FlowerIconComponent],
  template: `
    <div class="profile-grid">
      <aside class="identity-card card">
        <div class="avatar-big" aria-hidden="true">{{ initial() }}</div>
        <div class="identity-name">{{ displayName() }}</div>
        <div class="identity-email">{{ auth.currentEmail() }}</div>
        <span class="role-chip">
          <flower-icon name="shield" [size]="11" />
          {{ auth.currentRole() }}
        </span>

        <div class="identity-meta">
          <div class="section-label">Account</div>
          <div class="meta-row">
            <span>Status</span>
            <span class="mono">Active</span>
          </div>
          @if (auth.currentCompany()) {
            <div class="meta-row">
              <span>Company</span>
              <span>{{ auth.currentCompany() }}</span>
            </div>
          }
        </div>
      </aside>

      <section class="form-card card">
        <header class="form-head">
          <h2>Account details</h2>
          <p>Update your profile information. Email and role are managed by admins.</p>
        </header>

        <div class="form-grid">
          <div class="field">
            <label class="label">Email</label>
            <input type="text" class="input" [value]="auth.currentEmail()" disabled />
          </div>
          <div class="field">
            <label class="label">Role</label>
            <input type="text" class="input" [value]="auth.currentRole()" disabled />
          </div>

          <div class="field">
            <label class="label">First name</label>
            <input type="text" class="input" [(ngModel)]="profile.firstName" name="firstName" />
          </div>
          <div class="field">
            <label class="label">Last name</label>
            <input type="text" class="input" [(ngModel)]="profile.lastName" name="lastName" />
          </div>

          <div class="field">
            <label class="label">Gender</label>
            <select class="select" [(ngModel)]="profile.gender" name="gender">
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          @if (auth.isIndividual()) {
            <div class="field">
              <label class="label">Age</label>
              <input type="number" class="input" [(ngModel)]="profile.age" name="age" />
            </div>
            <div class="field field-wide">
              <label class="label">City</label>
              <input type="text" class="input" [(ngModel)]="profile.city" name="city" />
            </div>
          }
        </div>

        <div class="form-footer">
          <button class="btn btn-primary" type="button" (click)="save()" [disabled]="saving">
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
          @if (successMsg) {
            <span class="msg msg-ok">
              <flower-icon name="check" [size]="13" />
              {{ successMsg }}
            </span>
          }
          @if (errorMsg) {
            <span class="msg msg-err">{{ errorMsg }}</span>
          }
        </div>
      </section>
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

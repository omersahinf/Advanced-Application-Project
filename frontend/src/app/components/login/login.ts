import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="brand" aria-label="Flower">
        <svg
          class="brand-logo"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <rect x="2" y="14" width="3.5" height="8" rx="1" fill="var(--fathom)" />
          <rect x="7" y="9" width="3.5" height="13" rx="1" fill="var(--fathom)" />
          <rect x="12" y="11" width="3.5" height="11" rx="1" fill="var(--fathom)" />
          <rect x="17" y="6" width="3.5" height="16" rx="1" fill="var(--fathom)" />
        </svg>
        <span class="brand-name">Flower</span>
      </div>

      <div class="login-card">
        <h1 class="card-title">Get started</h1>
        <p class="card-subtitle">E-commerce analytics with a multi-agent AI assistant.</p>

        <div class="demo-grid">
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials for Admin"
            (click)="fillDemo('admin@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">🔑</span>
            Continue as Admin
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials for Corporate"
            (click)="fillDemo('corporate1@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">💼</span>
            Continue as Corporate
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials for Individual"
            (click)="fillDemo('user1@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">👤</span>
            Continue as Individual
          </button>
        </div>

        <div class="or-divider">or</div>

        <form (ngSubmit)="onLogin()" aria-label="Login form">
          <div class="field">
            <label for="login-email" class="sr-only">Email</label>
            <input
              id="login-email"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
              aria-required="true"
            />
          </div>
          <div class="field">
            <label for="login-password" class="sr-only">Password</label>
            <input
              id="login-password"
              type="password"
              [(ngModel)]="password"
              name="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              required
              aria-required="true"
            />
          </div>

          @if (error()) {
            <div class="error-msg" role="alert">{{ error() }}</div>
          }

          <button
            type="submit"
            class="submit-btn"
            [disabled]="loading()"
            [attr.aria-busy]="loading()"
          >
            {{ loading() ? 'Signing in...' : 'Continue' }}
          </button>
        </form>
      </div>

      <div class="demo-footer">
        <span class="demo-footer-label">Demo accounts</span>
        admin@example.com · corporate1@example.com · user1@example.com
        <br />
        password: <code>password</code>
      </div>

      <div class="course-footer">CSE 214 · Advanced Application Development · Final Project</div>
    </div>
  `,
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.getDashboardRoute()]);
    }
  }

  fillDemo(email: string) {
    this.email = email;
    this.password = 'password';
    this.onLogin();
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.error.set('Please fill in all fields');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.auth.saveToken(res);
        this.router.navigate([this.auth.getDashboardRoute()]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.error || 'Invalid credentials');
        this.loading.set(false);
      },
    });
  }
}

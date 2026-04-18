import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="brand">
        <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="16" width="5.5" height="11" rx="1.5" fill="#1a1a1a" />
          <rect x="10" y="9" width="5.5" height="18" rx="1.5" fill="#1a1a1a" />
          <rect x="18" y="4" width="5.5" height="23" rx="1.5" fill="#1a1a1a" />
          <rect x="26" y="11" width="5.5" height="16" rx="1.5" fill="#1a1a1a" />
        </svg>
        <span class="brand-name">Flower</span>
      </div>

      <div class="login-card">
        <h1 class="card-title">Get started</h1>

        <div class="demo-grid">
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials"
            (click)="fillDemo('admin@example.com')"
          >
            <span class="demo-icon">🔑</span>
            Continue as Admin
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials"
            (click)="fillDemo('corporate1@example.com')"
          >
            <span class="demo-icon">🏢</span>
            Continue as Corporate
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Fill demo credentials"
            (click)="fillDemo('user1@example.com')"
          >
            <span class="demo-icon">👤</span>
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
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 2rem;
        padding-top: 5rem;
        padding-bottom: 4rem;
        background: #e4e4d0;
        gap: 2.5rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        position: relative;
        top: -1.3rem;
      }
      .brand-name {
        font-size: 2rem;
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: -0.5px;
      }

      .login-card {
        max-width: 34rem;
        width: 100%;
        padding: 2rem;
        background: #ffffeb;
        border: none;
        border-radius: 32px;
        box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
      }

      .card-title {
        font-size: 2.5rem;
        font-weight: 400;
        color: #1a1a1a;
        text-align: center;
        margin-bottom: 1.875rem;
        font-family: Georgia, 'Times New Roman', serif;
      }

      .demo-grid {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .demo-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 1rem;
        border: 2px solid #1a1a1a;
        border-radius: 8px;
        background: transparent;
        cursor: pointer;
        transition: opacity 0.2s;
        font-size: 1rem;
        font-weight: 600;
        font-family: inherit;
        color: #1a1a1a;
      }
      .demo-btn:hover {
        opacity: 0.7;
      }
      .demo-icon {
        font-size: 1.1rem;
      }

      .or-divider {
        text-align: center;
        color: #1a1a1a;
        font-size: 0.9rem;
        padding: 1.875rem 0;
      }

      .field {
        margin-bottom: 0;
      }
      .field input {
        width: 100%;
        padding: 12px 0;
        border: none;
        border-bottom: 2px solid #1a1a1a;
        border-radius: 0;
        background: transparent;
        font-size: 1rem;
        font-family: inherit;
        color: #1a1a1a;
        outline: none;
        transition: border-color 0.2s;
      }
      .field input::placeholder {
        color: #999;
      }
      .field input:focus {
        border-bottom-color: #034f46;
        box-shadow: none;
      }

      .error-msg {
        margin-top: 12px;
        padding: 10px;
        background: #fef2f2;
        border-radius: 10px;
        text-align: center;
        color: #dc2626;
        font-size: 14px;
      }

      .submit-btn {
        width: 100%;
        padding: 1rem;
        font-size: 1rem;
        font-weight: 600;
        margin-top: 1.875rem;
        border-radius: 8px;
        border: none;
        background: #034f46;
        color: #ffffeb;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.2s;
      }
      .submit-btn:hover {
        background: #e4c4f7;
      }
      .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 640px) {
        .login-page {
          padding: 1rem;
          padding-top: 2rem;
          gap: 1.5rem;
        }
        .login-card {
          padding: 1.5rem !important;
          max-width: 100% !important;
        }
      }
    `,
  ],
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

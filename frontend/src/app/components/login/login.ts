/**
 * Login page — pixel-parity replica of Flower Prototype.html §LoginPage.
 *
 * Inventory (verbatim):
 *   Page: background #e4e4d0 (--bg), column flex, padding
 *     `5rem 2rem 4rem`, gap `2.5rem`.
 *   Brand row: FlowerLogo size 40 + serif 700 30px "Flower",
 *     nudged up `top: -1.3rem`.
 *   Card: width 100%, max-width 34rem, background #ffffeb,
 *     border 1px --border, border-radius 32, padding 2rem,
 *     shadow `0 1px 4px rgba(0,0,0,0.04)`.
 *   Title: "Get started" — serif 500 2.5rem/1.1, letter-spacing -1,
 *     centered, margin-bottom 8.
 *   Subtitle: "E-commerce analytics with a multi-agent AI assistant."
 *     14/text-2, centered, margin-bottom 28.
 *   Quick-login buttons (column, gap 10):
 *     "🔑 Continue as Admin" · "💼 Continue as Corporate" ·
 *     "👤 Continue as Individual"
 *     padding 1rem, border 2px #1a1a1a, radius 8, transparent bg,
 *     font 600 14 var(--sans).
 *   "or" divider: center, padding 20px 0, text-2, 13.
 *   Fields: column, gap 22; bottom-border-only inputs, padding
 *     10px 2px, font-size 15, placeholder "Enter your email" /
 *     "Enter your password".
 *   Error: background var(--err-bg), color var(--err), font-size 13.
 *   Submit: "Continue" / "Signing in…", fathom bg #034f46, color
 *     #ffffeb, radius 8, padding 1rem, font 600 15.
 *   Inside-card demo footer: top-border separator, mono 11.5,
 *     "Demo accounts · password is password" then demo emails in
 *     a flex-wrap row.
 *   Course footer: 12/text-3, centered, margin-top -10,
 *     "CSE 214 · Advanced Application Development · Final Project".
 *
 * Adaptations:
 *   - The prototype calls a local CANNED auth. We keep the real
 *     AuthService login round-trip (POST /api/auth/login) and
 *     hydrate from the response. No backend change.
 *   - Quick-login buttons fill the email/password fields and fire
 *     the same submit path, exactly like prototype `quickLogin`.
 */
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FlowerLogoComponent } from '../../shared/flower-logo/flower-logo';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, FlowerLogoComponent],
  template: `
    <div class="login-page">
      <div class="brand" aria-label="Flower">
        <flower-logo [size]="40" />
        <span class="brand-name">Flower</span>
      </div>

      <div class="login-card">
        <h1 class="card-title">Get started</h1>
        <p class="card-subtitle">E-commerce analytics with a multi-agent AI assistant.</p>

        <div class="demo-grid">
          <button
            type="button"
            class="demo-btn"
            aria-label="Continue as Admin"
            [disabled]="loading()"
            (click)="fillDemo('admin@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">🔑</span>
            Continue as Admin
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Continue as Corporate"
            [disabled]="loading()"
            (click)="fillDemo('corporate1@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">💼</span>
            Continue as Corporate
          </button>
          <button
            type="button"
            class="demo-btn"
            aria-label="Continue as Individual"
            [disabled]="loading()"
            (click)="fillDemo('user1@example.com')"
          >
            <span class="demo-icon" aria-hidden="true">👤</span>
            Continue as Individual
          </button>
        </div>

        <div class="or-divider">or</div>

        <form (ngSubmit)="onLogin()" aria-label="Login form" novalidate>
          <div class="fields">
            <label for="login-email" class="sr-only">Email</label>
            <input
              id="login-email"
              class="flat-input"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Enter your email"
              autocomplete="email"
              required
              aria-required="true"
            />
            <label for="login-password" class="sr-only">Password</label>
            <input
              id="login-password"
              class="flat-input"
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
            {{ loading() ? 'Signing in\u2026' : 'Continue' }}
          </button>
        </form>

        <div class="demo-footer">
          Demo accounts · password is <b>password</b>
          <div class="demo-emails">
            <span>admin&#64;example.com</span>
            <span>corporate1&#64;example.com</span>
            <span>user1&#64;example.com</span>
          </div>
        </div>
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

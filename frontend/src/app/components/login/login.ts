import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card card">
        <div class="login-header">
          <h1>E-Commerce Analytics</h1>
          <p>Sign in to your account</p>
        </div>

        <form (ngSubmit)="onLogin()">
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" placeholder="Enter your email" required>
          </div>
          <div class="field">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" placeholder="Enter your password" required>
          </div>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
            {{ loading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="demo-accounts">
          <p class="demo-title">Demo Accounts</p>
          <div class="demo-grid">
            <button class="demo-btn admin" (click)="fillDemo('admin@example.com')">
              <span class="demo-role">ADMIN</span>
              <span class="demo-email">admin&#64;example.com</span>
            </button>
            <button class="demo-btn corporate" (click)="fillDemo('corporate1@example.com')">
              <span class="demo-role">CORPORATE</span>
              <span class="demo-email">corporate1&#64;example.com</span>
            </button>
            <button class="demo-btn individual" (click)="fillDemo('user1@example.com')">
              <span class="demo-role">INDIVIDUAL</span>
              <span class="demo-email">user1&#64;example.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: calc(100vh - 56px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .login-card { max-width: 420px; width: 100%; padding: 40px; }
    .login-header { text-align: center; margin-bottom: 32px; }
    .login-header h1 { font-size: 24px; margin-bottom: 4px; }
    .login-header p { color: #64748b; font-size: 14px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #374151; }
    .error-msg { margin-bottom: 16px; padding: 10px; background: #fef2f2; border-radius: 8px; text-align: center; }
    .btn-full { width: 100%; padding: 12px; font-size: 15px; margin-top: 8px; }
    .demo-accounts { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .demo-title { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; text-align: center; }
    .demo-grid { display: flex; flex-direction: column; gap: 8px; }
    .demo-btn {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px;
      background: white; cursor: pointer; transition: all 0.15s; text-align: left;
    }
    .demo-btn:hover { border-color: #4361ee; background: #f8fafc; }
    .demo-role { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; }
    .demo-email { font-size: 13px; color: #374151; }
    .admin .demo-role { background: #fee2e2; color: #dc2626; }
    .corporate .demo-role { background: #dbeafe; color: #2563eb; }
    .individual .demo-role { background: #dcfce7; color: #16a34a; }
  `]
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router) {
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
      }
    });
  }
}

import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar" role="navigation" aria-label="Main navigation">
      <div class="nav-inner">
        <a class="logo" routerLink="/" aria-label="Home">
          <span class="logo-icon">📊</span> E-Commerce Analytics
        </a>

        @if (auth.isLoggedIn()) {
          <button class="hamburger" (click)="toggleMenu()" [class.open]="menuOpen()" aria-label="Toggle navigation menu">
            <span></span><span></span><span></span>
          </button>
          <div class="nav-links" [class.show]="menuOpen()">
            <!-- Shared -->
            <a routerLink="/products" routerLinkActive="active">Products</a>
            <a routerLink="/chat" routerLinkActive="active">AI Chat</a>

            <!-- Admin links -->
            @if (auth.isAdmin()) {
              <span class="separator">|</span>
              <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
              <a routerLink="/admin/users" routerLinkActive="active">Users</a>
              <a routerLink="/admin/stores" routerLinkActive="active">Stores</a>
              <a routerLink="/admin/categories" routerLinkActive="active">Categories</a>
              <a routerLink="/admin/analytics" routerLinkActive="active">Analytics</a>
            }

            <!-- Corporate links -->
            @if (auth.isCorporate()) {
              <span class="separator">|</span>
              <a routerLink="/corporate" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
              <a routerLink="/corporate/products" routerLinkActive="active">My Products</a>
              <a routerLink="/corporate/orders" routerLinkActive="active">Orders</a>
              <a routerLink="/corporate/reviews" routerLinkActive="active">Reviews</a>
            }

            <!-- Individual links -->
            @if (auth.isIndividual()) {
              <span class="separator">|</span>
              <a routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Dashboard</a>
              <a routerLink="/cart" routerLinkActive="active">Cart</a>
              <a routerLink="/orders" routerLinkActive="active">My Orders</a>
              <a routerLink="/reviews" routerLinkActive="active">My Reviews</a>
            }
          </div>

          <div class="user-info" [class.show]="menuOpen()">
            <span class="role-badge" [class]="'role-' + (auth.currentRole() || '').toLowerCase()">
              {{ auth.currentRole() }}
            </span>
            <a class="btn-profile" routerLink="/profile">{{ auth.currentEmail() }}</a>
            <button class="btn-logout" (click)="auth.logout()" aria-label="Logout">Logout</button>
          </div>
        }
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 0 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .nav-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      height: 56px;
      gap: 24px;
    }
    .logo {
      font-weight: 700;
      font-size: 16px;
      color: #1a1a2e;
      text-decoration: none;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .logo-icon { font-size: 20px; }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      overflow-x: auto;
    }
    .nav-links a {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .nav-links a:hover { color: #1a1a2e; background: #f1f5f9; }
    .nav-links a.active { color: #4361ee; background: #eef2ff; }
    .separator { color: #e5e7eb; font-size: 14px; margin: 0 4px; }
    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
      white-space: nowrap;
    }
    .role-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .role-admin { background: #fee2e2; color: #dc2626; }
    .role-corporate { background: #dbeafe; color: #2563eb; }
    .role-individual { background: #dcfce7; color: #16a34a; }
    .btn-profile { font-size: 13px; color: #64748b; text-decoration: none; }
    .btn-profile:hover { color: #4361ee; }
    .btn-logout {
      background: none;
      border: 1px solid #e5e7eb;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      color: #64748b;
      transition: all 0.15s;
    }
    .btn-logout:hover { background: #f1f5f9; color: #1a1a2e; }
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 4px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      margin-left: auto;
    }
    .hamburger span {
      display: block;
      width: 20px;
      height: 2px;
      background: #374151;
      border-radius: 1px;
      transition: all 0.25s;
    }
    .hamburger.open span:nth-child(1) { transform: rotate(45deg) translate(4px, 4px); }
    .hamburger.open span:nth-child(2) { opacity: 0; }
    .hamburger.open span:nth-child(3) { transform: rotate(-45deg) translate(4px, -4px); }
    @media (max-width: 768px) {
      .nav-inner { flex-wrap: wrap; height: auto; min-height: 56px; padding: 8px 0; }
      .hamburger { display: flex; }
      .nav-links, .user-info { display: none; width: 100%; }
      .nav-links.show, .user-info.show { display: flex; }
      .nav-links.show { flex-direction: column; gap: 2px; padding: 8px 0; }
      .nav-links.show a { padding: 10px 12px; }
      .separator { display: none; }
      .user-info.show { flex-wrap: wrap; padding: 8px 0; border-top: 1px solid #e5e7eb; }
    }
  `]
})
export class NavbarComponent {
  menuOpen = signal(false);
  constructor(public auth: AuthService) {}

  toggleMenu() {
    this.menuOpen.update(v => !v);
  }
}

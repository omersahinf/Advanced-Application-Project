import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-header">
        <a class="logo" routerLink="/" aria-label="Home">
          <span class="logo-icon">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="14" width="5" height="10" rx="1.5" fill="#1a1a1a" />
              <rect x="9" y="8" width="5" height="16" rx="1.5" fill="#1a1a1a" />
              <rect x="16" y="4" width="5" height="20" rx="1.5" fill="#1a1a1a" />
              <rect x="23" y="10" width="5" height="14" rx="1.5" fill="#1a1a1a" />
            </svg>
          </span>
          @if (!collapsed()) {
            <span class="logo-text">Flower</span>
          }
        </a>
        <button class="collapse-btn" (click)="toggleCollapse()" aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            @if (collapsed()) {
              <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="2" fill="none" />
            } @else {
              <path d="M10 3l-5 5 5 5" stroke="currentColor" stroke-width="2" fill="none" />
            }
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        @if (!collapsed()) {
          <div class="nav-section-label">MAIN MENU</div>
        }

        @if (auth.isAdmin()) {
          <a
            routerLink="/admin"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-item"
          >
            <span class="nav-icon">🏠</span>
            @if (!collapsed()) {
              <span>Dashboard</span>
            }
          </a>
        }
        @if (auth.isCorporate()) {
          <a
            routerLink="/corporate"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-item"
          >
            <span class="nav-icon">🏠</span>
            @if (!collapsed()) {
              <span>Dashboard</span>
            }
          </a>
        }
        @if (auth.isIndividual()) {
          <a
            routerLink="/dashboard"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-item"
          >
            <span class="nav-icon">🏠</span>
            @if (!collapsed()) {
              <span>Dashboard</span>
            }
          </a>
        }

        <a routerLink="/chat" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">🤖</span>
          @if (!collapsed()) {
            <span>AI Assistant</span>
            <span class="badge-new">New</span>
          }
        </a>

        @if (auth.isAdmin()) {
          <a routerLink="/admin/analytics" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📊</span>
            @if (!collapsed()) {
              <span>Analytics</span>
            }
          </a>
        }

        @if (auth.isCorporate()) {
          <a routerLink="/corporate/orders" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🛒</span>
            @if (!collapsed()) {
              <span>Orders</span>
            }
          </a>
          <a routerLink="/corporate/products" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📦</span>
            @if (!collapsed()) {
              <span>Products</span>
            }
          </a>
        }

        @if (auth.isIndividual()) {
          <a routerLink="/products" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📦</span>
            @if (!collapsed()) {
              <span>Products</span>
            }
          </a>
        }

        @if (auth.isAdmin()) {
          @if (!collapsed()) {
            <div class="nav-section-label">MANAGEMENT</div>
          } @else {
            <div class="nav-divider"></div>
          }
          <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">👥</span>
            @if (!collapsed()) {
              <span>Users</span>
            }
          </a>
          <a routerLink="/admin/stores" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🏪</span>
            @if (!collapsed()) {
              <span>Stores</span>
            }
          </a>
          <a routerLink="/admin/categories" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📁</span>
            @if (!collapsed()) {
              <span>Categories</span>
            }
          </a>
          <a routerLink="/admin/settings" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⚙️</span>
            @if (!collapsed()) {
              <span>Settings</span>
            }
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">📦</span>
            @if (!collapsed()) {
              <span>Products</span>
            }
          </a>
        }

        @if (auth.isCorporate()) {
          @if (!collapsed()) {
            <div class="nav-section-label">MANAGEMENT</div>
          } @else {
            <div class="nav-divider"></div>
          }
          <a routerLink="/corporate/reviews" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">⭐</span>
            @if (!collapsed()) {
              <span>Reviews</span>
            }
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-item">
            <span class="nav-icon">🛍️</span>
            @if (!collapsed()) {
              <span>Browse Store</span>
            }
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <button class="logout-btn" (click)="auth.logout()" [attr.aria-label]="'Logout'">
          <span class="nav-icon">🚪</span>
          @if (!collapsed()) {
            <span>Logout</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [
    `
      .sidebar {
        width: 250px;
        min-height: 100vh;
        background: #ffffeb;
        display: flex;
        flex-direction: column;
        border-right: 1px solid #d5d5c0;
        transition: width 0.2s ease;
        flex-shrink: 0;
        position: sticky;
        top: 0;
        height: 100vh;
        overflow-y: auto;
      }
      .sidebar.collapsed {
        width: 68px;
      }

      .sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 16px 16px;
      }
      .logo {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: #1a1a1a;
      }
      .logo-text {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: #1a1a1a;
      }
      .collapse-btn {
        background: none;
        border: none;
        color: #a8a29e;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        transition: color 0.15s;
      }
      .collapse-btn:hover {
        color: #1a1a1a;
      }

      .sidebar-nav {
        flex: 1;
        padding: 0 12px;
        overflow-y: auto;
      }

      .nav-section-label {
        font-size: 10px;
        font-weight: 700;
        color: #a8a29e;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        padding: 20px 12px 8px;
      }
      .nav-divider {
        height: 1px;
        background: #d5d5c0;
        margin: 12px 8px;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: #666;
        text-decoration: none;
        transition: all 0.15s;
        margin-bottom: 2px;
        white-space: nowrap;
      }
      .nav-item:hover {
        color: #1a1a1a;
        background: #e4e4d0;
      }
      .nav-item.active {
        color: #034f46;
        background: rgba(3, 79, 70, 0.08);
        font-weight: 600;
      }
      .nav-icon {
        font-size: 18px;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }

      .badge-new {
        margin-left: auto;
        background: #034f46;
        color: #ffffeb;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        letter-spacing: 0.3px;
      }

      .sidebar-footer {
        padding: 12px;
        border-top: 1px solid #d5d5c0;
      }
      .user-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        margin-bottom: 8px;
      }
      .user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: linear-gradient(135deg, #034f46, #1c6056);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .user-details {
        min-width: 0;
      }
      .user-email {
        font-size: 12px;
        color: #1a1a1a;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }
      .user-role {
        font-size: 11px;
        color: #a8a29e;
        display: flex;
        align-items: center;
        gap: 5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .role-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .dot-admin {
        background: #e63946;
      }
      .dot-corporate {
        background: #034f46;
      }
      .dot-individual {
        background: #16a34a;
      }

      .logout-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 500;
        color: #a8a29e;
        background: none;
        border: none;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      .logout-btn:hover {
        color: #e63946;
        background: rgba(230, 57, 70, 0.06);
      }

      .sidebar.collapsed .sidebar-header {
        justify-content: center;
        padding: 20px 8px 16px;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .sidebar.collapsed .collapse-btn {
        /* Keep visible so user can re-expand */
      }
      .sidebar.collapsed .nav-item {
        justify-content: center;
        padding: 10px;
      }
      .sidebar.collapsed .logout-btn {
        justify-content: center;
        padding: 10px;
      }
      .sidebar.collapsed .sidebar-footer {
        padding: 8px;
      }

      /* Mobile: auto-collapse sidebar to save space */
      @media (max-width: 768px) {
        .sidebar {
          width: 68px;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 50;
        }
        .sidebar.collapsed {
          width: 68px;
        }
        .sidebar:not(.collapsed) {
          width: 220px;
          box-shadow: 2px 0 12px rgba(0, 0, 0, 0.15);
        }
        .sidebar .logo-text,
        .sidebar .nav-item span:not(.nav-icon),
        .sidebar .nav-section-label,
        .sidebar .badge-new {
          display: var(--mobile-text-display, none);
        }
        .sidebar:not(.collapsed) .logo-text,
        .sidebar:not(.collapsed) .nav-item span:not(.nav-icon),
        .sidebar:not(.collapsed) .nav-section-label,
        .sidebar:not(.collapsed) .badge-new {
          display: initial;
        }
      }
    `,
  ],
})
export class NavbarComponent {
  collapsed = signal(false);
  constructor(public auth: AuthService) {}

  toggleCollapse() {
    this.collapsed.update((v) => !v);
  }
}

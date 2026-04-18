import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LayoutService } from '../../services/layout.service';
import { FlowerLogoComponent } from '../../shared/flower-logo/flower-logo';

type NavItem = {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
  badge?: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FlowerLogoComponent],
  template: `
    @if (layout.mobileDrawerOpen()) {
      <div class="mobile-backdrop" (click)="layout.closeMobileDrawer()" aria-hidden="true"></div>
    }

    <aside
      class="sidebar"
      [class.collapsed]="layout.sidebarCollapsed()"
      [class.mobile-open]="layout.mobileDrawerOpen()"
      aria-label="Primary navigation"
    >
      <div class="sidebar-header">
        <a
          class="brand-link"
          routerLink="/"
          (click)="layout.closeMobileDrawer()"
          aria-label="Flower home"
        >
          <flower-logo [size]="24" />
          <span class="brand-name">Flower</span>
        </a>
        <button
          class="collapse-btn"
          type="button"
          (click)="layout.toggleCollapsed()"
          aria-label="Collapse sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3l-5 5 5 5"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>

      <button
        class="collapsed-expand"
        type="button"
        (click)="layout.toggleCollapsed()"
        aria-label="Expand sidebar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 4h10M3 8h10M3 12h10"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <nav class="sidebar-nav" aria-label="Sections">
        @for (section of sections(); track section.title) {
          <div class="nav-section">{{ section.title }}</div>
          @for (item of section.items; track item.route) {
            <a
              class="nav-item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              (click)="layout.closeMobileDrawer()"
              [attr.title]="item.label"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="badge-new">{{ item.badge }}</span>
              }
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar" aria-hidden="true">{{ initial() }}</div>
          <div class="user-meta">
            <div class="user-name">{{ displayName() }}</div>
            <div class="user-email">{{ auth.currentEmail() }}</div>
          </div>
          <button
            class="icon-btn danger"
            type="button"
            (click)="auth.logout()"
            aria-label="Log out"
            title="Log out"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `,
  styleUrls: ['./navbar.scss'],
})
export class NavbarComponent {
  constructor(
    public auth: AuthService,
    public layout: LayoutService,
  ) {}

  readonly sections = computed<NavSection[]>(() => {
    if (this.auth.isAdmin()) return this.adminNav;
    if (this.auth.isCorporate()) return this.corporateNav;
    return this.individualNav;
  });

  displayName = computed(
    () => this.auth.currentFirstName() || this.auth.currentEmail()?.split('@')[0] || 'Guest',
  );

  initial = computed(() =>
    (this.auth.currentFirstName() || this.auth.currentEmail() || 'U')
      .trim()
      .charAt(0)
      .toUpperCase(),
  );

  // ── Nav config — mirrors FLOWER_DESIGN_SYSTEM.md §1.7.2, scoped to routes
  //    that actually exist. Items pointing at non-existent routes are omitted
  //    (no backend changes) and can be added in later steps.

  private readonly individualNav: NavSection[] = [
    {
      title: 'Shop',
      items: [
        { label: 'Dashboard', icon: '🏠', route: '/dashboard', exact: true },
        { label: 'Products', icon: '🛍️', route: '/products' },
        { label: 'Cart', icon: '🛒', route: '/cart' },
        { label: 'Orders', icon: '📦', route: '/orders' },
        { label: 'Reviews', icon: '⭐', route: '/reviews' },
        { label: 'Profile', icon: '👤', route: '/profile' },
      ],
    },
    {
      title: 'AI',
      items: [{ label: 'Analytics Chat', icon: '✨', route: '/chat', badge: 'Text2SQL' }],
    },
  ];

  private readonly corporateNav: NavSection[] = [
    {
      title: 'Store',
      items: [
        { label: 'Dashboard', icon: '🏠', route: '/corporate', exact: true },
        { label: 'Products', icon: '🛍️', route: '/corporate/products' },
        { label: 'Orders', icon: '📦', route: '/corporate/orders' },
        { label: 'Reviews', icon: '⭐', route: '/corporate/reviews' },
        { label: 'Profile', icon: '👤', route: '/profile' },
      ],
    },
    {
      title: 'Browse',
      items: [{ label: 'Browse Store', icon: '🏬', route: '/products' }],
    },
    {
      title: 'AI',
      items: [{ label: 'Analytics Chat', icon: '✨', route: '/chat', badge: 'Text2SQL' }],
    },
  ];

  private readonly adminNav: NavSection[] = [
    {
      title: 'Platform',
      items: [
        { label: 'Dashboard', icon: '🏠', route: '/admin', exact: true },
        { label: 'Users', icon: '👥', route: '/admin/users' },
        { label: 'Stores', icon: '🏪', route: '/admin/stores' },
        { label: 'Categories', icon: '📁', route: '/admin/categories' },
      ],
    },
    {
      title: 'Insight',
      items: [
        { label: 'Analytics', icon: '📊', route: '/admin/analytics' },
        { label: 'Analytics Chat', icon: '✨', route: '/chat', badge: 'Text2SQL' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', icon: '⚙️', route: '/admin/settings' },
        { label: 'Profile', icon: '👤', route: '/profile' },
      ],
    },
  ];
}

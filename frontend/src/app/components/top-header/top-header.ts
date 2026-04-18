import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LayoutService } from '../../services/layout.service';

type Role = 'INDIVIDUAL' | 'CORPORATE' | 'ADMIN';

/** Titles/subtitles shown in the topbar, keyed by route prefix (longest match wins). */
const ROUTE_META: Array<{ prefix: string; title: string; sub: string }> = [
  { prefix: '/admin/users', title: 'Users', sub: 'List, suspend, and invite corporate accounts.' },
  { prefix: '/admin/stores', title: 'Stores', sub: 'Activate, close, and audit every store.' },
  { prefix: '/admin/categories', title: 'Categories', sub: 'Hierarchical taxonomy for products.' },
  { prefix: '/admin/analytics', title: 'Analytics', sub: 'Cross-store and customer segmentation.' },
  { prefix: '/admin/settings', title: 'Settings', sub: 'Platform-wide configuration.' },
  { prefix: '/admin', title: 'Platform Overview', sub: 'All stores, users, and revenue across Flower.' },
  { prefix: '/corporate/products', title: 'Products', sub: 'Manage your catalog — add, edit, discontinue.' },
  { prefix: '/corporate/orders', title: 'Orders', sub: 'Confirm, ship, and close fulfilment.' },
  { prefix: '/corporate/reviews', title: 'Reviews', sub: 'Reply to feedback from your shoppers.' },
  { prefix: '/corporate', title: 'Store Dashboard', sub: 'KPIs for your store, updated live.' },
  { prefix: '/products', title: 'Products', sub: 'Browse and buy from active Flower stores.' },
  { prefix: '/cart', title: 'Cart', sub: 'Review items, update quantities, check out.' },
  { prefix: '/checkout', title: 'Checkout', sub: 'Finish your purchase.' },
  { prefix: '/orders', title: 'My Orders', sub: 'Track shipments and revisit past purchases.' },
  { prefix: '/reviews', title: 'My Reviews', sub: `What you've shared with sellers and shoppers.` },
  { prefix: '/dashboard', title: 'Dashboard', sub: 'Your spending at a glance.' },
  { prefix: '/profile', title: 'Profile', sub: 'Your account details and preferences.' },
  { prefix: '/chat', title: 'Analytics Chat', sub: 'Ask in natural language — a multi-agent pipeline answers.' },
];

/** Demo accounts used by the topbar role switcher. */
const DEMO_ACCOUNTS: Record<Role, string> = {
  INDIVIDUAL: 'user1@example.com',
  CORPORATE: 'corporate1@example.com',
  ADMIN: 'admin@example.com',
};

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="topbar" role="banner">
      <button
        class="hamburger"
        type="button"
        (click)="layout.toggleMobileDrawer()"
        aria-label="Open navigation"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <div class="title-block">
        <h1>{{ meta().title }}</h1>
        @if (meta().sub) {
          <p class="subtitle">{{ meta().sub }}</p>
        }
      </div>

      <div
        class="role-switcher"
        role="tablist"
        aria-label="Switch demo role"
      >
        @for (role of roles; track role) {
          <button
            type="button"
            role="tab"
            class="role-option"
            [class.active]="auth.currentRole() === role"
            [attr.aria-selected]="auth.currentRole() === role"
            [disabled]="switching()"
            (click)="switchRole(role)"
            [title]="'Switch to ' + role + ' demo account'"
          >
            {{ shortRole(role) }}
          </button>
        }
      </div>

      <button class="icon-btn" type="button" aria-label="Notifications" title="Notifications">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span class="bell-dot" aria-hidden="true"></span>
      </button>

      <button
        class="ai-chip"
        type="button"
        (click)="openChat()"
        title="Ask Flower AI (Text2SQL)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2l2.09 5.26L20 9.27l-4.5 3.9L17 20l-5-3.5L7 20l1.5-6.83L4 9.27l5.91-2.01L12 2z" />
        </svg>
        Ask Flower AI
      </button>

      @if (auth.isIndividual()) {
        <a class="icon-btn" routerLink="/cart" aria-label="Cart" title="Cart">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          @if (cart.cartCount() > 0) {
            <span class="cart-badge">{{ cart.cartCount() }}</span>
          }
        </a>
      }

      <div class="avatar-wrap" (mouseleave)="menuOpen.set(false)">
        <button
          type="button"
          class="avatar-trigger"
          (click)="toggleMenu($event)"
          [attr.aria-expanded]="menuOpen()"
          aria-haspopup="menu"
        >
          <div class="avatar" aria-hidden="true">{{ initial() }}</div>
          <div class="avatar-meta">
            <div class="avatar-name">{{ displayName() }}</div>
            <div class="avatar-role">{{ auth.currentRole() }}</div>
          </div>
          <svg
            class="avatar-caret"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        @if (menuOpen()) {
          <div class="avatar-menu" role="menu" (click)="$event.stopPropagation()">
            <div class="menu-header">
              <div class="menu-name">{{ displayName() }}</div>
              <div class="menu-email">{{ auth.currentEmail() }}</div>
            </div>

            <a
              class="menu-item"
              routerLink="/profile"
              role="menuitem"
              (click)="menuOpen.set(false)"
            >
              <span class="menu-icon" aria-hidden="true">👤</span>
              <span>Profile</span>
            </a>

            @if (auth.isIndividual()) {
              <a
                class="menu-item"
                routerLink="/orders"
                role="menuitem"
                (click)="menuOpen.set(false)"
              >
                <span class="menu-icon" aria-hidden="true">📦</span>
                <span>My Orders</span>
              </a>
              <a
                class="menu-item"
                routerLink="/reviews"
                role="menuitem"
                (click)="menuOpen.set(false)"
              >
                <span class="menu-icon" aria-hidden="true">⭐</span>
                <span>My Reviews</span>
              </a>
            }

            <div class="menu-divider"></div>

            <button
              class="menu-item danger"
              type="button"
              role="menuitem"
              (click)="logout()"
            >
              <span class="menu-icon" aria-hidden="true">🚪</span>
              <span>Log out</span>
            </button>
          </div>
        }
      </div>
    </header>
  `,
  styleUrls: ['./top-header.scss'],
})
export class TopHeaderComponent implements OnInit, OnDestroy {
  readonly roles: Role[] = ['INDIVIDUAL', 'CORPORATE', 'ADMIN'];

  readonly menuOpen = signal(false);
  readonly switching = signal(false);
  private readonly currentUrl = signal<string>('');
  private routerSub?: Subscription;
  private docClickHandler = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.avatar-wrap')) {
      this.menuOpen.set(false);
    }
  };

  readonly meta = computed(() => {
    const url = this.currentUrl();
    const hit = ROUTE_META.find((m) => url === m.prefix || url.startsWith(m.prefix + '/'));
    return hit ?? { title: 'Flower', sub: '' };
  });

  readonly displayName = computed(
    () =>
      this.auth.currentFirstName() ||
      this.auth.currentEmail()?.split('@')[0] ||
      'Guest',
  );

  readonly initial = computed(() =>
    (this.auth.currentFirstName() || this.auth.currentEmail() || 'U')
      .trim()
      .charAt(0)
      .toUpperCase(),
  );

  constructor(
    public auth: AuthService,
    public cart: CartService,
    public layout: LayoutService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.currentUrl.set(this.router.url.split('?')[0]);
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.currentUrl.set(e.urlAfterRedirects.split('?')[0]));

    if (this.auth.isIndividual()) {
      this.cart.refreshCartCount();
    }

    document.addEventListener('click', this.docClickHandler);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    document.removeEventListener('click', this.docClickHandler);
  }

  shortRole(role: Role): string {
    return role === 'INDIVIDUAL' ? 'IND' : role === 'CORPORATE' ? 'CORP' : 'ADM';
  }

  toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    this.menuOpen.update((v) => !v);
  }

  openChat() {
    this.router.navigate(['/chat']);
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout();
  }

  /**
   * Demo role switch: silently re-logs in as the corresponding demo account
   * and redirects to that role's dashboard. Uses the same `/api/auth/login`
   * endpoint as the login page — no backend changes.
   */
  switchRole(role: Role) {
    if (this.switching() || this.auth.currentRole() === role) return;
    const email = DEMO_ACCOUNTS[role];
    this.switching.set(true);
    this.auth.login({ email, password: 'password' }).subscribe({
      next: (res) => {
        this.auth.saveToken(res);
        this.switching.set(false);
        if (this.auth.isIndividual()) {
          this.cart.refreshCartCount();
        }
        this.router.navigate([this.auth.getDashboardRoute()]);
      },
      error: () => {
        this.switching.set(false);
      },
    });
  }
}

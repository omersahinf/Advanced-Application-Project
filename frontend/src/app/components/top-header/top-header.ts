import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { LayoutService } from '../../services/layout.service';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';

/** Titles/subtitles shown in the topbar, keyed by route prefix (longest match wins). */
const ROUTE_META: Array<{ prefix: string; title: string; sub: string }> = [
  { prefix: '/admin/users', title: 'Users', sub: 'List, suspend, and invite corporate accounts.' },
  { prefix: '/admin/stores', title: 'Stores', sub: 'Activate, close, and audit every store.' },
  { prefix: '/admin/categories', title: 'Categories', sub: 'Hierarchical taxonomy for products.' },
  { prefix: '/admin/analytics', title: 'Analytics', sub: 'Cross-store and customer segmentation.' },
  {
    prefix: '/admin/audit',
    title: 'Audit Logs',
    sub: 'Every sensitive action, who did it, from where.',
  },
  { prefix: '/admin/settings', title: 'Settings', sub: 'Platform-wide configuration.' },
  {
    prefix: '/admin',
    title: 'Platform Overview',
    sub: 'All stores, users, and revenue across Flower.',
  },
  {
    prefix: '/corporate/products',
    title: 'Products',
    sub: 'Manage your catalog — add, edit, discontinue.',
  },
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
  {
    prefix: '/chat',
    title: 'Analytics Chat',
    sub: 'Ask in natural language — a multi-agent pipeline answers.',
  },
];

@Component({
  selector: 'app-top-header',
  standalone: true,
  imports: [RouterLink, FlowerIconComponent],
  template: `
    <header class="topbar" role="banner">
      <button
        class="hamburger"
        type="button"
        (click)="layout.toggleMobileDrawer()"
        aria-label="Open navigation"
      >
        <flower-icon name="menu" [size]="18" [stroke]="2" />
      </button>

      <div class="title-block">
        @if (!hideTopbarTitle()) {
          <h1>{{ meta().title }}</h1>
          @if (meta().sub) {
            <p class="subtitle">{{ meta().sub }}</p>
          }
        }
      </div>

      <button class="icon-btn" type="button" aria-label="Notifications" title="Notifications">
        <flower-icon name="bell" [size]="17" />
        <span class="bell-dot" aria-hidden="true"></span>
      </button>

      <button class="ai-chip" type="button" (click)="openChat()" title="Ask Flower AI (Text2SQL)">
        <flower-icon name="sparkle" [size]="14" [stroke]="2" />
        Ask Flower AI
      </button>

      @if (auth.isIndividual()) {
        <a class="icon-btn" routerLink="/cart" aria-label="Cart" title="Cart">
          <flower-icon name="cart" [size]="17" />
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
          <span class="avatar-caret">
            <flower-icon name="chevron_down" [size]="14" [stroke]="2" />
          </span>
        </button>

        @if (menuOpen()) {
          <div class="avatar-menu" role="menu" (click)="$event.stopPropagation()">
            <div class="menu-header">
              <div class="menu-name">{{ displayName() }}</div>
              <div class="menu-email">{{ auth.currentEmail() }}</div>
            </div>

            @if (auth.isIndividual()) {
              <a
                class="menu-item"
                routerLink="/orders"
                role="menuitem"
                (click)="menuOpen.set(false)"
              >
                <span class="menu-icon" aria-hidden="true">
                  <flower-icon name="package" [size]="15" />
                </span>
                <span>My Orders</span>
              </a>
              <a
                class="menu-item"
                routerLink="/reviews"
                role="menuitem"
                (click)="menuOpen.set(false)"
              >
                <span class="menu-icon" aria-hidden="true">
                  <flower-icon name="review" [size]="15" />
                </span>
                <span>My Reviews</span>
              </a>
              <a class="menu-item" routerLink="/cart" role="menuitem" (click)="menuOpen.set(false)">
                <span class="menu-icon" aria-hidden="true">
                  <flower-icon name="cart" [size]="15" />
                </span>
                <span>Cart{{ cart.cartCount() > 0 ? ' (' + cart.cartCount() + ')' : '' }} </span>
              </a>
              <div class="menu-divider"></div>
            }

            <a
              class="menu-item"
              routerLink="/profile"
              role="menuitem"
              (click)="menuOpen.set(false)"
            >
              <span class="menu-icon" aria-hidden="true">
                <flower-icon name="settings" [size]="15" />
              </span>
              <span>Account settings</span>
            </a>

            <div class="menu-divider"></div>

            <button class="menu-item danger" type="button" role="menuitem" (click)="logout()">
              <span class="menu-icon" aria-hidden="true">
                <flower-icon name="logout" [size]="15" />
              </span>
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
  readonly menuOpen = signal(false);
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

  /**
   * Prototype hides the topbar title on pages that render their own big
   * in-page header (corporate Products + Orders). Keeps the topbar itself
   * visible — bell, AI chip, avatar all stay. Mirrors
   * `hideTopbarTitle` in Flower Prototype.html §Topbar.
   */
  readonly hideTopbarTitle = computed(() => {
    const url = this.currentUrl();
    return url === '/corporate/products' || url === '/corporate/orders';
  });

  readonly displayName = computed(
    () => this.auth.currentFirstName() || this.auth.currentEmail()?.split('@')[0] || 'Guest',
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
}

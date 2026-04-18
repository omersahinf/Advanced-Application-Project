import { Component, signal, OnInit, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-top-header',
  imports: [RouterLink],
  template: `
    <header class="top-header">
      <div class="header-actions">

        <!-- Language — hover opens merged card -->
        <div class="nav-item"
             [class.open]="langOpen()"
             (mouseenter)="langOpen.set(true)"
             (mouseleave)="langOpen.set(false)">
          <div class="nav-trigger lang-trigger">
            <span class="flag">{{ currentLang() === 'EN' ? '🇺🇸' : '🇹🇷' }}</span>
            <span class="trigger-bold">{{ currentLang() }}</span>
          </div>
          @if (langOpen()) {
            <div class="merged-dropdown">
              <button class="dd-row" [class.selected]="currentLang() === 'EN'" (click)="setLang('EN')">
                <span class="dd-row-icon">🇺🇸</span>
                <span class="dd-row-label">English</span>
              </button>
              <button class="dd-row" [class.selected]="currentLang() === 'TR'" (click)="setLang('TR')">
                <span class="dd-row-icon">🇹🇷</span>
                <span class="dd-row-label">Türkçe</span>
              </button>
            </div>
          }
        </div>

        <div class="sep"></div>

        <!-- Account — hover opens merged card -->
        <div class="nav-item"
             [class.open]="accountOpen()"
             (mouseenter)="accountOpen.set(true)"
             (mouseleave)="accountOpen.set(false)">
          <div class="nav-trigger account-trigger">
            <span class="trigger-hint">Hello, {{ displayName() }}</span>
            <div class="trigger-row">
              <span class="trigger-bold">Account</span>
              <svg class="caret" width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
            </div>
          </div>
          @if (accountOpen()) {
            <div class="merged-dropdown account-dd">
              <div class="dd-user">
                <div class="dd-avatar">
                  {{ (auth.currentFirstName() || auth.currentEmail() || 'U').charAt(0).toUpperCase() }}
                </div>
                <div class="dd-user-meta">
                  <span class="dd-user-name">{{ auth.currentFirstName() || auth.currentEmail() }}</span>
                  <span class="dd-role" [class]="'role-' + (auth.currentRole() || '').toLowerCase()">{{ auth.currentRole() }}</span>
                </div>
              </div>
              <div class="dd-line"></div>
              <div class="dd-section-title">YOUR ACCOUNT</div>
              <a routerLink="/profile" class="dd-row" (click)="accountOpen.set(false)">
                <span class="dd-row-icon">👤</span>
                <div class="dd-row-body">
                  <span class="dd-row-label">Profile</span>
                  <span class="dd-row-desc">Manage your account settings</span>
                </div>
              </a>
              @if (auth.isIndividual()) {
                <a routerLink="/dashboard" class="dd-row" (click)="accountOpen.set(false)">
                  <span class="dd-row-icon">📊</span>
                  <div class="dd-row-body">
                    <span class="dd-row-label">Dashboard</span>
                    <span class="dd-row-desc">Your spending overview</span>
                  </div>
                </a>
                <a routerLink="/reviews" class="dd-row" (click)="accountOpen.set(false)">
                  <span class="dd-row-icon">⭐</span>
                  <div class="dd-row-body">
                    <span class="dd-row-label">My Reviews</span>
                    <span class="dd-row-desc">Your product reviews</span>
                  </div>
                </a>
              }
              <div class="dd-line"></div>
              <button class="dd-row dd-row-danger" (click)="auth.logout()">
                <span class="dd-row-icon">🚪</span>
                <div class="dd-row-body">
                  <span class="dd-row-label">Sign Out</span>
                </div>
              </button>
            </div>
          }
        </div>

        <div class="sep"></div>

        <!-- Returns & Orders -->
        <a [routerLink]="auth.isIndividual() ? '/orders' : auth.isCorporate() ? '/corporate/orders' : '/admin'"
           class="nav-item nav-link-only">
          <span class="trigger-hint">Returns</span>
          <span class="trigger-bold">& Orders</span>
        </a>

        <div class="sep"></div>

        <!-- Cart -->
        @if (auth.isIndividual()) {
          <a routerLink="/cart" class="nav-item nav-link-only cart-link">
            <div class="cart-wrap">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              @if (cartService.cartCount() > 0) {
                <span class="cart-badge">{{ cartService.cartCount() }}</span>
              }
            </div>
            <span class="trigger-bold">Cart</span>
          </a>
        }

      </div>
    </header>
  `,
  styles: [`
    /* ───────── TOP BAR ───────── */
    .top-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: 52px;
      padding: 0 20px;
      background: #ffffeb;
      border-bottom: 1px solid #d5d5c0;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-actions {
      display: flex;
      align-items: center;
      height: 100%;
    }
    .sep {
      width: 1px;
      height: 22px;
      background: #d5d5c0;
      margin: 0 3px;
    }

    /* ─── NAV ITEM — the magic container ─── */
    .nav-item {
      position: relative;
      padding: 6px 14px;
      border-radius: 12px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: background 0.2s ease-in-out, border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border-radius 0.2s ease-in-out;
      text-decoration: none;
      color: #1a1a1a;
    }

    /* HOVER — Wispr Flow exact: pure white + subtle border + soft shadow */
    .nav-item:hover {
      background: #f7f7ef;
      border-color: rgba(26, 26, 26, 0.3);
      box-shadow: 0 2px 8px rgba(26, 26, 26, 0.08);
    }

    /* OPEN — Wispr Flow merged card: top half, flat bottom corners */
    .nav-item.open {
      background: #f7f7ef;
      border-color: rgba(26, 26, 26, 0.3);
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-color: transparent;
      box-shadow: none;
      z-index: 310;
    }

    .nav-trigger {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .lang-trigger {
      flex-direction: row;
      align-items: center;
      gap: 5px;
    }
    .trigger-hint {
      font-size: 11px;
      color: #888;
      line-height: 1.2;
    }
    .trigger-bold {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a1a;
      white-space: nowrap;
    }
    .trigger-row {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .flag {
      font-size: 15px;
    }
    .caret {
      color: #888;
      transition: transform 0.2s ease;
    }
    .nav-item.open .caret {
      transform: rotate(180deg);
    }

    /* ─── MERGED DROPDOWN — Wispr Flow exact: bottom half of white card ─── */
    .merged-dropdown {
      position: absolute;
      top: 100%;
      left: -1px;
      right: -1px;
      background: #f7f7ef;
      border: 1px solid rgba(26, 26, 26, 0.3);
      border-top: none;
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
      box-shadow: 0 30px 60px rgba(26, 26, 26, 0.15);
      padding: 6px;
      animation: slideDown 0.2s ease-in-out;
      z-index: 300;
      min-width: 150px;
    }
    .account-dd {
      min-width: 260px;
      left: auto;
      right: -1px;
      width: max-content;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ─── Dropdown content ─── */
    .dd-user {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
    }
    .dd-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: linear-gradient(135deg, #034f46, #1c6056);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .dd-user-name {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
      display: block;
    }
    .dd-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 7px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 3px;
    }
    .role-admin     { background: #fce5e5; color: #dc2626; }
    .role-corporate { background: #034f46; color: #ffffeb; }
    .role-individual { background: #dcfce7; color: #16a34a; }

    .dd-line {
      height: 1px;
      background: #eee;
      margin: 4px 10px;
    }
    .dd-section-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #aaa;
      padding: 8px 14px 4px;
    }

    /* Row items (links & buttons) */
    .dd-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      text-decoration: none;
      cursor: pointer;
      width: 100%;
      background: none;
      border: none;
      font-family: inherit;
      text-align: left;
      color: #1a1a1a;
      transition: background 0.12s;
    }
    .dd-row:hover {
      background: #f5f5eb;
    }
    .dd-row-icon {
      font-size: 18px;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }
    .dd-row-body {
      display: flex;
      flex-direction: column;
    }
    .dd-row-label {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .dd-row-desc {
      font-size: 11px;
      color: #999;
      margin-top: 1px;
    }
    .dd-row.selected {
      background: rgba(3, 79, 70, 0.06);
    }
    .dd-row.selected .dd-row-label {
      font-weight: 700;
      color: #034f46;
    }
    .dd-row-danger:hover {
      background: rgba(230, 57, 70, 0.06);
    }
    .dd-row-danger:hover .dd-row-label {
      color: #dc2626;
    }

    /* ─── Simple link items (Orders, Cart) ─── */
    .nav-link-only {
      display: flex;
      flex-direction: column;
      text-decoration: none;
    }
    .cart-link {
      flex-direction: row;
      align-items: center;
      gap: 6px;
    }
    .cart-wrap {
      position: relative;
      display: flex;
      align-items: center;
      color: #1a1a1a;
    }
    .cart-badge {
      position: absolute;
      top: -6px;
      right: -8px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background: #034f46;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      animation: pop 0.3s ease;
    }
    @keyframes pop {
      0%   { transform: scale(0); }
      50%  { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
  `],
})
export class TopHeaderComponent implements OnInit {
  accountOpen = signal(false);
  langOpen = signal(false);
  currentLang = signal<'EN' | 'TR'>(
    (localStorage.getItem('app_lang') as 'EN' | 'TR') || 'EN'
  );

  constructor(
    public auth: AuthService,
    public cartService: CartService,
    private elRef: ElementRef,
  ) {}

  displayName() {
    return this.auth.currentFirstName() || this.auth.currentEmail()?.split('@')[0] || 'Guest';
  }

  ngOnInit() {
    if (this.auth.isIndividual()) {
      this.cartService.refreshCartCount();
    }
  }

  setLang(lang: 'EN' | 'TR') {
    this.currentLang.set(lang);
    localStorage.setItem('app_lang', lang);
    this.langOpen.set(false);
  }
}

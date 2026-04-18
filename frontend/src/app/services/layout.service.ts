import { Injectable, signal } from '@angular/core';

/**
 * Coordinates layout state shared between the navbar (sidebar) and top-header.
 *
 * - `sidebarCollapsed`  — desktop icon-only mode (persisted to localStorage).
 * - `mobileDrawerOpen`  — <md viewport: overlay drawer is open.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly LS_COLLAPSED = 'flower.sidebar.collapsed';

  readonly sidebarCollapsed = signal<boolean>(this.readCollapsed());
  readonly mobileDrawerOpen = signal<boolean>(false);

  toggleCollapsed() {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    try {
      localStorage.setItem(this.LS_COLLAPSED, next ? '1' : '0');
    } catch {
      /* storage may be unavailable */
    }
  }

  openMobileDrawer() {
    this.mobileDrawerOpen.set(true);
  }

  closeMobileDrawer() {
    this.mobileDrawerOpen.set(false);
  }

  toggleMobileDrawer() {
    this.mobileDrawerOpen.update((v) => !v);
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(this.LS_COLLAPSED) === '1';
    } catch {
      return false;
    }
  }
}

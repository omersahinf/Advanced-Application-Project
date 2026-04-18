import { Component, Input } from '@angular/core';

/**
 * Flower brand mark — four ascending green bars (fathom).
 *
 * Used on login, sidebar, and topbar. Single source of truth for the logo
 * so all surfaces render identical geometry and colors.
 */
@Component({
  selector: 'flower-logo',
  standalone: true,
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="14" width="3.5" height="8" rx="1" fill="var(--fathom)" />
      <rect x="7" y="9" width="3.5" height="13" rx="1" fill="var(--fathom)" />
      <rect x="12" y="11" width="3.5" height="11" rx="1" fill="var(--fathom)" />
      <rect x="17" y="6" width="3.5" height="16" rx="1" fill="var(--fathom)" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
    `,
  ],
})
export class FlowerLogoComponent {
  @Input() size: number = 24;
}

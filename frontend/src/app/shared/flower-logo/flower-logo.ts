import { Component, Input } from '@angular/core';

/**
 * Flower brand mark — three-petal trefoil with a darker core.
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
      <g fill="var(--fathom)">
        <path d="M12 1.5 C 17 4, 17 10.5, 12 13 C 7 10.5, 7 4, 12 1.5 Z" />
        <path
          d="M12 1.5 C 17 4, 17 10.5, 12 13 C 7 10.5, 7 4, 12 1.5 Z"
          transform="rotate(120 12 12)"
        />
        <path
          d="M12 1.5 C 17 4, 17 10.5, 12 13 C 7 10.5, 7 4, 12 1.5 Z"
          transform="rotate(240 12 12)"
        />
      </g>
      <circle cx="12" cy="12" r="1.9" fill="var(--fathom-dark, #023a34)" />
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

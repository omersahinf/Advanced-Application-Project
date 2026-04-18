import { Component, Input, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Flower line-icon set — monochrome SVG icons matching `Flower Prototype.html`.
 *
 * One standalone component with every icon used across the app. Renders a
 * single <svg> using `currentColor` so the parent's text color paints the
 * stroke. Keeps the rest of the Angular code free of inline SVG spaghetti.
 *
 * Usage:
 *   <flower-icon name="dashboard" [size]="17"/>
 *   <flower-icon name="sparkle" [size]="14" [stroke]="2"/>
 */
@Component({
  selector: 'flower-icon',
  standalone: true,
  template: `<span class="icon-wrap" [innerHTML]="svg()"></span>`,
  styles: [
    `
      :host,
      .icon-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      .icon-wrap ::ng-deep svg {
        display: block;
      }
    `,
  ],
})
export class FlowerIconComponent {
  @Input() set name(value: FlowerIconName) {
    this.nameSig.set(value);
  }
  @Input() set size(value: number) {
    this.sizeSig.set(value);
  }
  @Input() set stroke(value: number) {
    this.strokeSig.set(value);
  }

  private readonly nameSig = signal<FlowerIconName>('dashboard');
  private readonly sizeSig = signal<number>(16);
  private readonly strokeSig = signal<number>(1.75);
  private readonly sanitizer = inject(DomSanitizer);

  // Full <svg>…</svg> string is sanitized via bypassSecurityTrustHtml and then
  // dropped into a <span> via innerHTML. The browser parses the inline <svg>
  // inside that HTML fragment in the correct SVG namespace, so children
  // (<path>, <rect>, <circle>) render correctly — unlike setting innerHTML
  // on an existing <svg> element.
  readonly svg = computed<SafeHtml>(() => {
    const paths = ICONS[this.nameSig()] ?? '';
    const s = this.sizeSig();
    const sw = this.strokeSig();
    const svg =
      `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" ` +
      `stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" ` +
      `stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  });
}

export type FlowerIconName =
  | 'dashboard'
  | 'cart'
  | 'package'
  | 'users'
  | 'store'
  | 'tag'
  | 'chart'
  | 'settings'
  | 'chat'
  | 'review'
  | 'search'
  | 'plus'
  | 'minus'
  | 'close'
  | 'check'
  | 'chevron_right'
  | 'chevron_down'
  | 'chevron_up'
  | 'arrow_right'
  | 'arrow_up'
  | 'arrow_down'
  | 'trash'
  | 'edit'
  | 'eye'
  | 'eye_off'
  | 'logout'
  | 'shield'
  | 'sparkle'
  | 'database'
  | 'send'
  | 'filter'
  | 'download'
  | 'refresh'
  | 'bell'
  | 'home'
  | 'book'
  | 'layers'
  | 'truck'
  | 'bolt'
  | 'star'
  | 'menu';

// SVG paths — copied verbatim from Flower Prototype.html `Icon` component.
const ICONS: Record<FlowerIconName, string> = {
  dashboard:
    '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 3h2l2.4 11.5a2 2 0 0 0 2 1.5h7.2a2 2 0 0 0 2-1.5L20.5 7H6"/>',
  package: '<path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5"/><path d="M12 12v10"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20.5a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 14a5 5 0 0 1 7 4.6"/>',
  store:
    '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9v11h18V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/>',
  tag: '<path d="M20.6 11.4 12 20 3 11V3h8z"/><circle cx="7" cy="7" r="1.3"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chat: '<path d="M21 11.5a8 8 0 0 1-11.9 7L3 20l1.6-5.3A8 8 0 1 1 21 11.5z"/>',
  review: '<path d="M12 2l2.9 6 6.6.5-5 4.4 1.5 6.6L12 16l-6 3.5 1.5-6.6-5-4.4 6.6-.5z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  chevron_right: '<path d="m9 6 6 6-6 6"/>',
  chevron_down: '<path d="m6 9 6 6 6-6"/>',
  chevron_up: '<path d="m6 15 6-6 6 6"/>',
  arrow_right: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  arrow_up: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  arrow_down: '<path d="M12 5v14"/><path d="m5 12 7 7 7-7"/>',
  trash:
    '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/>',
  edit: '<path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4z"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
  eye_off:
    '<path d="m3 3 18 18"/><path d="M10.6 6.1A10.9 10.9 0 0 1 12 6c7 0 11 7 11 7a17.9 17.9 0 0 1-3.8 4.6"/><path d="M6.6 6.6A17.8 17.8 0 0 0 1 12s4 7 11 7a10.8 10.8 0 0 0 4-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  sparkle:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/>',
  database:
    '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  send: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M20 21H4"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  book: '<path d="M4 4h10a4 4 0 0 1 4 4v13H8a4 4 0 0 1-4-4z"/><path d="M4 4v13"/><path d="M8 21V8"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/>',
  truck:
    '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="19" r="2.5"/>',
  bolt: '<path d="M13 2 3 14h7l-1 8 10-12h-7z"/>',
  star: '<path d="M12 2l2.9 6 6.6.5-5 4.4 1.5 6.6L12 16l-6 3.5 1.5-6.6-5-4.4 6.6-.5z"/>',
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
};

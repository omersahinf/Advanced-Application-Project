import { Component, Input, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Star-rating display — copied character-for-character from
 * `Flower Prototype.html` `Stars` component.
 *
 * Filled stars (up to Math.round(n)) are amber (#ffa946); empty ones are
 * outlined in the light-tone border color (#d5d5c0). No half-stars — matches
 * the prototype's rounding behavior.
 *
 * Usage:
 *   <flower-stars [value]="4.3" [size]="13"/>
 */
@Component({
  selector: 'flower-stars',
  standalone: true,
  template: `<span class="wrap" [innerHTML]="svg()"></span>`,
  styles: [
    `
      :host,
      .wrap {
        display: inline-flex;
        gap: 1px;
        color: #ffa946;
        line-height: 0;
      }
      .wrap ::ng-deep svg {
        display: block;
      }
    `,
  ],
})
export class FlowerStarsComponent {
  @Input() set value(v: number) {
    this.valSig.set(v ?? 0);
  }
  @Input() set max(v: number) {
    this.maxSig.set(v);
  }
  @Input() set size(v: number) {
    this.sizeSig.set(v);
  }

  private readonly valSig = signal(5);
  private readonly maxSig = signal(5);
  private readonly sizeSig = signal(13);
  private readonly sanitizer = inject(DomSanitizer);

  readonly svg = computed<SafeHtml>(() => {
    const n = this.valSig();
    const max = this.maxSig();
    const size = this.sizeSig();
    const filled = Math.round(n);
    const star = 'M12 2l2.9 6 6.6.5-5 4.4 1.5 6.6L12 16l-6 3.5 1.5-6.6-5-4.4 6.6-.5z';
    let out = '';
    for (let i = 0; i < max; i += 1) {
      const isFilled = i < filled;
      const fill = isFilled ? '#ffa946' : 'transparent';
      const stroke = isFilled ? '#ffa946' : '#d5d5c0';
      out +=
        `<svg width="${size}" height="${size}" viewBox="0 0 24 24" ` +
        `fill="${fill}" stroke="${stroke}" stroke-width="1.5">` +
        `<path d="${star}"/></svg>`;
    }
    return this.sanitizer.bypassSecurityTrustHtml(out);
  });
}

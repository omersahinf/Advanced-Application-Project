import { Component, Input, computed, signal } from '@angular/core';
import { productEmoji } from '../product-emoji';

/**
 * Product hero — the wide emoji header used on product cards across
 * Individual, Corporate, and Admin product views.
 *
 * Matches `Flower Prototype.html` §CorpProducts exactly:
 *   aspectRatio: 1.6
 *   background: var(--bg-2)
 *   font-size: 56px (default)
 *   borderBottom: 1px solid var(--border)
 *
 * The emoji is picked by `productEmoji(name, category)`, which covers the
 * same rules as the prototype's emojiFor() helper (laptop/keyboard/mouse/
 * headphones/watch/phone/tablet/camera + category fallbacks).
 *
 * Usage:
 *   <product-hero [name]="p.name" [category]="p.category"/>
 *   <!-- compact variant on a square card -->
 *   <product-hero [name]="p.name" [category]="p.category"
 *                 [ratio]="1" [size]="72"/>
 */
@Component({
  selector: 'product-hero',
  standalone: true,
  template: `<div class="hero" [style.aspect-ratio]="ratio" [style.font-size.px]="size">
    {{ emoji() }}
  </div>`,
  styles: [
    `
      :host {
        display: block;
      }
      .hero {
        width: 100%;
        background: var(--bg-2);
        border-bottom: 1px solid var(--border);
        display: flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
      }
    `,
  ],
})
export class ProductHeroComponent {
  @Input() set name(v: string | null | undefined) {
    this.nameSig.set(v ?? '');
  }
  @Input() set category(v: string | null | undefined) {
    this.catSig.set(v ?? '');
  }
  /** CSS aspect-ratio — prototype default 1.6 (wider than tall). */
  @Input() ratio: number = 1.6;
  /** Emoji font-size in px — prototype default 56. */
  @Input() size: number = 56;

  private readonly nameSig = signal<string>('');
  private readonly catSig = signal<string>('');

  readonly emoji = computed(() => productEmoji(this.nameSig(), this.catSig()));
}

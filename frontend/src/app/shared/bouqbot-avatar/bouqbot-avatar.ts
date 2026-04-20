import { Component, Input, computed, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';

export type BouqbotState = 'idle' | 'happy' | 'thinking' | 'talking' | 'sleep';

@Component({
  selector: 'bouqbot-avatar',
  standalone: true,
  template: `<span
    class="bouq-wrap"
    [style.width.px]="sizeSig()"
    [style.height.px]="sizeSig()"
    [class.bob]="isBob()"
    [class.think]="isThink()"
    [innerHTML]="svg()"
    [attr.aria-label]="'Bouqbot ' + stateSig()"
  ></span>`,
  styles: [
    `
      :host,
      .bouq-wrap {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 0;
      }
      .bouq-wrap ::ng-deep svg {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
      @keyframes bouq-bob {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-3px);
        }
      }
      .bouq-wrap.bob {
        animation: bouq-bob 2s ease-in-out infinite;
      }
      @keyframes bouq-think {
        0% {
          transform: rotate(-4deg) translateY(0);
        }
        25% {
          transform: rotate(0deg) translateY(-2px);
        }
        50% {
          transform: rotate(4deg) translateY(0);
        }
        75% {
          transform: rotate(0deg) translateY(-2px);
        }
        100% {
          transform: rotate(-4deg) translateY(0);
        }
      }
      .bouq-wrap.think {
        animation: bouq-think 1.4s ease-in-out infinite;
        transform-origin: 50% 80%;
      }
      @keyframes bouq-dot-pulse {
        0%,
        100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }
      .bouq-wrap.think ::ng-deep rect[data-pulse='1'] {
        animation: bouq-dot-pulse 0.8s ease-in-out infinite;
      }
      .bouq-wrap.think ::ng-deep rect[data-pulse='2'] {
        animation: bouq-dot-pulse 0.8s ease-in-out 0.2s infinite;
      }
      .bouq-wrap.think ::ng-deep rect[data-pulse='3'] {
        animation: bouq-dot-pulse 0.8s ease-in-out 0.4s infinite;
      }
    `,
  ],
})
export class BouqbotAvatarComponent {
  @Input() set state(value: BouqbotState) {
    this.stateSig.set(value);
  }
  @Input() set size(value: number) {
    this.sizeSig.set(value);
  }

  protected readonly stateSig = signal<BouqbotState>('idle');
  protected readonly sizeSig = signal<number>(40);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly isBob = computed(() => {
    const s = this.stateSig();
    return s === 'idle' || s === 'talking';
  });

  protected readonly isThink = computed(() => this.stateSig() === 'thinking');

  protected readonly svg = computed<SafeHtml>(() => {
    const markup = BOUQBOT_SVGS[this.stateSig()];
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  });
}

const SVG_HEAD =
  '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">';
const SVG_TAIL = '</svg>';

const BOUQBOT_SVGS: Record<BouqbotState, string> = {
  idle:
    SVG_HEAD +
    // bouquet
    '<rect x="5" y="0" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="7" y="0" width="1" height="1" fill="#a78bfa"/>' +
    '<rect x="9" y="0" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="4" y="1" width="2" height="1" fill="#f472b6"/>' +
    '<rect x="6" y="1" width="2" height="1" fill="#a78bfa"/>' +
    '<rect x="8" y="1" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="10" y="1" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="6" y="2" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="8" y="2" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="5" y="3" width="5" height="1" fill="#4ade80"/>' +
    // head
    '<rect x="3" y="4" width="10" height="7" fill="#fff1e0"/>' +
    '<rect x="2" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="13" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="3" y="11" width="10" height="1" fill="#e5d9c5"/>' +
    // screen
    '<rect x="5" y="6" width="6" height="3" fill="#0f0d12"/>' +
    '<rect x="6" y="7" width="1" height="1" fill="#fff"/>' +
    '<rect x="9" y="7" width="1" height="1" fill="#fff"/>' +
    // leaf cheeks
    '<rect x="2" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="13" y="8" width="1" height="1" fill="#4ade80"/>' +
    // body
    '<rect x="4" y="12" width="8" height="3" fill="#fff1e0"/>' +
    '<rect x="6" y="13" width="4" height="1" fill="#f472b6"/>' +
    '<rect x="5" y="15" width="2" height="1" fill="#4ade80"/>' +
    '<rect x="9" y="15" width="2" height="1" fill="#4ade80"/>' +
    SVG_TAIL,

  happy:
    SVG_HEAD +
    '<rect x="5" y="0" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="7" y="0" width="1" height="1" fill="#a78bfa"/>' +
    '<rect x="9" y="0" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="4" y="1" width="2" height="1" fill="#f472b6"/>' +
    '<rect x="6" y="1" width="2" height="1" fill="#a78bfa"/>' +
    '<rect x="8" y="1" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="10" y="1" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="5" y="3" width="5" height="1" fill="#4ade80"/>' +
    '<rect x="3" y="4" width="10" height="7" fill="#fff1e0"/>' +
    '<rect x="2" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="13" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="5" y="6" width="6" height="3" fill="#0f0d12"/>' +
    // clean dot eyes
    '<rect x="6" y="7" width="1" height="1" fill="#fff"/>' +
    '<rect x="9" y="7" width="1" height="1" fill="#fff"/>' +
    // small curved smile (only 2 center pixels -> reads as "u")
    '<rect x="7" y="8" width="2" height="1" fill="#f472b6"/>' +
    // sparkles
    '<rect x="1" y="5" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="14" y="6" width="1" height="1" fill="#fbbf24"/>' +
    // blush on cheeks (outside the screen)
    '<rect x="3" y="9" width="1" height="1" fill="#f472b6" opacity="0.7"/>' +
    '<rect x="12" y="9" width="1" height="1" fill="#f472b6" opacity="0.7"/>' +
    '<rect x="2" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="13" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="4" y="12" width="8" height="3" fill="#fff1e0"/>' +
    '<rect x="6" y="13" width="4" height="1" fill="#f472b6"/>' +
    '<rect x="5" y="15" width="2" height="1" fill="#4ade80"/>' +
    '<rect x="9" y="15" width="2" height="1" fill="#4ade80"/>' +
    SVG_TAIL,

  thinking:
    SVG_HEAD +
    '<rect x="5" y="0" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="7" y="0" width="1" height="1" fill="#a78bfa" opacity="0.4"/>' +
    '<rect x="9" y="0" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="4" y="1" width="2" height="1" fill="#f472b6"/>' +
    '<rect x="8" y="1" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="5" y="3" width="5" height="1" fill="#4ade80"/>' +
    '<rect x="3" y="4" width="10" height="7" fill="#fff1e0"/>' +
    '<rect x="2" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="13" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="5" y="6" width="6" height="3" fill="#0f0d12"/>' +
    // loading dots (animated via data-pulse)
    '<rect x="6" y="7" width="1" height="1" fill="#fbbf24" data-pulse="1"/>' +
    '<rect x="8" y="7" width="1" height="1" fill="#fbbf24" data-pulse="2"/>' +
    '<rect x="10" y="7" width="1" height="1" fill="#fbbf24" data-pulse="3"/>' +
    // thought bubble
    '<rect x="13" y="2" width="1" height="1" fill="#a78bfa"/>' +
    '<rect x="14" y="4" width="1" height="1" fill="#a78bfa"/>' +
    '<rect x="2" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="13" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="4" y="12" width="8" height="3" fill="#fff1e0"/>' +
    SVG_TAIL,

  talking:
    SVG_HEAD +
    '<rect x="5" y="0" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="7" y="0" width="1" height="1" fill="#a78bfa"/>' +
    '<rect x="9" y="0" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="4" y="1" width="2" height="1" fill="#f472b6"/>' +
    '<rect x="6" y="1" width="2" height="1" fill="#a78bfa"/>' +
    '<rect x="8" y="1" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="10" y="1" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="5" y="3" width="5" height="1" fill="#4ade80"/>' +
    '<rect x="3" y="4" width="10" height="7" fill="#fff1e0"/>' +
    '<rect x="2" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="13" y="5" width="1" height="5" fill="#fff1e0"/>' +
    '<rect x="5" y="6" width="6" height="3" fill="#0f0d12"/>' +
    '<rect x="6" y="7" width="1" height="1" fill="#fff"/>' +
    '<rect x="9" y="7" width="1" height="1" fill="#fff"/>' +
    '<rect x="6" y="8" width="4" height="1" fill="#f472b6"/>' +
    '<rect x="2" y="8" width="1" height="1" fill="#4ade80"/>' +
    '<rect x="13" y="8" width="1" height="1" fill="#4ade80"/>' +
    // hearts escape
    '<rect x="14" y="2" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="13" y="3" width="1" height="1" fill="#f472b6"/>' +
    '<rect x="4" y="12" width="8" height="3" fill="#fff1e0"/>' +
    '<rect x="5" y="15" width="2" height="1" fill="#4ade80"/>' +
    '<rect x="9" y="15" width="2" height="1" fill="#4ade80"/>' +
    SVG_TAIL,

  sleep:
    SVG_HEAD +
    '<rect x="5" y="1" width="1" height="1" fill="#f472b6" opacity="0.6"/>' +
    '<rect x="7" y="1" width="1" height="1" fill="#a78bfa" opacity="0.6"/>' +
    '<rect x="9" y="1" width="1" height="1" fill="#fbbf24" opacity="0.6"/>' +
    '<rect x="4" y="2" width="2" height="1" fill="#f472b6" opacity="0.7"/>' +
    '<rect x="8" y="2" width="2" height="1" fill="#fbbf24" opacity="0.7"/>' +
    '<rect x="5" y="3" width="5" height="1" fill="#4ade80" opacity="0.7"/>' +
    '<rect x="3" y="4" width="10" height="7" fill="#fff1e0" opacity="0.9"/>' +
    '<rect x="5" y="6" width="6" height="3" fill="#0f0d12" opacity="0.9"/>' +
    '<rect x="6" y="8" width="4" height="1" fill="#fbbf24"/>' +
    // Z
    '<rect x="13" y="2" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="14" y="3" width="1" height="1" fill="#fbbf24"/>' +
    '<rect x="13" y="4" width="2" height="1" fill="#fbbf24"/>' +
    '<rect x="4" y="12" width="8" height="3" fill="#fff1e0" opacity="0.9"/>' +
    SVG_TAIL,
};

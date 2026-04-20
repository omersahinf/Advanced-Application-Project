import { Component, Input, computed, signal } from '@angular/core';
import { FlowerIconComponent, FlowerIconName } from '../flower-icon/flower-icon';

/**
 * KPI card — copied character-for-character from `Flower Prototype.html`
 * `KpiCard` component.
 *
 * Layout: label + (optional) accent-tinted icon square on top row, big serif
 * value on second row, small muted sub-text with optional green/red delta
 * chip on the bottom row.
 *
 * Usage:
 *   <kpi-card
 *     label="Lifetime spend"
 *     [value]="'$' + (d.total | number)"
 *     sub="across 9 orders"
 *     icon="chart"
 *     delta="+18%"
 *     accent="#034f46"
 *   />
 *
 * Keep the icon name restricted to FlowerIconName so we can't drift from the
 * prototype's monochrome line-SVG set.
 */
@Component({
  selector: 'kpi-card',
  standalone: true,
  imports: [FlowerIconComponent],
  template: `
    <div class="card kpi">
      <div class="top">
        <div class="section-label">{{ label }}</div>
        @if (icon) {
          <div
            class="icon-tile"
            [style.background]="accent + '15'"
            [style.color]="accent"
            aria-hidden="true"
          >
            <flower-icon [name]="icon" [size]="15" />
          </div>
        }
      </div>
      <div class="value">{{ value }}</div>
      <div class="bottom">
        @if (delta) {
          <span class="delta" [class.delta-down]="isNegative()">{{ delta }}</span>
        }
        @if (sub) {
          <span class="sub">{{ sub }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .kpi {
        padding: 18px;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .icon-tile {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .value {
        font-family: var(--sans);
        font-weight: 700;
        font-size: 28px;
        line-height: 1;
        letter-spacing: -0.4px;
      }
      .bottom {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        font-size: 12px;
        color: var(--text-2);
      }
      .delta {
        color: var(--ok, #16a34a);
        font-weight: 600;
      }
      .delta.delta-down {
        color: var(--err, #dc2626);
      }
    `,
  ],
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() sub = '';
  @Input() accent = '#034f46';
  @Input() icon?: FlowerIconName;
  @Input() set delta(v: string | null | undefined) {
    this.deltaSig.set(v ?? '');
  }

  private readonly deltaSig = signal<string>('');

  readonly isNegative = computed(() => {
    const d = this.deltaSig();
    return !!d && !d.startsWith('+');
  });

  // Expose the stored delta back to the template via getter so we don't need
  // a second signal read.
  get delta(): string {
    return this.deltaSig();
  }
}

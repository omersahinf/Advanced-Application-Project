import { Component, Input, computed, signal } from '@angular/core';

/**
 * Status pill — copied character-for-character from
 * `Flower Prototype.html` `StatusPill` component.
 *
 * Mapping is verbatim from the prototype and covers order, store, and
 * review-sentiment statuses. Unknown statuses fall back to a neutral grey
 * pill. Displays whatever string the parent passes (so parents can pass
 * backend-returned raw strings like "DELIVERED" or "SHIPPED").
 *
 * Usage:
 *   <status-pill status="DELIVERED"/>
 *   <status-pill [status]="o.status" [label]="fmt(o.status)"/>
 */
@Component({
  selector: 'status-pill',
  standalone: true,
  template: `<span class="pill" [style.background]="style().bg" [style.color]="style().fg">{{
    label || status
  }}</span>`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        padding: 2px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
    `,
  ],
})
export class StatusPillComponent {
  @Input() set status(value: string) {
    this.statusSig.set(value ?? '');
  }
  @Input() label: string = '';

  private readonly statusSig = signal<string>('');

  readonly style = computed(() => STATUS_STYLES[this.statusSig()] ?? FALLBACK);
}

type PillStyle = { bg: string; fg: string };

const FALLBACK: PillStyle = { bg: '#f5f5e1', fg: '#666' };

// Verbatim from Flower Prototype.html §StatusPill.
const STATUS_STYLES: Record<string, PillStyle> = {
  DELIVERED: { bg: '#dcfce7', fg: '#16a34a' },
  SHIPPED: { bg: 'rgba(3,79,70,0.10)', fg: '#034f46' },
  IN_TRANSIT: { bg: 'rgba(3,79,70,0.10)', fg: '#034f46' },
  CONFIRMED: { bg: '#dfe9e5', fg: '#034f46' },
  PENDING: { bg: '#fef3c7', fg: '#d97706' },
  PROCESSING: { bg: '#fef3c7', fg: '#d97706' },
  CANCELLED: { bg: '#fce5e5', fg: '#dc2626' },
  CANCELED: { bg: '#fce5e5', fg: '#dc2626' },
  ACTIVE: { bg: '#dcfce7', fg: '#16a34a' },
  CLOSED: { bg: '#fce5e5', fg: '#dc2626' },
  PENDING_APPROVAL: { bg: '#fef3c7', fg: '#d97706' },
  POSITIVE: { bg: '#dcfce7', fg: '#16a34a' },
  NEGATIVE: { bg: '#fce5e5', fg: '#dc2626' },
  NEUTRAL: { bg: '#f5f5e1', fg: '#666' },
};

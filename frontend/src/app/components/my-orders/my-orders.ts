/*
 * Prototype inventory (Flower Prototype.html §IndOrders):
 *  Toolbar row (flex, gap 8, flex-wrap):
 *    6 filter pills in exact order: ALL · PENDING · CONFIRMED ·
 *    SHIPPED · DELIVERED · CANCELLED  (active = btn-dark)
 *    <spacer>
 *    "[download] CSV export"
 *  Card (padding 0) containing a table:
 *    columns: Order | Date | Items | Status | Payment | Total(right) | (chevron)
 *    row data: #id (mono, 500) · fmtDate (text-2) · "N item(s)" (text-2)
 *              · StatusPill · paymentMethod (text-2 12.5px) · total (right bold)
 *              · chevron_down / chevron_up
 *    click row → expand as full-width colspan row (bg --hover, padding 20)
 *      grid 1fr 280px:
 *        left  : section-label "Items" + lines (thumb 44, name, SKU·Qty, price)
 *        right : section-label "Shipment"
 *                card (lumen bg, radius 10, border): truck icon + carrier + pill
 *                meta rows: Mode · Warehouse · Destination · Tracking (mono)
 *                OR italic "No shipment yet."
 *                if PENDING → "Complete payment →" primary btn-sm (full-width)
 *
 * Backend reality:
 *  - Order.status ranges include OUT_FOR_DELIVERY — the prototype's 6-pill
 *    filter set covers the common cases; OUT_FOR_DELIVERY rows still show
 *    under ALL and render a status pill with neutral fallback.
 *  - Shipment has trackingNumber (not `tracking`) and no `destination`
 *    sometimes — we guard with truthiness when showing meta rows.
 */
import { Component, OnInit, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/product.model';
import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { ProductHeroComponent } from '../../shared/product-hero/product-hero';

const FILTER_LIST = ['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    FlowerIconComponent,
    StatusPillComponent,
    ProductHeroComponent,
  ],
  template: `
    <div class="toolbar">
      @for (s of filters; track s) {
        <button
          type="button"
          class="btn btn-sm"
          [class.btn-dark]="filter() === s"
          (click)="setFilter(s)"
        >
          {{ s }}
        </button>
      }
      <span class="spacer"></span>
      <button type="button" class="btn btn-sm export-btn" (click)="exportCSV()">
        <flower-icon name="download" [size]="13" />
        CSV export
      </button>
    </div>

    @if (orders().length > 0) {
      <div class="card table-card">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Items</th>
              <th>Status</th>
              <th>Payment</th>
              <th class="th-right">Total</th>
              <th class="th-chev"></th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o.id) {
              <tr class="order-row" (click)="toggle(o.id)">
                <td class="c-id">#{{ o.id }}</td>
                <td class="c-muted">{{ o.orderDate | date: 'mediumDate' }}</td>
                <td class="c-muted">
                  {{ o.items.length }} item{{ o.items.length === 1 ? '' : 's' }}
                </td>
                <td><status-pill [status]="o.status" /></td>
                <td class="c-payment">{{ o.paymentMethod }}</td>
                <td class="c-total">\${{ o.grandTotal | number: '1.2-2' }}</td>
                <td class="c-chev">
                  <flower-icon [name]="openId() === o.id ? 'chevron_up' : 'chevron_down'" [size]="14" />
                </td>
              </tr>
              @if (openId() === o.id) {
                <tr class="detail-row">
                  <td colspan="7">
                    <div class="detail-grid">
                      <div class="detail-items">
                        <div class="section-label">Items</div>
                        @for (it of o.items; track it.id) {
                          <div class="item-line">
                            <div class="item-thumb">
                              <product-hero
                                [name]="it.productName"
                                [ratio]="1"
                                [size]="24"
                              />
                            </div>
                            <div class="item-info">
                              <div class="item-name">{{ it.productName }}</div>
                              <div class="item-sub">
                                SKU {{ it.productSku }} · Qty {{ it.quantity }}
                              </div>
                            </div>
                            <div class="item-price">
                              \${{ it.price * it.quantity | number: '1.2-2' }}
                            </div>
                          </div>
                        }
                      </div>

                      <div class="detail-shipment">
                        <div class="section-label">Shipment</div>
                        @if (o.shipment) {
                          <div class="ship-card">
                            <div class="ship-head">
                              <flower-icon name="truck" [size]="14" [stroke]="1.8" />
                              <b>{{ o.shipment.carrier }}</b>
                              <status-pill [status]="o.shipment.status" />
                            </div>
                            <div class="meta-row">
                              <span>Mode</span><span>{{ o.shipment.mode }}</span>
                            </div>
                            <div class="meta-row">
                              <span>Warehouse</span><span>{{ o.shipment.warehouse }}</span>
                            </div>
                            @if (o.shipment.destination) {
                              <div class="meta-row">
                                <span>Destination</span
                                ><span>{{ o.shipment.destination }}</span>
                              </div>
                            }
                            <div class="meta-row">
                              <span>Tracking</span>
                              <span class="mono">{{ o.shipment.trackingNumber }}</span>
                            </div>
                          </div>
                        } @else {
                          <div class="no-ship">No shipment yet.</div>
                        }

                        @if (o.status === 'PENDING') {
                          <a
                            [routerLink]="['/checkout', o.id]"
                            class="btn btn-primary btn-sm complete-btn"
                          >
                            Complete payment
                            <flower-icon name="arrow_right" [size]="12" />
                          </a>
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    } @else {
      <div class="empty-state card">
        <div class="empty-icon" aria-hidden="true">📦</div>
        <div class="empty-title">No orders found</div>
        <div>When you place an order, it'll appear here.</div>
      </div>
    }
  `,
  styleUrls: ['./my-orders.scss'],
})
export class MyOrdersComponent implements OnInit {
  readonly filters = FILTER_LIST;
  orders = signal<Order[]>([]);
  filter = signal<(typeof FILTER_LIST)[number]>('ALL');
  openId = signal<number | null>(null);

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.load();
  }

  setFilter(s: (typeof FILTER_LIST)[number]) {
    this.filter.set(s);
    this.openId.set(null);
    this.load();
  }

  private load() {
    const s = this.filter();
    this.orderService.getMyOrders(s === 'ALL' ? undefined : s).subscribe((o) => this.orders.set(o));
  }

  toggle(id: number) {
    this.openId.update((curr) => (curr === id ? null : id));
  }

  exportCSV() {
    const orders = this.orders();
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Date', 'Store', 'Status', 'Payment Method', 'Grand Total'];
    const rows = orders.map((o) =>
      [o.id, o.orderDate, o.storeName, o.status, o.paymentMethod, o.grandTotal].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
}

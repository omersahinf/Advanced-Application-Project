import { Component, OnInit, signal, computed } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { CommonModule, DatePipe } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Order, Shipment } from '../../models/product.model';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { finalize } from 'rxjs';

interface ShipmentRow {
  trackingId: string;
  orderId: number;
  customerName: string;
  carrier: string;
  destination: string;
  status: string;
  orderStatus: string;
  eta: Date | null;
}

@Component({
  selector: 'app-corporate-shipments',
  standalone: true,
  imports: [CommonModule, KpiCardComponent, StatusPillComponent, DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="page-title-block">
          <h1 class="page-title">
            Shipments Tracking
            <span class="title-emoji" aria-hidden="true">🚚</span>
          </h1>
          <div class="page-sub">Monitor all shipments in real-time</div>
        </div>

        <button type="button" class="btn btn-primary" aria-label="Create Shipment">
          + Create Shipment
        </button>
      </div>

      <div class="metrics-grid">
        <kpi-card label="Pending" [value]="pendingCount()" sub="awaiting dispatch" icon="package" />

        <kpi-card label="In Transit" [value]="inTransitCount()" sub="on the way" icon="truck" />

        <kpi-card label="Delivered" [value]="deliveredCount()" sub="completed" icon="check" />

        <kpi-card label="Returns" [value]="returnsCount()" sub="refunded" icon="refresh" />
      </div>

      <div class="card shipments-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th class="col-uppercase">Tracking ID</th>
                <th class="col-uppercase">Order</th>
                <th class="col-uppercase">Customer</th>
                <th class="col-uppercase">Carrier</th>
                <th class="col-uppercase">Destination</th>
                <th class="col-uppercase" style="width:120px;">Status</th>
                <th class="col-uppercase" style="width:120px;">ETA</th>
              </tr>
            </thead>
            <tbody>
              @for (s of shipments(); track s.trackingId) {
                <tr>
                  <!-- Tracking ID -->
                  <td class="c-tracking">{{ s.trackingId }}</td>

                  <!-- Order ID -->
                  <td class="c-order">#{{ s.orderId }}</td>

                  <!-- Customer Name -->
                  <td>{{ s.customerName }}</td>

                  <!-- Carrier -->
                  <td>{{ s.carrier }}</td>

                  <!-- Destination -->
                  <td>{{ s.destination }}</td>

                  <!-- Status -->
                  <td>
                    <status-pill [status]="s.status" />
                  </td>

                  <!-- ETA -->
                  <td class="c-eta">
                    @if (s.eta) {
                      {{ s.eta | date: 'MMM d' }}
                    } @else {
                      <span style="color:var(--text-3)">TBD</span>
                    }
                  </td>
                </tr>
              }

              @if (!loading() && shipments().length === 0) {
                <tr>
                  <td colspan="7">
                    <div class="empty">
                      <div class="empty-icon">📦</div>
                      <div class="empty-title">No active shipments</div>
                      <p>Shipments you fulfill will appear here.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./corporate-shipments.scss'],
})
export class CorporateShipmentsComponent implements OnInit {
  loading = signal(true);
  shipments = signal<ShipmentRow[]>([]);

  // Derived KPIs
  pendingCount = computed(() => this.shipments().filter((s) => s.status === 'PENDING').length);
  inTransitCount = computed(
    () =>
      this.shipments().filter((s) => s.status === 'SHIPPED' || s.status === 'IN_TRANSIT').length,
  );
  deliveredCount = computed(() => this.shipments().filter((s) => s.status === 'DELIVERED').length);
  returnsCount = computed(
    () => this.shipments().filter((s) => s.orderStatus === 'RETURNED').length,
  );

  constructor(
    private title: Title,
    private orderService: OrderService,
  ) {
    this.title.setTitle('Shipments Tracking · Flower');
  }

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.loading.set(true);
    this.orderService
      .getStoreOrders()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          this.extractShipments(res);
        },
        error: (err) => console.error('Failed to load shipments from orders:', err),
      });
  }

  private extractShipments(orders: Order[]) {
    const rows: ShipmentRow[] = [];

    for (const o of orders) {
      if (o.shipment) {
        rows.push({
          trackingId: o.shipment.trackingNumber || 'TRK-PENDING',
          orderId: o.id,
          customerName: o.userName,
          carrier: o.shipment.carrier || 'Standard',
          destination: o.shipment.destination || (o as any).userCity || 'Unknown',
          status: o.shipment.status,
          orderStatus: o.status,
          eta: o.shipment.estimatedArrival ? new Date(o.shipment.estimatedArrival) : null,
        });
      }
    }

    // Sort by ID / ETA descending
    rows.sort((a, b) => b.orderId - a.orderId);
    this.shipments.set(rows);
  }
}

import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';

import { DashboardService } from '../../services/dashboard.service';
import { OrderService } from '../../services/order.service';
import { IndividualDashboard, Order } from '../../models/product.model';

import { FlowerIconComponent } from '../../shared/flower-icon/flower-icon';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';

Chart.register(...registerables);

/**
 * Individual (shopper) Dashboard — replicates `Flower Prototype.html`
 * §IndDashboard layout. Topbar already renders "Dashboard — Your spending
 * at a glance." so no in-page title.
 *
 * Data sources (backend-only — no hardcoded data):
 *  - KPIs come from GET /api/dashboard/individual (IndividualDashboard).
 *  - Recent orders come from GET /api/orders/me (first 4 by date desc).
 *
 * Deviations from the prototype caused by backend contract — the prototype
 * shows "Saved with discounts" and "+18% / +4%" deltas in KPIs, and an
 * "Orders over time" monthly bar chart. None of those fields exist on
 * IndividualDashboard, so:
 *  - KPI 4 shows "Items purchased" (totalItemsPurchased) with the same
 *    green accent and tag-style icon — keeps layout parity.
 *  - Delta chips are omitted (UI helper supports empty delta).
 *  - Left chart becomes "Spending by category" (bar) instead of monthly
 *    order count. Right chart stays the donut — "Orders by status" since
 *    we have that breakdown but not a spend-by-category currency-weighted
 *    donut that matches the prototype's total-in-center rendering.
 */
@Component({
  selector: 'app-individual-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DecimalPipe,
    DatePipe,
    FlowerIconComponent,
    KpiCardComponent,
    StatusPillComponent,
  ],
  template: `
    <div class="page ind-dashboard">
      @if (data(); as d) {
        <!-- KPI row — 4 cards, grid-cols-4 -->
        <div class="kpi-grid">
          <kpi-card
            label="Lifetime spend"
            [value]="'$' + (d.totalSpend | number: '1.2-2')"
            [sub]="'across ' + d.totalOrders + ' orders'"
            accent="#034f46"
            icon="chart"
          />
          <kpi-card
            label="Orders"
            [value]="d.totalOrders"
            [sub]="d.totalItemsPurchased + ' items purchased'"
            accent="#034f46"
            icon="package"
          />
          <kpi-card
            label="Average order"
            [value]="'$' + (d.avgOrderValue | number: '1.2-2')"
            sub="per order across history"
            accent="#d97706"
            icon="bolt"
          />
          <kpi-card
            label="Reviews written"
            [value]="d.totalReviews"
            [sub]="d.membershipType + ' member'"
            accent="#16a34a"
            icon="review"
          />
        </div>

        <!-- Charts row: 1.4fr / 1fr like prototype -->
        <div class="charts-row">
          <div class="card chart-card">
            <div class="chart-head">
              <h2>Spending by category</h2>
              <span class="chip">Lifetime</span>
            </div>
            <div class="chart-wrap"><canvas #categoryChart></canvas></div>
          </div>
          <div class="card chart-card">
            <h2>Orders by status</h2>
            <div class="chart-wrap"><canvas #orderChart></canvas></div>
          </div>
        </div>

        <!-- Recent orders -->
        <div class="card recent-orders-card">
          <div class="recent-head">
            <h2>Recent orders</h2>
            <a class="btn btn-sm view-all" routerLink="/orders">
              View all <flower-icon name="arrow_right" [size]="13" />
            </a>
          </div>
          @if (recentOrders().length > 0) {
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th style="text-align:right">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (o of recentOrders(); track o.id) {
                  <tr>
                    <td class="order-id">#{{ o.id }}</td>
                    <td class="order-date">{{ o.orderDate | date: 'mediumDate' }}</td>
                    <td><status-pill [status]="o.status" /></td>
                    <td class="order-payment">{{ o.paymentMethod }}</td>
                    <td class="order-total">\${{ o.grandTotal | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-row">No orders yet — head over to Products to start shopping.</div>
          }
        </div>

        <!-- Ask Flower AI banner -->
        <div class="ai-banner">
          <div class="ai-icon" aria-hidden="true">
            <flower-icon name="sparkle" [size]="22" [stroke]="1.8" />
          </div>
          <div class="ai-copy">
            <div class="ai-title">Ask Flower AI anything about your purchases</div>
            <div class="ai-sub">
              "What's my biggest-spend category?" · "Which orders took longest to deliver?"
            </div>
          </div>
          <a class="btn ai-cta" routerLink="/chat">
            Open chat <flower-icon name="arrow_right" [size]="14" />
          </a>
        </div>
      } @else {
        <div class="loading">Loading dashboard…</div>
      }
    </div>
  `,
  styleUrls: ['./individual-dashboard.scss'],
})
export class IndividualDashboardComponent implements OnInit, OnDestroy {
  data = signal<IndividualDashboard | null>(null);
  recentOrders = signal<Order[]>([]);

  @ViewChild('orderChart') orderChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryChartRef?: ElementRef<HTMLCanvasElement>;
  private charts: Chart[] = [];

  constructor(
    private dashboardService: DashboardService,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    this.dashboardService.getIndividualDashboard().subscribe((d) => {
      this.data.set(d);
      this.tryRenderCharts(d, 0);
    });
    this.orderService.getMyOrders().subscribe((orders) => {
      const sorted = [...orders].sort(
        (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
      );
      this.recentOrders.set(sorted.slice(0, 4));
    });
  }

  ngOnDestroy() {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];
  }

  /**
   * ViewChild canvases live inside @if (data()) so they aren't available
   * until a change-detection pass renders the block. Retry across a few
   * animation frames until both canvases are mounted.
   */
  private tryRenderCharts(d: IndividualDashboard, attempt: number) {
    if (attempt > 10) return;
    const ready = !!this.orderChartRef && !!this.categoryChartRef;
    if (!ready) {
      requestAnimationFrame(() => this.tryRenderCharts(d, attempt + 1));
      return;
    }
    this.renderCharts(d);
  }

  private renderCharts(d: IndividualDashboard) {
    this.charts.forEach((c) => c.destroy());
    this.charts = [];

    // Palette from FLOWER_DESIGN_SYSTEM.md §1.9 (chart colors).
    const donutPalette = ['#034f46', '#16a34a', '#ffa946', '#dfe9e5', '#7f1c34'];
    const fathom = '#034f46';
    const axisColor = '#8a8a7c';
    const gridColor = '#d5d5c0';

    const categoryCanvas = this.categoryChartRef?.nativeElement;
    if (categoryCanvas) {
      const catLabels = Object.keys(d.spendByCategory);
      this.charts.push(
        new Chart(categoryCanvas, {
          type: 'bar',
          data: {
            labels: catLabels,
            datasets: [
              {
                label: 'Spend ($)',
                data: catLabels.map((k) => d.spendByCategory[k]),
                backgroundColor: fathom,
                borderRadius: 6,
                barThickness: 22,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: axisColor, font: { size: 11 } }, grid: { display: false } },
              y: {
                beginAtZero: true,
                ticks: { color: axisColor, font: { size: 11 } },
                grid: { color: gridColor, tickBorderDash: [2, 2] },
              },
            },
          },
        }),
      );
    }

    const orderCanvas = this.orderChartRef?.nativeElement;
    if (orderCanvas) {
      const statusLabels = Object.keys(d.ordersByStatus);
      this.charts.push(
        new Chart(orderCanvas, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: statusLabels.map((k) => d.ordersByStatus[k]),
                backgroundColor: statusLabels.map((_, i) => donutPalette[i % donutPalette.length]),
                borderColor: '#faf8ea',
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: axisColor, font: { size: 11 }, boxWidth: 10 },
              },
            },
          },
        }),
      );
    }
  }
}

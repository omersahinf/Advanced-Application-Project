/*
 * Prototype inventory (Flower Prototype.html §CorpDashboard):
 *  flex column, gap 20
 *
 *  1) KPI grid — 4 columns, gap 16:
 *     [Revenue (MTD)]   fathom accent · icon "chart"   · delta +16%
 *     [Orders (MTD) ]   fathom accent · icon "package" · delta +11%
 *     [Customers    ]   fathom accent · icon "users"   · delta +24%
 *     [Avg rating   ]   #ffa946 accent · icon "star"   · (no delta)
 *
 *  2) Charts row — grid "1.6fr 1fr", gap 16:
 *     Left  card (padding 20):
 *       header: h2.serif "Revenue trend"  +  right chip "Last 6 months"
 *       LineChart (fathom line #034f46, fill rgba(3,79,70,0.10), h 200)
 *     Right card (padding 20):
 *       h2.serif "Orders by status"
 *       Donut (size 140, palette fathom/green/dawn/warn/crimson)
 *
 *  3) Top products card (padding 0):
 *     header (padding 14 20, border-bottom): h2.serif "Top products by review count"
 *     table: Product · Rating · Reviews · Stock · Price (right)
 *
 * Backend reality:
 *  - "Customers" KPI has no backing count; we substitute the backend's
 *    "Products" metric with the same fathom/package styling and add
 *    the low-stock figure as sub-text.
 *  - KPI deltas (+16% / +11% / +24%) are seeded-demo numbers — we drop
 *    them because the backend doesn't expose prior-period deltas.
 *  - Top-products table: DTO only carries productName / orderCount /
 *    revenue per row, so we render three columns (Product · Units sold
 *    · Revenue) instead of the prototype's five. The card wrapper,
 *    header, and row height match the prototype.
 *  - Drill-down, customer segmentation, widget-toggle, and date-filter
 *    features are backend-live but do not appear on the prototype; they
 *    have been removed from this screen to stay pixel-faithful and can
 *    be surfaced on /corporate/analytics in a later pass.
 */
import { Component, OnInit, signal, ElementRef, effect } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { CorporateDashboard } from '../../models/product.model';
import { Chart, registerables } from 'chart.js';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card';

Chart.register(...registerables);

@Component({
  selector: 'app-corporate-dashboard',
  standalone: true,
  imports: [DecimalPipe, KpiCardComponent],
  template: `
    @if (data(); as d) {
      <!-- 1) KPI grid ───────────────────────────────────── -->
      <div class="kpi-grid">
        <kpi-card
          label="Total revenue"
          [value]="'$' + formatMoney(d.totalRevenue)"
          [sub]="'across ' + d.totalOrders + ' orders'"
          accent="#034f46"
          icon="chart"
        />
        <kpi-card
          label="Orders"
          [value]="(d.totalOrders | number) || '0'"
          [sub]="d.pendingOrders + ' pending'"
          accent="#034f46"
          icon="package"
        />
        <kpi-card
          label="Products"
          [value]="(d.totalProducts | number) || '0'"
          [sub]="lowStockSub(d)"
          accent="#034f46"
          icon="users"
        />
        <kpi-card
          label="Avg rating"
          [value]="(d.avgRating | number: '1.1-1') || '—'"
          [sub]="'across ' + d.totalReviews + ' reviews'"
          accent="#ffa946"
          icon="star"
        />
      </div>

      <!-- 2) Charts row ────────────────────────────────── -->
      <div class="charts-row">
        <section class="card chart-card chart-revenue">
          <header class="chart-head">
            <h2>Revenue trend</h2>
            <span class="chip">Last 6 months</span>
          </header>
          @if (hasMonthlyData(d)) {
            <div class="chart-canvas-wrap">
              <canvas data-chart="revenue"></canvas>
            </div>
          } @else {
            <div class="chart-empty">No revenue data yet.</div>
          }
        </section>

        <section class="card chart-card chart-status">
          <h2>Orders by status</h2>
          @if (statusLabels(d).length > 0) {
            <div class="chart-canvas-wrap donut-wrap">
              <canvas data-chart="order"></canvas>
            </div>
          } @else {
            <div class="chart-empty">No orders yet.</div>
          }
        </section>
      </div>

      <!-- 3) Top products card ─────────────────────────── -->
      <section class="card top-card">
        <header class="top-head">
          <h2>Top products by revenue</h2>
        </header>
        @if (d.topProducts.length > 0) {
          <table class="top-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units sold</th>
                <th class="th-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              @for (p of d.topProducts; track p.productName) {
                <tr>
                  <td>
                    <div class="prod-cell">
                      <span class="prod-dot" aria-hidden="true">📦</span>
                      <div>
                        <div class="prod-name">{{ p.productName }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="c-muted">{{ p.orderCount }}</td>
                  <td class="c-total">\${{ p.revenue | number: '1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="empty-inline">No product sales yet.</div>
        }
      </section>
    } @else {
      <div class="loading">Loading dashboard…</div>
    }
  `,
  styleUrls: ['./corporate-dashboard.scss'],
})
export class CorporateDashboardComponent implements OnInit {
  data = signal<CorporateDashboard | null>(null);
  firstName = signal<string>('');

  private orderChart: Chart | null = null;
  private revenueChart: Chart | null = null;

  constructor(
    private dashboardService: DashboardService,
    private auth: AuthService,
    private host: ElementRef<HTMLElement>,
  ) {
    effect(() => {
      const d = this.data();
      if (!d) return;
      requestAnimationFrame(() => requestAnimationFrame(() => this.tryRenderCharts(d, 0)));
    });
  }

  ngOnInit() {
    this.firstName.set(this.auth.currentFirstName() || '');
    this.dashboardService.getCorporateDashboard().subscribe((d) => this.data.set(d));
  }

  /* ── helpers ─────────────────────────────────────────── */
  formatMoney(n: number | null | undefined): string {
    const v = n ?? 0;
    return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  lowStockSub(d: CorporateDashboard): string {
    if (d.lowStockProducts > 0) return `${d.lowStockProducts} low stock`;
    return d.storeName || 'In catalog';
  }

  hasMonthlyData(d: CorporateDashboard): boolean {
    return !!d.revenueByMonth && Object.keys(d.revenueByMonth).length > 0;
  }

  statusLabels(d: CorporateDashboard): string[] {
    return Object.keys(d.ordersByStatus || {});
  }

  /* ── chart rendering ─────────────────────────────────── */
  private getCanvas(name: string): HTMLCanvasElement | null {
    return this.host.nativeElement.querySelector<HTMLCanvasElement>(`canvas[data-chart="${name}"]`);
  }

  private tryRenderCharts(d: CorporateDashboard, attempt: number) {
    const needOrder = this.statusLabels(d).length > 0;
    const needRevenue = this.hasMonthlyData(d);
    const orderC = needOrder ? this.getCanvas('order') : null;
    const revenueC = needRevenue ? this.getCanvas('revenue') : null;
    const ready = (!needOrder || orderC) && (!needRevenue || revenueC);
    if (ready) {
      try {
        this.renderCharts(d);
      } catch (e) {
        console.error('[corp dashboard charts] render failed', e);
      }
    } else if (attempt < 30) {
      setTimeout(() => this.tryRenderCharts(d, attempt + 1), 50);
    }
  }

  private renderCharts(d: CorporateDashboard) {
    if (this.orderChart) this.orderChart.destroy();
    if (this.revenueChart) this.revenueChart.destroy();

    // DS §1.9 chart palette — fathom/green/dawn/warn/crimson
    const donutPalette = ['#16a34a', '#034f46', '#dfe9e5', '#ffa946', '#7f1c34'];
    const fathom = '#034f46';
    const fathomFill = 'rgba(3, 79, 70, 0.10)';
    const axisColor = '#8a8a7c';
    const gridColor = '#d5d5c0';

    const revenueC = this.getCanvas('revenue');
    if (revenueC && this.hasMonthlyData(d)) {
      const months = Object.keys(d.revenueByMonth).sort();
      this.revenueChart = new Chart(revenueC, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Revenue',
              data: months.map((m) => d.revenueByMonth[m]),
              borderColor: fathom,
              backgroundColor: fathomFill,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: fathom,
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              pointRadius: 5,
              pointHoverRadius: 8,
              borderWidth: 2.5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { mode: 'nearest', intersect: true },
          },
          scales: {
            x: {
              ticks: { color: axisColor, font: { size: 11 } },
              grid: { color: gridColor, tickBorderDash: [4, 4] },
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: axisColor,
                font: { size: 11 },
                callback: (v) => '$' + Number(v).toLocaleString(),
              },
              grid: { color: gridColor, tickBorderDash: [4, 4] },
            },
          },
        },
      });
    }

    const orderC = this.getCanvas('order');
    if (orderC && this.statusLabels(d).length > 0) {
      const labels = this.statusLabels(d);
      this.orderChart = new Chart(orderC, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: labels.map((k) => d.ordersByStatus[k]),
              backgroundColor: labels.map((k, i) =>
                k.toUpperCase() === 'CANCELLED' ? '#7f1c34' : donutPalette[i % donutPalette.length],
              ),
              borderColor: '#faf8ea',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: axisColor, font: { size: 11 }, boxWidth: 10, padding: 12 },
            },
          },
          cutout: '62%',
        },
      });
    }
  }
}

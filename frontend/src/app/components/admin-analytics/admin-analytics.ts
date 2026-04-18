/**
 * Admin Analytics — pixel-parity replica of Flower Prototype.html §AdmAnalytics.
 *
 * Inventory (verbatim):
 *   Root: padding "12px 32px 40px".
 *   Tab switcher: a pill row (gap 6, padding 4, bg var(--hover), radius
 *     10, width fit-content). Buttons are btn-sm; the active tab gets
 *     bg var(--lumen) + 1px var(--border) border.
 *     Tabs (exact labels): "Store comparison" | "Customer segmentation"
 *     | "Category performance".
 *
 *   Tab 1 — Store comparison:
 *     2-col grid of cards (padding 18). Each card:
 *       row {serif 16/700 store name} <StatusPill/>
 *       4-col grid { Revenue | Orders | Products | Rating }  (Stat widget)
 *       8px tall progress rail with fill %; caption
 *         "Revenue share of top performer" (text-3 11px).
 *
 *   Tab 2 — Customer segmentation:
 *     2-col grid. Left card "Customers by membership" (Donut chart).
 *     Right card "Satisfaction distribution" (BarChart).
 *
 *   Tab 3 — Category performance:
 *     Single card "Top categories by revenue" — BarChart, fathom bars.
 *
 * Adaptations (backend reality):
 *   - Store comparison uses AdminService.getStoreComparison().
 *     Top performer is the max totalRevenue.
 *   - Customer segmentation:
 *       • Donut data comes from CustomerSegmentation.byMembership.
 *       • "Satisfaction distribution" is not in the API, so we swap
 *         in CustomerSegmentation.byCity (top 4 cities) as a bar —
 *         same chart type / visual slot, different real data.
 *         The card title becomes "Customers by city" to stay honest.
 *   - Category performance: no "revenue by category" endpoint exists,
 *     so we derive product count per root category from
 *     ProductService.getProducts() (client-side aggregation). Title
 *     becomes "Top categories by product count" — same chart type,
 *     same position.
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { AdminService } from '../../services/admin.service';
import { ProductService } from '../../services/product.service';
import {
  CustomerSegmentation,
  Product,
  StoreComparison,
} from '../../models/product.model';
import { StatusPillComponent } from '../../shared/status-pill/status-pill';
import { FlowerStarsComponent } from '../../shared/flower-stars/flower-stars';

Chart.register(...registerables);

type TabKey = 'comparison' | 'segmentation' | 'categories';

const MEMBERSHIP_PALETTE: Record<string, string> = {
  GOLD: '#ffa946',
  PREMIUM: '#dfe9e5',
  SILVER: '#d5d5c0',
  STANDARD: '#034f46',
};

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule, StatusPillComponent, FlowerStarsComponent],
  template: `
    <div class="page">
      <!-- Tab switcher —————————————————————————————— -->
      <div class="tab-pills" role="tablist">
        <button
          type="button"
          class="btn btn-sm"
          [class.active]="tab() === 'comparison'"
          (click)="setTab('comparison')"
          role="tab"
          [attr.aria-selected]="tab() === 'comparison'"
        >
          Store comparison
        </button>
        <button
          type="button"
          class="btn btn-sm"
          [class.active]="tab() === 'segmentation'"
          (click)="setTab('segmentation')"
          role="tab"
          [attr.aria-selected]="tab() === 'segmentation'"
        >
          Customer segmentation
        </button>
        <button
          type="button"
          class="btn btn-sm"
          [class.active]="tab() === 'categories'"
          (click)="setTab('categories')"
          role="tab"
          [attr.aria-selected]="tab() === 'categories'"
        >
          Category performance
        </button>
      </div>

      <!-- Store comparison ————————————————————————— -->
      @if (tab() === 'comparison') {
        @if (stores().length === 0) {
          <div class="loading">Loading store comparison…</div>
        } @else {
          <div class="comparison-grid">
            @for (s of stores(); track s.storeId) {
              <div class="card store-card">
                <div class="store-head">
                  <b class="store-name">{{ s.storeName }}</b>
                  <status-pill [status]="s.status" />
                </div>
                <div class="stats-row">
                  <div class="stat">
                    <div class="stat-k">Revenue</div>
                    <div class="stat-v">\${{ s.totalRevenue | number: '1.2-2' }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Orders</div>
                    <div class="stat-v">{{ s.totalOrders }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Products</div>
                    <div class="stat-v">{{ s.totalProducts }}</div>
                  </div>
                  <div class="stat">
                    <div class="stat-k">Rating</div>
                    <div class="stat-v rating-v">
                      <flower-stars [value]="s.avgRating" [size]="11" />
                      <span>{{ s.avgRating ? (s.avgRating | number: '1.1-1') : '—' }}</span>
                    </div>
                  </div>
                </div>
                <div class="rail">
                  <div class="rail-fill" [style.width.%]="sharePct(s)"></div>
                </div>
                <div class="rail-caption">Revenue share of top performer</div>
              </div>
            }
          </div>
        }
      }

      <!-- Customer segmentation —————————————————————— -->
      @if (tab() === 'segmentation') {
        @if (!segmentation()) {
          <div class="loading">Loading customer segmentation…</div>
        } @else {
          <div class="twocol-grid">
            <div class="card chart-card">
              <h2 class="serif-h2">Customers by membership</h2>
              <div class="donut-wrap">
                <canvas #membershipChart></canvas>
              </div>
            </div>
            <div class="card chart-card">
              <h2 class="serif-h2">Customers by city</h2>
              <div class="bar-wrap">
                <canvas #cityChart></canvas>
              </div>
            </div>
          </div>
        }
      }

      <!-- Category performance —————————————————————— -->
      @if (tab() === 'categories') {
        <div class="card chart-card">
          <h2 class="serif-h2">Top categories by product count</h2>
          @if (categoryBars().length === 0) {
            <div class="loading">Loading categories…</div>
          } @else {
            <div class="bar-wrap tall">
              <canvas #categoryChart></canvas>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./admin-analytics.scss'],
})
export class AdminAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {
  tab = signal<TabKey>('comparison');

  stores = signal<StoreComparison[]>([]);
  segmentation = signal<CustomerSegmentation | null>(null);
  products = signal<Product[]>([]);

  topRevenue = computed(() => {
    const values = this.stores().map((s) => s.totalRevenue);
    return values.length ? Math.max(...values) : 0;
  });

  categoryBars = computed<{ name: string; count: number }[]>(() => {
    const byCategory = new Map<string, number>();
    for (const p of this.products()) {
      const key = p.category || '(Uncategorised)';
      byCategory.set(key, (byCategory.get(key) ?? 0) + 1);
    }
    return Array.from(byCategory.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });

  @ViewChild('membershipChart') membershipRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('cityChart') cityRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryRef?: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  constructor(
    private adminService: AdminService,
    private productService: ProductService,
  ) {
    effect(() => {
      this.tab();
      this.stores();
      this.segmentation();
      this.products();
      this.destroyCharts();
      requestAnimationFrame(() => this.renderActiveTabCharts());
    });
  }

  ngOnInit() {
    this.adminService.getStoreComparison().subscribe((s) => this.stores.set(s));
    this.adminService.getCustomerSegmentation().subscribe((s) => this.segmentation.set(s));
    this.productService.getProducts().subscribe((p) => this.products.set(p));
  }

  ngAfterViewInit() {
    this.renderActiveTabCharts();
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  setTab(t: TabKey) {
    this.tab.set(t);
  }

  sharePct(s: StoreComparison): number {
    const top = this.topRevenue();
    if (!top) return 0;
    return Math.min(100, Math.max(0, (s.totalRevenue / top) * 100));
  }

  private destroyCharts() {
    for (const c of this.charts) c.destroy();
    this.charts = [];
  }

  private renderActiveTabCharts() {
    switch (this.tab()) {
      case 'segmentation':
        this.renderMembershipChart();
        this.renderCityChart();
        break;
      case 'categories':
        this.renderCategoryChart();
        break;
      default:
        break;
    }
  }

  private renderMembershipChart(attempt = 0) {
    if (attempt > 20) return;
    const canvas = this.membershipRef?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => this.renderMembershipChart(attempt + 1));
      return;
    }
    const seg = this.segmentation();
    if (!seg) return;
    const entries = Object.entries(seg.byMembership || {});
    const labels = entries.map(([k]) => k);
    const values = entries.map(([, v]) => v);
    const colors = labels.map(
      (k) => MEMBERSHIP_PALETTE[(k || '').toUpperCase()] ?? '#8a8a7c',
    );
    this.charts.push(
      new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            { data: values, backgroundColor: colors, borderWidth: 0, spacing: 2 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#5a5a52', font: { size: 11 } },
            },
          },
        },
      }),
    );
  }

  private renderCityChart(attempt = 0) {
    if (attempt > 20) return;
    const canvas = this.cityRef?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => this.renderCityChart(attempt + 1));
      return;
    }
    const seg = this.segmentation();
    if (!seg) return;
    const top = Object.entries(seg.byCity || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const labels = top.map(([k]) => k);
    const values = top.map(([, v]) => v);
    this.charts.push(
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Customers',
              data: values,
              backgroundColor: '#034f46',
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8a8a7c', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#ebe6dc' },
              ticks: { color: '#8a8a7c', font: { size: 11 }, precision: 0 },
            },
          },
        },
      }),
    );
  }

  private renderCategoryChart(attempt = 0) {
    if (attempt > 20) return;
    const canvas = this.categoryRef?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => this.renderCategoryChart(attempt + 1));
      return;
    }
    const rows = this.categoryBars();
    if (!rows.length) return;
    this.charts.push(
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: rows.map((r) => r.name),
          datasets: [
            {
              label: 'Products',
              data: rows.map((r) => r.count),
              backgroundColor: '#034f46',
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8a8a7c', font: { size: 11 } },
            },
            y: {
              beginAtZero: true,
              grid: { color: '#ebe6dc' },
              ticks: { color: '#8a8a7c', font: { size: 11 }, precision: 0 },
            },
          },
        },
      }),
    );
  }
}

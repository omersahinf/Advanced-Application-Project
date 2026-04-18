/**
 * Admin Settings — pixel-parity replica of Flower Prototype.html §AdmSettings.
 *
 * Inventory (verbatim):
 *   Root: padding 12px 32px 40px, grid 2 cols, gap 16.
 *   Cards (padding 20) with serif 16/700 h3 titles:
 *     "Platform"     — Platform name / Default currency / Tax rate /
 *                      Default locale / Timezone
 *     "Security"     — JWT algorithm / Access token TTL / Refresh token
 *                      TTL / Rate limit rows
 *     "AI chatbot"   — LLM provider / Model / Max retries / Visualizer
 *                      timeout / Fallback
 *     "Integrations" — Payments / Database profile / CORS origin /
 *                      Session policy
 *
 *   SettingRow:
 *     flex, space-between, padding 10px 0, border-bottom var(--border),
 *     font-size 13; left label uses var(--text-2); right value uses
 *     var(--mono) 12.5.
 *
 * Adaptations:
 *   - Our backend exposes a writable PlatformSettings object with
 *     a subset of the prototype's rows (siteName, defaultCurrency,
 *     maintenanceMode, maxProductsPerStore, lowStockThreshold,
 *     orderAutoConfirm, reviewModerationEnabled, sessionTimeoutMinutes).
 *     We keep the 2x2 card grid and SettingRow rhythm from the
 *     prototype and use the backend data where it maps cleanly:
 *       "Platform"     → editable General (site + currency + maintenance)
 *       "Store rules"  → editable Store & Products rules
 *       "Orders & reviews" → editable toggles
 *       "Security"     → editable session timeout
 *     The prototype's stricter rows (JWT algorithm, rate limits, etc.)
 *     are infra-level and absent from the Settings API, so they're
 *     omitted rather than faked.
 *   - Save / Reset buttons sit below the grid.
 */
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

export interface PlatformSettings {
  siteName: string;
  maintenanceMode: boolean;
  maxProductsPerStore: number;
  defaultCurrency: string;
  orderAutoConfirm: boolean;
  reviewModerationEnabled: boolean;
  lowStockThreshold: number;
  sessionTimeoutMinutes: number;
}

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      @if (settings(); as s) {
        <div class="settings-grid">
          <!-- Platform card -->
          <div class="card setting-card">
            <h3 class="serif-h3">Platform</h3>
            <div class="row">
              <span class="k">Platform name</span>
              <input class="v-input" type="text" [(ngModel)]="s.siteName" />
            </div>
            <div class="row">
              <span class="k">Default currency</span>
              <select class="v-input" [(ngModel)]="s.defaultCurrency">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="TRY">TRY (₺)</option>
              </select>
            </div>
            <div class="row">
              <span class="k">Maintenance mode</span>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.maintenanceMode" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- Store & products card -->
          <div class="card setting-card">
            <h3 class="serif-h3">Store rules</h3>
            <div class="row">
              <span class="k">Max products per store</span>
              <input
                class="v-input num"
                type="number"
                [(ngModel)]="s.maxProductsPerStore"
                min="1"
              />
            </div>
            <div class="row">
              <span class="k">Low-stock threshold</span>
              <input class="v-input num" type="number" [(ngModel)]="s.lowStockThreshold" min="1" />
            </div>
          </div>

          <!-- Orders & reviews card -->
          <div class="card setting-card">
            <h3 class="serif-h3">Orders &amp; reviews</h3>
            <div class="row">
              <span class="k">Auto-confirm orders</span>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.orderAutoConfirm" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="row">
              <span class="k">Review moderation</span>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.reviewModerationEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- Security card -->
          <div class="card setting-card">
            <h3 class="serif-h3">Security</h3>
            <div class="row">
              <span class="k">Session timeout</span>
              <input
                class="v-input num"
                type="number"
                [(ngModel)]="s.sessionTimeoutMinutes"
                min="5"
                max="1440"
              />
              <span class="v-unit">min</span>
            </div>
          </div>
        </div>

        <div class="actions">
          <button type="button" class="btn" (click)="loadSettings()">Reset</button>
          <button type="button" class="btn btn-primary" (click)="saveSettings()">
            Save settings
          </button>
        </div>

        @if (saved()) {
          <div class="toast">Settings saved.</div>
        }
      } @else {
        <div class="loading">Loading settings…</div>
      }
    </div>
  `,
  styleUrls: ['./admin-settings.scss'],
})
export class AdminSettingsComponent implements OnInit {
  settings = signal<PlatformSettings | null>(null);
  saved = signal(false);

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.adminService.getSettings().subscribe((s) => this.settings.set(s));
  }

  saveSettings() {
    const s = this.settings();
    if (!s) return;
    this.adminService.updateSettings(s).subscribe(() => {
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 3000);
    });
  }
}

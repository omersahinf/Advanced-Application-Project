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
  imports: [FormsModule],
  template: `
    <div class="page">
      @if (settings(); as s) {
        <div class="settings-grid">
          <div class="settings-card card">
            <h3>General</h3>
            <div class="field">
              <label>Site Name</label>
              <input type="text" [(ngModel)]="s.siteName" />
            </div>
            <div class="field">
              <label>Default Currency</label>
              <select [(ngModel)]="s.defaultCurrency">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div class="field toggle-field">
              <label>Maintenance Mode</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.maintenanceMode" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="settings-card card">
            <h3>Store & Products</h3>
            <div class="field">
              <label>Max Products per Store</label>
              <input type="number" [(ngModel)]="s.maxProductsPerStore" min="1" />
            </div>
            <div class="field">
              <label>Low Stock Threshold</label>
              <input type="number" [(ngModel)]="s.lowStockThreshold" min="1" />
            </div>
          </div>

          <div class="settings-card card">
            <h3>Orders & Reviews</h3>
            <div class="field toggle-field">
              <label>Auto-confirm Orders</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.orderAutoConfirm" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="field toggle-field">
              <label>Review Moderation</label>
              <label class="toggle">
                <input type="checkbox" [(ngModel)]="s.reviewModerationEnabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="settings-card card">
            <h3>Security</h3>
            <div class="field">
              <label>Session Timeout (minutes)</label>
              <input type="number" [(ngModel)]="s.sessionTimeoutMinutes" min="5" max="1440" />
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn-save" (click)="saveSettings()">Save Settings</button>
          <button class="btn-reset" (click)="loadSettings()">Reset</button>
        </div>

        @if (saved()) {
          <div class="toast">Settings saved successfully!</div>
        }
      } @else {
        <div class="loading">Loading settings...</div>
      }
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 24px;
      }
      .page-header {
        margin-bottom: 28px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
      }
      .page-header p {
        color: #666;
        font-size: 14px;
        margin-top: 4px;
      }
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        margin-bottom: 24px;
      }
      .settings-card {
        padding: 24px;
      }
      .settings-card h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 18px;
        color: #1a1a1a;
        border-bottom: 1px solid #d5d5c0;
        padding-bottom: 10px;
      }
      .field {
        margin-bottom: 16px;
      }
      .field label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #666;
        margin-bottom: 6px;
      }
      .field input[type='text'],
      .field input[type='number'],
      .field select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        font-size: 14px;
        transition: border-color 0.15s;
        box-sizing: border-box;
        background: #ffffeb;
        color: #1a1a1a;
      }
      .field input:focus,
      .field select:focus {
        outline: none;
        border-color: #034f46;
      }
      .toggle-field {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .toggle-field label:first-child {
        margin-bottom: 0;
      }
      .toggle {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }
      .toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #c8c8b4;
        border-radius: 24px;
        transition: 0.2s;
      }
      .slider::before {
        content: '';
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background: #ffffeb;
        border-radius: 50%;
        transition: 0.2s;
      }
      .toggle input:checked + .slider {
        background: #034f46;
      }
      .toggle input:checked + .slider::before {
        transform: translateX(20px);
        background: #ffffeb;
      }
      .actions {
        display: flex;
        gap: 12px;
      }
      .btn-save {
        padding: 10px 28px;
        background: #034f46;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .btn-save:hover {
        background: #034f46;
      }
      .btn-reset {
        padding: 10px 28px;
        background: #ffffeb;
        color: #666;
        border: 1px solid #c8c8b4;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-reset:hover {
        background: #f5f5e1;
      }
      .toast {
        margin-top: 16px;
        padding: 12px 20px;
        background: #dcfce7;
        color: #16a34a;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        animation: fadeIn 0.3s;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .loading {
        text-align: center;
        padding: 60px;
        color: #666;
      }
      @media (max-width: 768px) {
        .settings-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
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

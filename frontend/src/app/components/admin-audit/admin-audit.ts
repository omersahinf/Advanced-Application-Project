import { Component } from '@angular/core';

/**
 * Admin Audit Logs — prototype stub.
 *
 * Page scaffolding only. The full implementation (filters, log table, export
 * button, impersonation/failed-login flags) lands in the page-by-page
 * replication pass — see Flower Prototype.html §AdmAudit.
 *
 * Backend: no audit-log endpoint exists yet in the Spring Boot API. This page
 * intentionally shows an empty state rather than fake data, per the "no
 * hardcoded data" rule. When the backend adds `/api/admin/audit`, wire it in.
 */
@Component({
  selector: 'app-admin-audit',
  standalone: true,
  template: `
    <div class="page">
      <div class="card empty-card">
        <h2>Audit Logs</h2>
        <p>Every sensitive action, who did it, from where.</p>
        <p class="muted">
          This view is scaffolded but not yet connected to the backend. A dedicated audit-log
          endpoint will populate this page in a future release.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 12px 32px 40px;
      }
      .empty-card {
        padding: 28px 32px;
      }
      h2 {
        font-family: var(--serif);
        font-weight: 700;
        font-size: 20px;
        letter-spacing: -0.3px;
        margin: 0 0 6px;
      }
      p {
        color: var(--text-2);
        font-size: 13.5px;
        margin: 0 0 8px;
      }
      .muted {
        color: var(--text-3);
        font-size: 12.5px;
      }
    `,
  ],
})
export class AdminAuditComponent {}

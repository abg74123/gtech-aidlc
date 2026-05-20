import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ReportTab {
  path: string;
  label: string;
  icon: string;
}

const REPORT_TABS: ReportTab[] = [
  { path: 'dashboard', label: 'Dashboard', icon: '📊' },
  { path: 'stock-balance', label: 'ยอดสต็อก', icon: '📦' },
  { path: 'ap-aging', label: 'AP Aging', icon: '📄' },
  { path: 'ar-aging', label: 'AR Aging', icon: '📑' },
  { path: 'alerts', label: 'ประวัติแจ้งเตือน', icon: '🔔' },
];

@Component({
  selector: 'app-reports-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="reports-shell">
      <nav class="report-tabs" role="tablist" aria-label="Reports navigation">
        @for (tab of tabs; track tab.path) {
          <a
            class="report-tab"
            [routerLink]="tab.path"
            routerLinkActive="active"
            role="tab"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            <span class="tab-label">{{ tab.label }}</span>
          </a>
        }
      </nav>

      <div class="report-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .reports-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .report-tabs {
      display: flex;
      gap: 0.25rem;
      padding: 0.75rem 1.5rem 0;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
      overflow-x: auto;
      flex-shrink: 0;
    }

    .report-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: none;
      border-bottom: 3px solid transparent;
      background: transparent;
      color: #6b7280;
      font-size: 0.9rem;
      font-weight: 500;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s, background-color 0.15s;
      white-space: nowrap;
      border-radius: 4px 4px 0 0;
    }

    .report-tab:hover {
      color: #1976d2;
      background: #f3f4f6;
    }

    .report-tab.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
      background: #eff6ff;
    }

    .tab-icon {
      font-size: 1rem;
    }

    .report-content {
      flex: 1;
      overflow: auto;
    }
  `],
})
export class ReportsShellComponent {
  readonly tabs = REPORT_TABS;
}

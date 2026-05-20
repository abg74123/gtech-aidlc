import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Column definition for the report table.
 */
export interface ReportTableColumn {
  /** Property key to access from the data object */
  key: string;
  /** Display header text */
  header: string;
  /** Optional format: 'number', 'currency', 'date', or custom format string */
  format?: 'number' | 'currency' | 'date' | string;
}

/**
 * Sort event emitted when a column header is clicked.
 */
export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc' | '';
}

/**
 * Reusable report table component.
 *
 * Renders a data table with configurable columns, optional sorting,
 * and support for any array of objects as data source.
 *
 * Usage:
 * ```html
 * <app-report-table
 *   [columns]="columns"
 *   [data]="data"
 *   [sortable]="true"
 *   (sortChange)="onSort($event)">
 * </app-report-table>
 * ```
 */
@Component({
  selector: 'app-report-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="report-table-container">
      <table class="report-table" role="grid" aria-label="Report data table">
        <thead>
          <tr>
            @for (col of columns; track col.key) {
              <th
                [class.sortable]="sortable"
                [class.sorted]="currentSort.column === col.key"
                [attr.aria-sort]="getAriaSort(col.key)"
                (click)="onHeaderClick(col.key)"
                (keydown.enter)="onHeaderClick(col.key)"
                [attr.tabindex]="sortable ? 0 : null"
                role="columnheader">
                <span class="header-text">{{ col.header }}</span>
                @if (sortable && currentSort.column === col.key) {
                  <span class="sort-indicator" aria-hidden="true">
                    {{ currentSort.direction === 'asc' ? '▲' : '▼' }}
                  </span>
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @if (data.length === 0) {
            <tr>
              <td [attr.colspan]="columns.length" class="empty-row">
                ไม่พบข้อมูล
              </td>
            </tr>
          }
          @for (row of data; track $index) {
            <tr>
              @for (col of columns; track col.key) {
                <td [class]="'col-' + col.key">
                  {{ formatCell(row[col.key], col.format) }}
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .report-table-container {
      width: 100%;
      overflow-x: auto;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .report-table th,
    .report-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }

    .report-table thead th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
      user-select: none;
    }

    .report-table thead th.sortable {
      cursor: pointer;
    }

    .report-table thead th.sortable:hover {
      background-color: #f1f5f9;
    }

    .report-table thead th.sorted {
      color: #1e40af;
    }

    .report-table tbody tr:hover {
      background-color: #f8fafc;
    }

    .sort-indicator {
      margin-left: 0.25rem;
      font-size: 0.625rem;
    }

    .empty-row {
      text-align: center;
      color: #94a3b8;
      padding: 2rem 1rem;
    }
  `],
})
export class ReportTableComponent {
  /** Column definitions */
  @Input() columns: ReportTableColumn[] = [];

  /** Data rows to display */
  @Input() data: Record<string, unknown>[] = [];

  /** Whether columns are sortable */
  @Input() sortable = false;

  /** Emits when a sortable column header is clicked */
  @Output() sortChange = new EventEmitter<SortEvent>();

  /** Current sort state */
  currentSort: SortEvent = { column: '', direction: '' };

  onHeaderClick(column: string): void {
    if (!this.sortable) return;

    let direction: 'asc' | 'desc' | '' = 'asc';
    if (this.currentSort.column === column) {
      if (this.currentSort.direction === 'asc') {
        direction = 'desc';
      } else if (this.currentSort.direction === 'desc') {
        direction = '';
      }
    }

    this.currentSort = { column: direction ? column : '', direction };
    this.sortChange.emit(this.currentSort);
  }

  getAriaSort(column: string): string | null {
    if (this.currentSort.column !== column) return null;
    return this.currentSort.direction === 'asc' ? 'ascending' : 'descending';
  }

  formatCell(value: unknown, format?: string): string {
    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'number':
        return typeof value === 'number'
          ? value.toLocaleString('th-TH')
          : String(value);
      case 'currency':
        return typeof value === 'number'
          ? value.toLocaleString('th-TH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : String(value);
      case 'date':
        return value instanceof Date
          ? value.toLocaleDateString('th-TH')
          : String(value);
      default:
        return String(value);
    }
  }
}

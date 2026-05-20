import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Pagination metadata matching the API response format.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Page change event emitted when the user navigates.
 */
export interface PageChangeEvent {
  page: number;
  limit: number;
}

/**
 * Server-side pagination controls component.
 *
 * Displays page info and navigation buttons (first, prev, next, last).
 * Designed for server-side pagination — emits page change events
 * for the parent to fetch new data.
 *
 * Usage:
 * ```html
 * <app-pagination
 *   [pagination]="paginationMeta"
 *   (pageChange)="onPageChange($event)">
 * </app-pagination>
 * ```
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="pagination-container" role="navigation" aria-label="Pagination">
      <span class="pagination-info">
        แสดง {{ startItem }}–{{ endItem }} จาก {{ pagination.total }} รายการ
      </span>

      <div class="pagination-controls">
        <button
          class="pagination-btn"
          [disabled]="pagination.page <= 1"
          (click)="goToPage(1)"
          aria-label="ไปหน้าแรก"
          title="หน้าแรก">
          ⟨⟨
        </button>
        <button
          class="pagination-btn"
          [disabled]="pagination.page <= 1"
          (click)="goToPage(pagination.page - 1)"
          aria-label="หน้าก่อนหน้า"
          title="ก่อนหน้า">
          ⟨
        </button>

        <span class="pagination-page-info">
          หน้า {{ pagination.page }} / {{ pagination.totalPages || 1 }}
        </span>

        <button
          class="pagination-btn"
          [disabled]="pagination.page >= pagination.totalPages"
          (click)="goToPage(pagination.page + 1)"
          aria-label="หน้าถัดไป"
          title="ถัดไป">
          ⟩
        </button>
        <button
          class="pagination-btn"
          [disabled]="pagination.page >= pagination.totalPages"
          (click)="goToPage(pagination.totalPages)"
          aria-label="ไปหน้าสุดท้าย"
          title="หน้าสุดท้าย">
          ⟩⟩
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-top: 1px solid #e2e8f0;
      font-size: 0.875rem;
      color: #475569;
    }

    .pagination-info {
      white-space: nowrap;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .pagination-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.25rem;
      background: #fff;
      color: #475569;
      font-size: 0.75rem;
      cursor: pointer;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .pagination-btn:hover:not(:disabled) {
      background-color: #f1f5f9;
      border-color: #cbd5e1;
    }

    .pagination-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .pagination-page-info {
      padding: 0 0.75rem;
      white-space: nowrap;
    }
  `],
})
export class PaginationComponent {
  /** Pagination metadata from the API response */
  @Input() pagination: PaginationMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

  /** Emits when the user navigates to a different page */
  @Output() pageChange = new EventEmitter<PageChangeEvent>();

  get startItem(): number {
    if (this.pagination.total === 0) return 0;
    return (this.pagination.page - 1) * this.pagination.limit + 1;
  }

  get endItem(): number {
    const end = this.pagination.page * this.pagination.limit;
    return Math.min(end, this.pagination.total);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.totalPages) return;
    if (page === this.pagination.page) return;

    this.pageChange.emit({ page, limit: this.pagination.limit });
  }
}

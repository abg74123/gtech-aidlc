import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import {
  ReportsApiService,
  StockBalanceView,
  StockBalanceFilter,
  StockBalanceSummary,
  PaginationMeta,
} from '../../services/reports-api.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-stock-balance',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <div class="report-container">
      <h2>รายงานยอดสต็อก (Stock Balance)</h2>

      <!-- Filter Form -->
      <form [formGroup]="filterForm" (ngSubmit)="applyFilter()" class="filter-form">
        <div class="filter-fields">
          <div class="field">
            <label for="search">ค้นหา</label>
            <input
              id="search"
              type="text"
              formControlName="search"
              placeholder="ค้นหาชื่อสินค้า..."
            />
          </div>
          <div class="field">
            <label for="itemId">รหัสสินค้า</label>
            <input
              id="itemId"
              type="text"
              formControlName="itemId"
              placeholder="Item ID (optional)"
            />
          </div>
          <div class="field">
            <label for="warehouseId">รหัสคลัง</label>
            <input
              id="warehouseId"
              type="text"
              formControlName="warehouseId"
              placeholder="Warehouse ID (optional)"
            />
          </div>
        </div>
        <div class="filter-actions">
          <button type="submit" class="btn btn-primary">ค้นหา</button>
          <button type="button" class="btn btn-secondary" (click)="resetFilter()">ล้างตัวกรอง</button>
        </div>
      </form>

      <!-- Summary -->
      @if (summary(); as s) {
        <div class="summary-bar">
          <div class="summary-item">
            <span class="summary-label">จำนวนรายการ:</span>
            <span class="summary-value">{{ s.totalItems | number }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">มูลค่ารวม:</span>
            <span class="summary-value">{{ s.totalValue | number:'1.2-2' }} THB</span>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-indicator">
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      }

      <!-- Error State -->
      @if (error()) {
        <div class="error-message" role="alert">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary" (click)="loadData()">ลองใหม่</button>
        </div>
      }

      <!-- Data Table -->
      @if (!loading() && !error() && data().length > 0) {
        <div class="table-wrapper">
          <table class="report-table" aria-label="Stock Balance Report">
            <thead>
              <tr>
                <th scope="col">ชื่อสินค้า</th>
                <th scope="col">คลังสินค้า</th>
                <th scope="col" class="text-right">จำนวนคงเหลือ</th>
                <th scope="col" class="text-right">ต้นทุนเฉลี่ย (MA)</th>
                <th scope="col" class="text-right">มูลค่ารวม</th>
              </tr>
            </thead>
            <tbody>
              @for (row of data(); track row.itemId + row.warehouseId) {
                <tr>
                  <td>{{ row.itemName }}</td>
                  <td>{{ row.warehouseName }}</td>
                  <td class="text-right">{{ row.currentQty | number }}</td>
                  <td class="text-right">{{ row.currentMA | number:'1.2-2' }}</td>
                  <td class="text-right">{{ row.totalValue | number:'1.2-2' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (pagination(); as p) {
          <div class="pagination-controls">
            <button
              class="btn btn-sm"
              [disabled]="p.page <= 1"
              (click)="goToPage(p.page - 1)"
            >
              ก่อนหน้า
            </button>
            <span class="page-info">
              หน้า {{ p.page }} / {{ p.totalPages }}
              (ทั้งหมด {{ p.total }} รายการ)
            </span>
            <button
              class="btn btn-sm"
              [disabled]="p.page >= p.totalPages"
              (click)="goToPage(p.page + 1)"
            >
              ถัดไป
            </button>
          </div>
        }
      }

      <!-- Empty State -->
      @if (!loading() && !error() && data().length === 0) {
        <div class="empty-state">
          <p>ไม่พบข้อมูลสต็อก</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .report-container { padding: 1.5rem; }
    h2 { margin-bottom: 1rem; font-size: 1.5rem; font-weight: 600; }
    .filter-form { margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; }
    .filter-fields { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .field { display: flex; flex-direction: column; gap: 0.25rem; }
    .field label { font-size: 0.875rem; font-weight: 500; color: #374151; }
    .field input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.875rem; }
    .filter-actions { display: flex; gap: 0.5rem; }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer; transition: background-color 0.2s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn-secondary:hover { background: #d1d5db; }
    .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; cursor: pointer; }
    .btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .summary-bar { display: flex; gap: 2rem; margin-bottom: 1rem; padding: 0.75rem 1rem; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe; }
    .summary-item { display: flex; gap: 0.5rem; align-items: center; }
    .summary-label { font-size: 0.875rem; color: #4b5563; }
    .summary-value { font-size: 0.875rem; font-weight: 600; color: #1e40af; }
    .loading-indicator { text-align: center; padding: 2rem; color: #6b7280; }
    .error-message { padding: 1rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #991b1b; text-align: center; }
    .error-message p { margin-bottom: 0.5rem; }
    .table-wrapper { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .report-table thead { background: #f9fafb; }
    .report-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    .report-table td { padding: 0.625rem 1rem; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
    .report-table tbody tr:hover { background: #f9fafb; }
    .text-right { text-align: right; }
    .pagination-controls { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; padding: 0.75rem; }
    .page-info { font-size: 0.875rem; color: #4b5563; }
    .empty-state { text-align: center; padding: 2rem; color: #6b7280; }
  `],
})
export class StockBalanceComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly fb = inject(FormBuilder);

  filterForm: FormGroup = this.fb.group({
    search: [''],
    itemId: [''],
    warehouseId: [''],
  });

  readonly data = signal<StockBalanceView[]>([]);
  readonly summary = signal<StockBalanceSummary | null>(null);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private currentPage = 1;
  private readonly pageSize = 20;

  ngOnInit(): void {
    this.loadData();
  }

  applyFilter(): void {
    this.currentPage = 1;
    this.loadData();
  }

  resetFilter(): void {
    this.filterForm.reset({ search: '', itemId: '', warehouseId: '' });
    this.currentPage = 1;
    this.loadData();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    const formValue = this.filterForm.value;
    const filter: StockBalanceFilter = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (formValue.search) filter.search = formValue.search;
    if (formValue.itemId) filter.itemId = formValue.itemId;
    if (formValue.warehouseId) filter.warehouseId = formValue.warehouseId;

    this.reportsApi
      .getStockBalance(filter)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.data.set(response.data);
          this.pagination.set(response.pagination);
          this.summary.set(response.summary);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'ไม่สามารถโหลดข้อมูลรายงานสต็อกได้ กรุณาลองใหม่อีกครั้ง');
        },
      });
  }
}

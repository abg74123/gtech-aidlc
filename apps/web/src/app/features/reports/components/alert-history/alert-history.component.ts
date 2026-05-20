import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  ReportsApiService,
  AlertHistoryFilter,
  AlertLog,
  PaginationMeta,
} from '../../services/reports-api.service';

const ALERT_CODE_OPTIONS = [
  { value: '', label: '-- ทั้งหมด --' },
  { value: 'STOCK_NEGATIVE', label: 'STOCK_NEGATIVE — สต็อกไม่เพียงพอ' },
  { value: 'CN_RETURN_INVENTORY', label: 'CN_RETURN_INVENTORY — CN_RETURN ห้ามมีรายการสต็อก' },
  { value: 'DUPLICATE_INVOICE', label: 'DUPLICATE_INVOICE — ใบแจ้งหนี้ซ้ำ' },
  { value: 'INVOICE_FROM_DO_STOCK', label: 'INVOICE_FROM_DO_STOCK — ห้ามมีรายการสต็อก/AR' },
  { value: 'PERIOD_LOCKED', label: 'PERIOD_LOCKED — งวดบัญชีถูกปิดแล้ว' },
] as const;

@Component({
  selector: 'app-alert-history',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <div class="alert-history">
      <h2>ประวัติการแจ้งเตือน (Alert History)</h2>

      <form [formGroup]="filterForm" (ngSubmit)="onSearch()" class="filter-form">
        <div class="filter-row">
          <div class="filter-field">
            <label for="alertCode">รหัสแจ้งเตือน</label>
            <select id="alertCode" formControlName="alertCode">
              @for (option of alertCodeOptions; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </div>

          <div class="filter-field">
            <label for="txType">ประเภท TX</label>
            <input id="txType" type="text" formControlName="txType" placeholder="เช่น SALE_INVOICE" />
          </div>

          <div class="filter-field">
            <label for="dateFrom">ตั้งแต่วันที่</label>
            <input id="dateFrom" type="date" formControlName="dateFrom" />
          </div>

          <div class="filter-field">
            <label for="dateTo">ถึงวันที่</label>
            <input id="dateTo" type="date" formControlName="dateTo" />
          </div>

          <div class="filter-actions">
            <button type="submit" class="btn-search">ค้นหา</button>
            <button type="button" class="btn-reset" (click)="onReset()">ล้างตัวกรอง</button>
          </div>
        </div>
      </form>

      @if (loading()) {
        <div class="loading-indicator"><p>กำลังโหลดข้อมูล...</p></div>
      }

      @if (errorMessage()) {
        <div class="error-message" role="alert">
          <p>{{ errorMessage() }}</p>
          <button type="button" (click)="onSearch()">ลองใหม่อีกครั้ง</button>
        </div>
      }

      @if (!loading() && !errorMessage()) {
        @if (alerts().length === 0) {
          <div class="empty-state"><p>ไม่พบข้อมูลการแจ้งเตือน</p></div>
        } @else {
          <div class="table-container">
            <table class="alert-table">
              <thead>
                <tr>
                  <th>วันที่/เวลา</th>
                  <th>รหัสแจ้งเตือน</th>
                  <th>ข้อความ</th>
                  <th>ประเภท TX</th>
                  <th>ผู้ใช้งาน</th>
                </tr>
              </thead>
              <tbody>
                @for (alert of alerts(); track alert.id) {
                  <tr>
                    <td>{{ alert.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td><span class="alert-code-badge">{{ alert.alertCode }}</span></td>
                    <td>{{ alert.alertMessage }}</td>
                    <td>{{ alert.txType }}</td>
                    <td>{{ alert.userId }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (pagination(); as p) {
            <div class="pagination-controls">
              <span class="pagination-info">
                แสดง {{ paginationStart() }}–{{ paginationEnd() }} จาก {{ p.total }} รายการ
              </span>
              <div class="pagination-buttons">
                <button type="button" [disabled]="p.page <= 1" (click)="goToPage(1)" aria-label="หน้าแรก">&laquo;</button>
                <button type="button" [disabled]="p.page <= 1" (click)="goToPage(p.page - 1)" aria-label="หน้าก่อนหน้า">&lsaquo;</button>
                <span class="page-indicator">หน้า {{ p.page }} / {{ p.totalPages }}</span>
                <button type="button" [disabled]="p.page >= p.totalPages" (click)="goToPage(p.page + 1)" aria-label="หน้าถัดไป">&rsaquo;</button>
                <button type="button" [disabled]="p.page >= p.totalPages" (click)="goToPage(p.totalPages)" aria-label="หน้าสุดท้าย">&raquo;</button>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
  styles: [`
    .alert-history { padding: 1.5rem; }
    h2 { margin-bottom: 1.5rem; font-size: 1.5rem; color: #1a1a1a; }
    .filter-form { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem 1.5rem; margin-bottom: 1.5rem; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
    .filter-field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 180px; }
    .filter-field label { font-size: 0.85rem; font-weight: 500; color: #555; }
    .filter-field select, .filter-field input { padding: 0.5rem 0.75rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; }
    .filter-actions { display: flex; gap: 0.5rem; align-items: flex-end; }
    .btn-search, .btn-reset { padding: 0.5rem 1rem; border: none; border-radius: 4px; font-size: 0.9rem; cursor: pointer; }
    .btn-search { background: #1976d2; color: white; }
    .btn-search:hover { background: #1565c0; }
    .btn-reset { background: #e0e0e0; color: #333; }
    .btn-reset:hover { background: #bdbdbd; }
    .loading-indicator { text-align: center; padding: 2rem; color: #666; }
    .error-message { background: #fdecea; border: 1px solid #f5c6cb; border-radius: 8px; padding: 1rem 1.5rem; color: #721c24; margin-bottom: 1rem; }
    .error-message button { margin-top: 0.5rem; padding: 0.4rem 0.8rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .empty-state { text-align: center; padding: 3rem; color: #999; font-size: 1.1rem; }
    .table-container { overflow-x: auto; }
    .alert-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .alert-table th, .alert-table td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
    .alert-table th { background: #f5f5f5; font-weight: 600; color: #333; white-space: nowrap; }
    .alert-table tbody tr:hover { background: #f9f9f9; }
    .alert-code-badge { display: inline-block; padding: 0.2rem 0.5rem; background: #fff3e0; border: 1px solid #ffcc80; border-radius: 4px; font-size: 0.8rem; font-weight: 500; color: #e65100; }
    .pagination-controls { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-top: 1px solid #e0e0e0; margin-top: 0.5rem; }
    .pagination-info { font-size: 0.85rem; color: #666; }
    .pagination-buttons { display: flex; align-items: center; gap: 0.25rem; }
    .pagination-buttons button { padding: 0.4rem 0.7rem; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer; font-size: 0.9rem; }
    .pagination-buttons button:hover:not(:disabled) { background: #e3f2fd; border-color: #1976d2; }
    .pagination-buttons button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-indicator { padding: 0 0.75rem; font-size: 0.85rem; color: #555; }
  `],
})
export class AlertHistoryComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);
  private readonly fb = inject(FormBuilder);

  readonly alertCodeOptions = ALERT_CODE_OPTIONS;

  filterForm!: FormGroup;
  readonly alerts = signal<AlertLog[]>([]);
  readonly pagination = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly paginationStart = computed(() => {
    const p = this.pagination();
    if (!p || p.total === 0) return 0;
    return (p.page - 1) * p.limit + 1;
  });

  readonly paginationEnd = computed(() => {
    const p = this.pagination();
    if (!p) return 0;
    return Math.min(p.page * p.limit, p.total);
  });

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      alertCode: [''],
      txType: [''],
      dateFrom: [''],
      dateTo: [''],
    });

    this.loadData();
  }

  onSearch(): void {
    this.loadData(1);
  }

  onReset(): void {
    this.filterForm.reset({
      alertCode: '',
      txType: '',
      dateFrom: '',
      dateTo: '',
    });
    this.loadData(1);
  }

  goToPage(page: number): void {
    this.loadData(page);
  }

  private loadData(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');

    const formValue = this.filterForm.getRawValue();
    const filter: AlertHistoryFilter = {
      page,
      limit: 20,
    };

    if (formValue.alertCode) filter.alertCode = formValue.alertCode;
    if (formValue.txType?.trim()) filter.txType = formValue.txType.trim();
    if (formValue.dateFrom) filter.dateFrom = formValue.dateFrom;
    if (formValue.dateTo) filter.dateTo = formValue.dateTo;

    this.reportsApi.getAlertHistory(filter).subscribe({
      next: (response) => {
        this.alerts.set(response.data);
        this.pagination.set(response.pagination);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่');
        } else if (err.status === 403) {
          this.errorMessage.set('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้');
        } else if (err.status === 0) {
          this.errorMessage.set('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } else {
          this.errorMessage.set('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
        }
      },
    });
  }
}

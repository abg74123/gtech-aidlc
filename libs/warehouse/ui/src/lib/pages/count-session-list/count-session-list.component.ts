import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import { CountSession, CountSessionStatus } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-count-session-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <h2>Stock Count Sessions</h2>
      <a mat-flat-button color="primary" routerLink="create" aria-label="Create new count session">
        <mat-icon>add</mat-icon>
        New Count Session
      </a>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Filter by Status</mat-label>
        <mat-select
          [(value)]="statusFilter"
          (selectionChange)="onStatusFilterChange()"
          aria-label="Filter sessions by status"
        >
          <mat-option value="">All</mat-option>
          @for (status of statuses; track status) {
            <mat-option [value]="status">{{ formatStatus(status) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading sessions">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table
          mat-table
          [dataSource]="dataSource"
          class="mat-elevation-z2"
          aria-label="Stock count sessions table"
        >
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let session">
              <span class="status-chip" [attr.data-status]="session.status">
                {{ formatStatus(session.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="warehouseId">
            <th mat-header-cell *matHeaderCellDef>Warehouse</th>
            <td mat-cell *matCellDef="let session">{{ session.warehouseId | slice:0:8 }}...</td>
          </ng-container>

          <ng-container matColumnDef="initiatedAt">
            <th mat-header-cell *matHeaderCellDef>Initiated</th>
            <td mat-cell *matCellDef="let session">{{ session.initiatedAt | date:'short' }}</td>
          </ng-container>

          <ng-container matColumnDef="lineCount">
            <th mat-header-cell *matHeaderCellDef>Items</th>
            <td mat-cell *matCellDef="let session">{{ session.lines?.length || 0 }}</td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let session">
              <a
                mat-icon-button
                [routerLink]="[session.id]"
                [attr.aria-label]="'View session ' + session.id"
              >
                <mat-icon>visibility</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              No count sessions found.
            </td>
          </tr>
        </table>

        <mat-paginator
          [length]="totalItems"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          [pageIndex]="currentPage"
          (page)="onPageChange($event)"
          aria-label="Select page of count sessions"
          showFirstLastButtons
        ></mat-paginator>
      </div>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .page-header h2 {
      margin: 0;
    }

    .filters {
      margin-bottom: 16px;
    }

    .filters mat-form-field {
      min-width: 200px;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .status-chip {
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-chip[data-status="INITIATED"] {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-chip[data-status="COUNTING"] {
      background-color: #fff3e0;
      color: #e65100;
    }

    .status-chip[data-status="PENDING_APPROVAL"] {
      background-color: #fce4ec;
      color: #c62828;
    }

    .status-chip[data-status="APPROVED"] {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-chip[data-status="COMPLETED"] {
      background-color: #f3e5f5;
      color: #6a1b9a;
    }

    .no-data {
      text-align: center;
      padding: 24px;
      color: rgba(0, 0, 0, 0.54);
    }
  `],
})
export class CountSessionListComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);

  displayedColumns = ['status', 'warehouseId', 'initiatedAt', 'lineCount', 'actions'];
  dataSource = new MatTableDataSource<CountSession>([]);
  statuses = Object.values(CountSessionStatus);

  statusFilter = '';
  loading = false;
  totalItems = 0;
  pageSize = 20;
  currentPage = 0;

  ngOnInit(): void {
    this.loadSessions();
  }

  onStatusFilterChange(): void {
    this.currentPage = 0;
    this.loadSessions();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadSessions();
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  private loadSessions(): void {
    this.loading = true;
    this.api
      .getCountSessions({
        status: this.statusFilter || undefined,
        page: this.currentPage + 1,
        limit: this.pageSize,
      })
      .subscribe({
        next: (response) => {
          this.dataSource.data = response.data;
          this.totalItems = response.pagination.total;
          this.loading = false;
        },
        error: () => {
          this.dataSource.data = [];
          this.totalItems = 0;
          this.loading = false;
        },
      });
  }
}

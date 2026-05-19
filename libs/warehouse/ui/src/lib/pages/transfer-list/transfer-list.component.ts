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
import { TransferOrder, WarehouseData } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-transfer-list',
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
      <h2>Stock Transfers</h2>
      <a mat-flat-button color="primary" routerLink="create" aria-label="Create new transfer">
        <mat-icon>add</mat-icon>
        New Transfer
      </a>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Source Warehouse</mat-label>
        <mat-select
          [(value)]="sourceFilter"
          (selectionChange)="onFilterChange()"
          aria-label="Filter by source warehouse"
        >
          <mat-option value="">All</mat-option>
          @for (wh of warehouses; track wh.id) {
            <mat-option [value]="wh.id">{{ wh.code }} — {{ wh.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Destination Warehouse</mat-label>
        <mat-select
          [(value)]="destFilter"
          (selectionChange)="onFilterChange()"
          aria-label="Filter by destination warehouse"
        >
          <mat-option value="">All</mat-option>
          @for (wh of warehouses; track wh.id) {
            <mat-option [value]="wh.id">{{ wh.code }} — {{ wh.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading transfers">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table
          mat-table
          [dataSource]="dataSource"
          class="mat-elevation-z2"
          aria-label="Stock transfers table"
        >
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let transfer">
              <span class="status-chip" [attr.data-status]="transfer.status">
                {{ transfer.status }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="sourceWarehouseId">
            <th mat-header-cell *matHeaderCellDef>Source</th>
            <td mat-cell *matCellDef="let transfer">
              {{ getWarehouseName(transfer.sourceWarehouseId) }}
            </td>
          </ng-container>

          <ng-container matColumnDef="destWarehouseId">
            <th mat-header-cell *matHeaderCellDef>Destination</th>
            <td mat-cell *matCellDef="let transfer">
              {{ getWarehouseName(transfer.destWarehouseId) }}
            </td>
          </ng-container>

          <ng-container matColumnDef="lineCount">
            <th mat-header-cell *matHeaderCellDef>Items</th>
            <td mat-cell *matCellDef="let transfer">{{ transfer.lines?.length || 0 }}</td>
          </ng-container>

          <ng-container matColumnDef="postedAt">
            <th mat-header-cell *matHeaderCellDef>Posted</th>
            <td mat-cell *matCellDef="let transfer">
              {{ transfer.postedAt ? (transfer.postedAt | date:'short') : '—' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let transfer">
              <a
                mat-icon-button
                [routerLink]="[transfer.id]"
                [attr.aria-label]="'View transfer ' + transfer.id"
              >
                <mat-icon>visibility</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              No transfers found.
            </td>
          </tr>
        </table>

        <mat-paginator
          [length]="totalItems"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          [pageIndex]="currentPage"
          (page)="onPageChange($event)"
          aria-label="Select page of transfers"
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
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
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

    .status-chip[data-status="DRAFT"] {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-chip[data-status="POSTED"] {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .no-data {
      text-align: center;
      padding: 24px;
      color: rgba(0, 0, 0, 0.54);
    }
  `],
})
export class TransferListComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);

  displayedColumns = ['status', 'sourceWarehouseId', 'destWarehouseId', 'lineCount', 'postedAt', 'actions'];
  dataSource = new MatTableDataSource<TransferOrder>([]);
  warehouses: WarehouseData[] = [];
  private warehouseMap = new Map<string, WarehouseData>();

  sourceFilter = '';
  destFilter = '';
  loading = false;
  totalItems = 0;
  pageSize = 20;
  currentPage = 0;

  ngOnInit(): void {
    this.loadWarehouses();
    this.loadTransfers();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadTransfers();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadTransfers();
  }

  getWarehouseName(id: string): string {
    const wh = this.warehouseMap.get(id);
    return wh ? `${wh.code} — ${wh.name}` : id.slice(0, 8) + '...';
  }

  private loadWarehouses(): void {
    this.api.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        this.warehouseMap = new Map(data.map((wh) => [wh.id, wh]));
      },
      error: () => {
        this.warehouses = [];
      },
    });
  }

  private loadTransfers(): void {
    this.loading = true;
    this.api
      .getTransfers({
        sourceWarehouseId: this.sourceFilter || undefined,
        destWarehouseId: this.destFilter || undefined,
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

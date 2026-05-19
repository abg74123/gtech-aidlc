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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import { WriteOffRequest, WriteOffStatus, WarehouseData } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-write-off-list',
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
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-header">
      <h2>Stock Write-offs</h2>
      <a mat-flat-button color="primary" routerLink="create" aria-label="Create new write-off request">
        <mat-icon>add</mat-icon>
        New Write-off
      </a>
    </div>

    <div class="filters">
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select
          [(value)]="statusFilter"
          (selectionChange)="onFilterChange()"
          aria-label="Filter by status"
        >
          <mat-option value="">All</mat-option>
          @for (status of statuses; track status) {
            <mat-option [value]="status">{{ status }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Warehouse</mat-label>
        <mat-select
          [(value)]="warehouseFilter"
          (selectionChange)="onFilterChange()"
          aria-label="Filter by warehouse"
        >
          <mat-option value="">All</mat-option>
          @for (wh of warehouses; track wh.id) {
            <mat-option [value]="wh.id">{{ wh.code }} — {{ wh.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading write-offs">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else {
      <div class="table-container">
        <table
          mat-table
          [dataSource]="dataSource"
          class="mat-elevation-z2"
          aria-label="Stock write-offs table"
        >
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let writeOff">
              <span class="status-chip" [attr.data-status]="writeOff.status">
                {{ writeOff.status }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="warehouseId">
            <th mat-header-cell *matHeaderCellDef>Warehouse</th>
            <td mat-cell *matCellDef="let writeOff">
              {{ getWarehouseName(writeOff.warehouseId) }}
            </td>
          </ng-container>

          <ng-container matColumnDef="itemId">
            <th mat-header-cell *matHeaderCellDef>Item</th>
            <td mat-cell *matCellDef="let writeOff">
              {{ getItemName(writeOff.itemId) }}
            </td>
          </ng-container>

          <ng-container matColumnDef="qty">
            <th mat-header-cell *matHeaderCellDef>Quantity</th>
            <td mat-cell *matCellDef="let writeOff">{{ writeOff.qty }}</td>
          </ng-container>

          <ng-container matColumnDef="totalLoss">
            <th mat-header-cell *matHeaderCellDef>Total Loss</th>
            <td mat-cell *matCellDef="let writeOff">{{ writeOff.totalLoss | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="createdAt">
            <th mat-header-cell *matHeaderCellDef>Created</th>
            <td mat-cell *matCellDef="let writeOff">
              {{ writeOff.createdAt | date:'short' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let writeOff">
              <a
                mat-icon-button
                [routerLink]="[writeOff.id]"
                [attr.aria-label]="'View write-off ' + writeOff.id"
              >
                <mat-icon>visibility</mat-icon>
              </a>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              No write-off requests found.
            </td>
          </tr>
        </table>

        <mat-paginator
          [length]="totalItems"
          [pageSize]="pageSize"
          [pageSizeOptions]="[10, 20, 50]"
          [pageIndex]="currentPage"
          (page)="onPageChange($event)"
          aria-label="Select page of write-offs"
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

    .status-chip[data-status="PENDING_APPROVAL"] {
      background-color: #fff3e0;
      color: #e65100;
    }

    .status-chip[data-status="APPROVED"] {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-chip[data-status="POSTED"] {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    .status-chip[data-status="REJECTED"] {
      background-color: #fce4ec;
      color: #c62828;
    }

    .no-data {
      text-align: center;
      padding: 24px;
      color: rgba(0, 0, 0, 0.54);
    }
  `],
})
export class WriteOffListComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);

  displayedColumns = ['status', 'warehouseId', 'itemId', 'qty', 'totalLoss', 'createdAt', 'actions'];
  dataSource = new MatTableDataSource<WriteOffRequest>([]);
  warehouses: WarehouseData[] = [];
  private warehouseMap = new Map<string, WarehouseData>();
  private itemMap = new Map<string, { id: string; name: string; sku: string }>();

  statuses = Object.values(WriteOffStatus);
  statusFilter = '';
  warehouseFilter = '';
  loading = false;
  totalItems = 0;
  pageSize = 20;
  currentPage = 0;

  ngOnInit(): void {
    this.loadMasterData();
    this.loadWriteOffs();
  }

  onFilterChange(): void {
    this.currentPage = 0;
    this.loadWriteOffs();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadWriteOffs();
  }

  getWarehouseName(id: string): string {
    const wh = this.warehouseMap.get(id);
    return wh ? `${wh.code} — ${wh.name}` : id.slice(0, 8) + '...';
  }

  getItemName(id: string): string {
    const item = this.itemMap.get(id);
    return item ? `${item.sku} — ${item.name}` : id.slice(0, 8) + '...';
  }

  private loadMasterData(): void {
    this.api.getWarehouses().subscribe({
      next: (data) => {
        this.warehouses = data;
        this.warehouseMap = new Map(data.map((wh) => [wh.id, wh]));
      },
      error: () => {
        this.warehouses = [];
      },
    });

    this.api.getItems().subscribe({
      next: (data) => {
        this.itemMap = new Map(data.map((item) => [item.id, item]));
      },
      error: () => {
        // Silently handle master data load failure
      },
    });
  }

  private loadWriteOffs(): void {
    this.loading = true;
    this.api
      .getWriteOffs({
        status: this.statusFilter || undefined,
        warehouseId: this.warehouseFilter || undefined,
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

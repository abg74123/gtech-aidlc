import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import {
  TransferOrder,
  TransferLine,
  WarehouseData,
  ItemData,
} from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-transfer-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
  ],
  template: `
    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading transfer details">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (transfer) {
      <div class="page-header">
        <div>
          <h2>Transfer Detail</h2>
          <span class="status-chip" [attr.data-status]="transfer.status">
            {{ transfer.status }}
          </span>
        </div>
        <a mat-button routerLink="/warehouse/transfers" aria-label="Back to transfer list">
          <mat-icon>arrow_back</mat-icon>
          Back to List
        </a>
      </div>

      <mat-card class="transfer-info">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Transfer ID</span>
              <span class="info-value">{{ transfer.id | slice:0:8 }}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Source Warehouse</span>
              <span class="info-value">{{ getWarehouseName(transfer.sourceWarehouseId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Destination Warehouse</span>
              <span class="info-value">{{ getWarehouseName(transfer.destWarehouseId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Posted At</span>
              <span class="info-value">{{ transfer.postedAt ? (transfer.postedAt | date:'medium') : '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">{{ transfer.createdAt | date:'medium' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Notes</span>
              <span class="info-value">{{ transfer.notes || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <h3>Transfer Lines</h3>

      <div class="table-container">
        <table
          mat-table
          [dataSource]="linesDataSource"
          class="mat-elevation-z2"
          aria-label="Transfer lines table"
        >
          <ng-container matColumnDef="itemId">
            <th mat-header-cell *matHeaderCellDef>Item</th>
            <td mat-cell *matCellDef="let line">{{ getItemName(line.itemId) }}</td>
          </ng-container>

          <ng-container matColumnDef="qty">
            <th mat-header-cell *matHeaderCellDef>Quantity</th>
            <td mat-cell *matCellDef="let line">{{ line.qty }}</td>
          </ng-container>

          <ng-container matColumnDef="unitCost">
            <th mat-header-cell *matHeaderCellDef>Unit Cost (MA)</th>
            <td mat-cell *matCellDef="let line">{{ line.unitCost | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="totalValue">
            <th mat-header-cell *matHeaderCellDef>Total Value</th>
            <td mat-cell *matCellDef="let line">{{ line.qty * line.unitCost | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="txId">
            <th mat-header-cell *matHeaderCellDef>TX ID</th>
            <td mat-cell *matCellDef="let line">
              {{ line.txId ? (line.txId | slice:0:8) + '...' : '—' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data" [attr.colspan]="displayedColumns.length">
              No transfer lines.
            </td>
          </tr>
        </table>
      </div>

      <mat-divider class="summary-divider"></mat-divider>

      <div class="summary">
        <span class="summary-label">Total Items: {{ transfer.lines.length }}</span>
        <span class="summary-label">Total Value: {{ totalValue | number:'1.2-2' }} THB</span>
      </div>
    } @else {
      <p>Transfer not found.</p>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .page-header h2 {
      margin: 0 0 8px 0;
    }

    .transfer-info {
      margin-bottom: 24px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 14px;
      font-weight: 500;
    }

    h3 {
      margin: 0 0 16px 0;
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

    .summary-divider {
      margin: 24px 0;
    }

    .summary {
      display: flex;
      gap: 24px;
      justify-content: flex-end;
    }

    .summary-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }
  `],
})
export class TransferDetailComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly route = inject(ActivatedRoute);

  transfer: TransferOrder | null = null;
  linesDataSource = new MatTableDataSource<TransferLine>([]);
  displayedColumns = ['itemId', 'qty', 'unitCost', 'totalValue', 'txId'];
  loading = true;

  private warehouseMap = new Map<string, WarehouseData>();
  private itemMap = new Map<string, ItemData>();

  get totalValue(): number {
    if (!this.transfer?.lines) return 0;
    return this.transfer.lines.reduce(
      (sum, line) => sum + line.qty * line.unitCost,
      0
    );
  }

  ngOnInit(): void {
    this.loadMasterData();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTransfer(id);
    } else {
      this.loading = false;
    }
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
        this.warehouseMap = new Map(data.map((wh) => [wh.id, wh]));
      },
      error: () => {
        // Silently handle master data load failure
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

  private loadTransfer(id: string): void {
    this.loading = true;
    this.api.getTransfer(id).subscribe({
      next: (transfer) => {
        this.transfer = transfer;
        this.linesDataSource.data = transfer.lines || [];
        this.loading = false;
      },
      error: () => {
        this.transfer = null;
        this.loading = false;
      },
    });
  }
}

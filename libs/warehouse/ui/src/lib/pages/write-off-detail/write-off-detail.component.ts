import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import {
  WriteOffRequest,
  WriteOffEvidence,
  WriteOffStatus,
  WarehouseData,
  ItemData,
} from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-write-off-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading write-off details">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (writeOff) {
      <div class="page-header">
        <div>
          <h2>Write-off Detail</h2>
          <span class="status-chip" [attr.data-status]="writeOff.status">
            {{ writeOff.status }}
          </span>
        </div>
        <div class="header-actions">
          @if (canApprove) {
            <button
              mat-flat-button
              color="primary"
              (click)="onApprove()"
              [disabled]="approving"
              aria-label="Approve write-off request"
            >
              @if (approving) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>check_circle</mat-icon>
                  Approve & Post
                </ng-container>
              }
            </button>
          }
          <a mat-button routerLink="/warehouse/write-offs" aria-label="Back to write-off list">
            <mat-icon>arrow_back</mat-icon>
            Back to List
          </a>
        </div>
      </div>

      <mat-card class="write-off-info">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Write-off ID</span>
              <span class="info-value">{{ writeOff.id | slice:0:8 }}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Warehouse</span>
              <span class="info-value">{{ getWarehouseName(writeOff.warehouseId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Item</span>
              <span class="info-value">{{ getItemName(writeOff.itemId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Quantity</span>
              <span class="info-value">{{ writeOff.qty }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Unit Cost (MA)</span>
              <span class="info-value">{{ writeOff.unitCost | number:'1.2-2' }} THB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Total Loss</span>
              <span class="info-value loss">{{ writeOff.totalLoss | number:'1.2-2' }} THB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Salvage Value</span>
              <span class="info-value">{{ writeOff.salvageValue | number:'1.2-2' }} THB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Net Loss</span>
              <span class="info-value loss">{{ writeOff.totalLoss - writeOff.salvageValue | number:'1.2-2' }} THB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Reason</span>
              <span class="info-value">{{ writeOff.reason }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Requested By</span>
              <span class="info-value">{{ writeOff.requestedBy | slice:0:8 }}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Created</span>
              <span class="info-value">{{ writeOff.createdAt | date:'medium' }}</span>
            </div>
            @if (writeOff.approvedBy) {
              <div class="info-item">
                <span class="info-label">Approved By</span>
                <span class="info-value">{{ writeOff.approvedBy | slice:0:8 }}...</span>
              </div>
            }
            @if (writeOff.approvedAt) {
              <div class="info-item">
                <span class="info-label">Approved At</span>
                <span class="info-value">{{ writeOff.approvedAt | date:'medium' }}</span>
              </div>
            }
            @if (writeOff.txId) {
              <div class="info-item">
                <span class="info-label">TX ID</span>
                <span class="info-value">{{ writeOff.txId | slice:0:8 }}...</span>
              </div>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <mat-divider></mat-divider>

      <h3>Evidence ({{ writeOff.evidence.length }} file{{ writeOff.evidence.length === 1 ? '' : 's' }})</h3>

      @if (writeOff.evidence && writeOff.evidence.length > 0) {
        <div class="evidence-gallery" role="list" aria-label="Evidence files">
          @for (evidence of writeOff.evidence; track evidence.id) {
            <div class="evidence-item" role="listitem">
              <div class="evidence-icon">
                @if (isImage(evidence.mimeType)) {
                  <mat-icon>image</mat-icon>
                } @else {
                  <mat-icon>description</mat-icon>
                }
              </div>
              <div class="evidence-info">
                <span class="evidence-name">{{ evidence.fileName }}</span>
                <span class="evidence-meta">
                  {{ formatFileSize(evidence.fileSize) }} · {{ evidence.mimeType }}
                </span>
                <span class="evidence-meta">
                  Uploaded {{ evidence.uploadedAt | date:'short' }}
                </span>
              </div>
              <a
                mat-icon-button
                [href]="getDownloadUrl(evidence)"
                target="_blank"
                [attr.aria-label]="'Download ' + evidence.fileName"
              >
                <mat-icon>download</mat-icon>
              </a>
            </div>
          }
        </div>
      } @else {
        <p class="no-evidence">No evidence files uploaded yet.</p>
      }

      @if (writeOff.status === 'PENDING_APPROVAL' && !canApprove) {
        <div class="approval-notice" role="alert">
          <mat-icon>info</mat-icon>
          <span>This write-off is pending CFO approval. Only users with CFO role can approve.</span>
        </div>
      }
    } @else {
      <p>Write-off request not found.</p>
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .page-header h2 {
      margin: 0 0 8px 0;
    }

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .write-off-info {
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

    .info-value.loss {
      color: #c62828;
    }

    h3 {
      margin: 24px 0 16px 0;
    }

    .evidence-gallery {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .evidence-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
      transition: background-color 0.2s;
    }

    .evidence-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .evidence-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background-color: #e3f2fd;
    }

    .evidence-icon mat-icon {
      color: #1565c0;
    }

    .evidence-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .evidence-name {
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .evidence-meta {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }

    .no-evidence {
      color: rgba(0, 0, 0, 0.54);
      font-style: italic;
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

    .approval-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background-color: #fff3e0;
      border-radius: 8px;
      margin-top: 24px;
      font-size: 14px;
      color: #e65100;
    }

    .approval-notice mat-icon {
      color: #e65100;
    }
  `],
})
export class WriteOffDetailComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  writeOff: WriteOffRequest | null = null;
  loading = true;
  approving = false;

  private warehouseMap = new Map<string, WarehouseData>();
  private itemMap = new Map<string, ItemData>();

  /**
   * CFO role check — in a real app this would come from an auth service.
   * For now, we expose it as a property that can be set based on user role.
   * The approve button is only visible when the user has CFO role AND
   * the write-off is in PENDING_APPROVAL status.
   */
  get canApprove(): boolean {
    return (
      this.writeOff?.status === WriteOffStatus.PENDING_APPROVAL &&
      this.isCfoRole
    );
  }

  /**
   * This would normally be injected from an AuthService.
   * For the UI implementation, we default to true to show the button.
   * The backend enforces the actual role check.
   */
  isCfoRole = true;

  ngOnInit(): void {
    this.loadMasterData();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadWriteOff(id);
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

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  getDownloadUrl(evidence: WriteOffEvidence): string {
    return `/api/v1/warehouse/write-offs/evidence/${evidence.id}/download`;
  }

  onApprove(): void {
    if (!this.writeOff || this.approving) return;

    this.approving = true;
    this.api.approveWriteOff(this.writeOff.id).subscribe({
      next: (updated) => {
        this.writeOff = updated;
        this.approving = false;
        this.snackBar.open('Write-off approved and posted successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.approving = false;
        const message = err.error?.message || 'Failed to approve write-off';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
    });
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

  private loadWriteOff(id: string): void {
    this.loading = true;
    this.api.getWriteOff(id).subscribe({
      next: (writeOff) => {
        this.writeOff = writeOff;
        this.loading = false;
      },
      error: () => {
        this.writeOff = null;
        this.loading = false;
      },
    });
  }
}

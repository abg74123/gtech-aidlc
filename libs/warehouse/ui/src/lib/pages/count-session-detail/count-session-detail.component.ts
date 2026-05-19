import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import {
  CountSession,
  CountLine,
  CountSessionStatus,
} from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-count-session-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
  ],
  template: `
    @if (loading) {
      <div class="loading-container" role="status" aria-label="Loading session details">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (session) {
      <div class="page-header">
        <div>
          <h2>Count Session Detail</h2>
          <span class="status-chip" [attr.data-status]="session.status">
            {{ formatStatus(session.status) }}
          </span>
        </div>
        <a mat-button routerLink="/warehouse/count" aria-label="Back to session list">
          <mat-icon>arrow_back</mat-icon>
          Back to List
        </a>
      </div>

      <mat-card class="session-info">
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Session ID</span>
              <span class="info-value">{{ session.id | slice:0:8 }}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Warehouse</span>
              <span class="info-value">{{ session.warehouseId | slice:0:8 }}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">Initiated</span>
              <span class="info-value">{{ session.initiatedAt | date:'medium' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Notes</span>
              <span class="info-value">{{ session.notes || '—' }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <h3>Count Lines</h3>

      <div class="table-container">
        <table
          mat-table
          [dataSource]="linesDataSource"
          class="mat-elevation-z2"
          aria-label="Count session lines"
        >
          <ng-container matColumnDef="itemId">
            <th mat-header-cell *matHeaderCellDef>Item</th>
            <td mat-cell *matCellDef="let line">{{ line.itemId | slice:0:8 }}...</td>
          </ng-container>

          <ng-container matColumnDef="systemQty">
            <th mat-header-cell *matHeaderCellDef>System Qty</th>
            <td mat-cell *matCellDef="let line">{{ line.systemQty }}</td>
          </ng-container>

          <ng-container matColumnDef="physicalQty">
            <th mat-header-cell *matHeaderCellDef>Physical Qty</th>
            <td mat-cell *matCellDef="let line">
              @if (isEditable) {
                <mat-form-field appearance="outline" class="qty-field">
                  <input
                    matInput
                    type="number"
                    [ngModel]="line.physicalQty"
                    (ngModelChange)="onPhysicalQtyChange(line, $event)"
                    [attr.aria-label]="'Physical quantity for item ' + line.itemId"
                    min="0"
                    step="0.01"
                  />
                </mat-form-field>
              } @else {
                {{ line.physicalQty ?? '—' }}
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="difference">
            <th mat-header-cell *matHeaderCellDef>Difference</th>
            <td mat-cell *matCellDef="let line">
              @if (line.difference !== null && line.difference !== undefined) {
                <span
                  [class.positive]="line.difference > 0"
                  [class.negative]="line.difference < 0"
                  class="difference-value"
                >
                  {{ line.difference > 0 ? '+' : '' }}{{ line.difference }}
                </span>
              } @else {
                —
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="reasonCode">
            <th mat-header-cell *matHeaderCellDef>Reason</th>
            <td mat-cell *matCellDef="let line">
              @if (isEditable && line.difference !== null && line.difference !== 0) {
                <mat-form-field appearance="outline" class="reason-field">
                  <input
                    matInput
                    [ngModel]="line.reasonCode"
                    (ngModelChange)="onReasonChange(line, $event)"
                    placeholder="Reason code"
                    [attr.aria-label]="'Reason code for item ' + line.itemId"
                  />
                </mat-form-field>
              } @else {
                {{ line.reasonCode || '—' }}
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Save</th>
            <td mat-cell *matCellDef="let line">
              @if (isEditable) {
                <button
                  mat-icon-button
                  color="primary"
                  (click)="saveLineCount(line)"
                  [disabled]="line.physicalQty === null || line.physicalQty === undefined"
                  [attr.aria-label]="'Save count for item ' + line.itemId"
                >
                  <mat-icon>save</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </div>

      <mat-divider class="action-divider"></mat-divider>

      <div class="session-actions">
        @if (session.status === 'COUNTING') {
          <button
            mat-flat-button
            color="accent"
            (click)="submitForApproval()"
            [disabled]="actionLoading || !allLinesCounted"
            aria-label="Submit session for approval"
          >
            @if (actionLoading) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Submit for Approval
            }
          </button>
        }
        @if (session.status === 'PENDING_APPROVAL') {
          <button
            mat-flat-button
            color="primary"
            (click)="approveSession()"
            [disabled]="actionLoading"
            aria-label="Approve count session and post adjustments"
          >
            @if (actionLoading) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              Approve & Post Adjustments
            }
          </button>
        }
      </div>
    } @else {
      <p>Session not found.</p>
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

    .session-info {
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

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
    }

    .qty-field {
      width: 100px;
    }

    .reason-field {
      width: 150px;
    }

    .difference-value {
      font-weight: 500;
    }

    .positive {
      color: #2e7d32;
    }

    .negative {
      color: #c62828;
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

    .action-divider {
      margin: 24px 0;
    }

    .session-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
  `],
})
export class CountSessionDetailComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  session: CountSession | null = null;
  linesDataSource = new MatTableDataSource<CountLine>([]);
  displayedColumns = ['itemId', 'systemQty', 'physicalQty', 'difference', 'reasonCode', 'actions'];
  loading = true;
  actionLoading = false;

  /** Tracks local edits before saving */
  private lineEdits = new Map<string, { physicalQty: number | null; reasonCode: string | null }>();

  get isEditable(): boolean {
    return this.session?.status === CountSessionStatus.COUNTING;
  }

  get allLinesCounted(): boolean {
    if (!this.session) return false;
    return this.session.lines.every(
      (line) => line.physicalQty !== null && line.physicalQty !== undefined
    );
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSession(id);
    } else {
      this.loading = false;
    }
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  onPhysicalQtyChange(line: CountLine, value: number | null): void {
    const edit = this.lineEdits.get(line.id) || { physicalQty: null, reasonCode: null };
    edit.physicalQty = value;
    this.lineEdits.set(line.id, edit);
  }

  onReasonChange(line: CountLine, value: string): void {
    const edit = this.lineEdits.get(line.id) || { physicalQty: null, reasonCode: null };
    edit.reasonCode = value;
    this.lineEdits.set(line.id, edit);
  }

  saveLineCount(line: CountLine): void {
    if (!this.session) return;

    const edit = this.lineEdits.get(line.id);
    const physicalQty = edit?.physicalQty ?? line.physicalQty;

    if (physicalQty === null || physicalQty === undefined) return;

    this.api
      .recordCountResult(this.session.id, line.id, {
        physicalQty,
        reasonCode: edit?.reasonCode || undefined,
      })
      .subscribe({
        next: (updatedLine) => {
          // Update the line in the session
          if (!this.session) return;
          const idx = this.session.lines.findIndex((l) => l.id === line.id);
          if (idx >= 0) {
            this.session.lines[idx] = updatedLine;
            this.linesDataSource.data = [...this.session.lines];
          }
          this.lineEdits.delete(line.id);
          this.snackBar.open('Count saved', 'Close', { duration: 2000 });
        },
        error: (err) => {
          const message = err.error?.message || 'Failed to save count';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        },
      });
  }

  submitForApproval(): void {
    if (!this.session) return;

    this.actionLoading = true;
    this.api.submitCountSession(this.session.id).subscribe({
      next: (updated) => {
        this.session = updated;
        this.linesDataSource.data = updated.lines;
        this.actionLoading = false;
        this.snackBar.open('Session submitted for approval', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.actionLoading = false;
        const message = err.error?.message || 'Failed to submit session';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
    });
  }

  approveSession(): void {
    if (!this.session) return;

    const sessionId = this.session.id;
    this.actionLoading = true;
    this.api.approveCountSession(sessionId).subscribe({
      next: () => {
        // Reload session to get updated status
        this.loadSession(sessionId);
        this.actionLoading = false;
        this.snackBar.open('Session approved — adjustments posted', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.actionLoading = false;
        const message = err.error?.message || 'Failed to approve session';
        this.snackBar.open(message, 'Close', { duration: 5000 });
      },
    });
  }

  private loadSession(id: string): void {
    this.loading = true;
    this.api.getCountSession(id).subscribe({
      next: (session) => {
        this.session = session;
        this.linesDataSource.data = session.lines;
        this.loading = false;
      },
      error: () => {
        this.session = null;
        this.loading = false;
      },
    });
  }
}

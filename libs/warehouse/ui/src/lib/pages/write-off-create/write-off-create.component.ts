import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import { ItemData, WarehouseData, WriteOffEvidence } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-write-off-create',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatListModule,
  ],
  template: `
    <div class="page-header">
      <h2>Create Write-off Request</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="create-form">
      <div class="form-row">
        <mat-form-field appearance="outline" class="picker-field">
          <mat-label>Warehouse</mat-label>
          <mat-select
            formControlName="warehouseId"
            aria-label="Select warehouse"
          >
            @for (warehouse of warehouses; track warehouse.id) {
              <mat-option [value]="warehouse.id">
                {{ warehouse.code }} — {{ warehouse.name }}
              </mat-option>
            }
          </mat-select>
          @if (form.get('warehouseId')?.hasError('required') && form.get('warehouseId')?.touched) {
            <mat-error>Warehouse is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="picker-field">
          <mat-label>Item</mat-label>
          <mat-select
            formControlName="itemId"
            aria-label="Select item to write off"
          >
            @for (item of items; track item.id) {
              <mat-option [value]="item.id">
                {{ item.sku }} — {{ item.name }}
              </mat-option>
            }
          </mat-select>
          @if (form.get('itemId')?.hasError('required') && form.get('itemId')?.touched) {
            <mat-error>Item is required</mat-error>
          }
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline" class="qty-field">
          <mat-label>Quantity</mat-label>
          <input
            matInput
            type="number"
            formControlName="qty"
            min="0.01"
            step="0.01"
            aria-label="Quantity to write off"
          />
          @if (form.get('qty')?.hasError('required') && form.get('qty')?.touched) {
            <mat-error>Quantity is required</mat-error>
          }
          @if (form.get('qty')?.hasError('min') && form.get('qty')?.touched) {
            <mat-error>Must be greater than 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="qty-field">
          <mat-label>Salvage Value (optional)</mat-label>
          <input
            matInput
            type="number"
            formControlName="salvageValue"
            min="0"
            step="0.01"
            aria-label="Salvage value in THB"
          />
          @if (form.get('salvageValue')?.hasError('min') && form.get('salvageValue')?.touched) {
            <mat-error>Cannot be negative</mat-error>
          }
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Reason</mat-label>
        <textarea
          matInput
          formControlName="reason"
          rows="3"
          aria-label="Reason for write-off"
        ></textarea>
        @if (form.get('reason')?.hasError('required') && form.get('reason')?.touched) {
          <mat-error>Reason is required</mat-error>
        }
      </mat-form-field>

      <mat-divider></mat-divider>

      <h3>Evidence Files</h3>
      <p class="hint-text">Upload supporting evidence (photos, documents). At least one file is required for approval.</p>

      <div class="file-upload-area">
        <input
          #fileInput
          type="file"
          multiple
          (change)="onFilesSelected($event)"
          class="file-input"
          accept="image/*,.pdf,.doc,.docx"
          aria-label="Select evidence files to upload"
          id="evidence-file-input"
        />
        <label for="evidence-file-input" class="file-upload-label">
          <mat-icon>cloud_upload</mat-icon>
          <span>Click to select files or drag and drop</span>
          <span class="file-hint">Images, PDF, DOC (max 10MB each)</span>
        </label>
      </div>

      @if (selectedFiles.length > 0) {
        <div class="selected-files" role="list" aria-label="Selected files">
          @for (file of selectedFiles; track $index; let i = $index) {
            <div class="file-item" role="listitem">
              <mat-icon class="file-icon">description</mat-icon>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <button
                mat-icon-button
                type="button"
                (click)="removeFile(i)"
                [attr.aria-label]="'Remove file ' + file.name"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
        </div>
      }

      @if (uploadedEvidence.length > 0) {
        <div class="uploaded-files" role="list" aria-label="Uploaded evidence files">
          @for (evidence of uploadedEvidence; track evidence.id) {
            <div class="file-item uploaded" role="listitem">
              <mat-icon class="file-icon success">check_circle</mat-icon>
              <span class="file-name">{{ evidence.fileName }}</span>
              <span class="file-size">{{ formatFileSize(evidence.fileSize) }}</span>
            </div>
          }
        </div>
      }

      <div class="form-actions">
        <a mat-button routerLink="/warehouse/write-offs" aria-label="Cancel and go back to list">
          Cancel
        </a>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting"
          aria-label="Submit write-off request"
        >
          @if (submitting) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Create Write-off Request
          }
        </button>
      </div>
    </form>
  `,
  styles: [`
    .page-header {
      margin-bottom: 24px;
    }

    .page-header h2 {
      margin: 0;
    }

    .create-form {
      max-width: 700px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .picker-field {
      flex: 1;
      min-width: 200px;
    }

    .qty-field {
      flex: 1;
      min-width: 150px;
    }

    .full-width {
      width: 100%;
    }

    h3 {
      margin: 24px 0 8px 0;
    }

    .hint-text {
      font-size: 13px;
      color: rgba(0, 0, 0, 0.54);
      margin: 0 0 16px 0;
    }

    .file-upload-area {
      margin-bottom: 16px;
    }

    .file-input {
      display: none;
    }

    .file-upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      border: 2px dashed rgba(0, 0, 0, 0.2);
      border-radius: 8px;
      cursor: pointer;
      transition: border-color 0.2s, background-color 0.2s;
    }

    .file-upload-label:hover {
      border-color: #1976d2;
      background-color: #e3f2fd;
    }

    .file-upload-label mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: rgba(0, 0, 0, 0.38);
      margin-bottom: 8px;
    }

    .file-upload-label span {
      color: rgba(0, 0, 0, 0.54);
      font-size: 14px;
    }

    .file-hint {
      font-size: 12px !important;
      margin-top: 4px;
    }

    .selected-files,
    .uploaded-files {
      margin-bottom: 16px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 4px;
      margin-bottom: 4px;
    }

    .file-item.uploaded {
      background-color: #f1f8e9;
      border-color: #c5e1a5;
    }

    .file-icon {
      color: rgba(0, 0, 0, 0.54);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .file-icon.success {
      color: #2e7d32;
    }

    .file-name {
      flex: 1;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.54);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }
  `],
})
export class WriteOffCreateComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  warehouses: WarehouseData[] = [];
  items: ItemData[] = [];
  selectedFiles: File[] = [];
  uploadedEvidence: WriteOffEvidence[] = [];
  submitting = false;

  form: FormGroup = this.fb.group({
    warehouseId: ['', Validators.required],
    itemId: ['', Validators.required],
    qty: [null, [Validators.required, Validators.min(0.01)]],
    reason: ['', Validators.required],
    salvageValue: [null, [Validators.min(0)]],
  });

  ngOnInit(): void {
    this.loadMasterData();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const maxSize = 10 * 1024 * 1024; // 10MB
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        if (file.size > maxSize) {
          this.snackBar.open(`File "${file.name}" exceeds 10MB limit`, 'Close', {
            duration: 5000,
          });
          continue;
        }
        this.selectedFiles.push(file);
      }
      // Reset input so the same file can be selected again
      input.value = '';
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    const { warehouseId, itemId, qty, reason, salvageValue } = this.form.value;

    this.api
      .createWriteOff({
        warehouseId,
        itemId,
        qty: Number(qty),
        reason,
        salvageValue: salvageValue ? Number(salvageValue) : undefined,
      })
      .subscribe({
        next: (writeOff) => {
          if (this.selectedFiles.length > 0) {
            this.uploadFiles(writeOff.id);
          } else {
            this.submitting = false;
            this.snackBar.open('Write-off request created successfully', 'Close', {
              duration: 3000,
            });
            this.router.navigate(['/warehouse/write-offs', writeOff.id]);
          }
        },
        error: (err) => {
          this.submitting = false;
          const message = err.error?.message || 'Failed to create write-off request';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        },
      });
  }

  private uploadFiles(writeOffId: string): void {
    let uploadedCount = 0;
    const totalFiles = this.selectedFiles.length;

    for (const file of this.selectedFiles) {
      this.api.uploadWriteOffEvidence(writeOffId, file).subscribe({
        next: (evidence) => {
          this.uploadedEvidence.push(evidence);
          uploadedCount++;
          if (uploadedCount === totalFiles) {
            this.submitting = false;
            this.snackBar.open(
              `Write-off request created with ${totalFiles} evidence file(s)`,
              'Close',
              { duration: 3000 }
            );
            this.router.navigate(['/warehouse/write-offs', writeOffId]);
          }
        },
        error: () => {
          uploadedCount++;
          if (uploadedCount === totalFiles) {
            this.submitting = false;
            this.snackBar.open(
              'Write-off created but some files failed to upload. You can upload them later.',
              'Close',
              { duration: 5000 }
            );
            this.router.navigate(['/warehouse/write-offs', writeOffId]);
          }
        },
      });
    }
  }

  private loadMasterData(): void {
    this.api.getWarehouses().subscribe({
      next: (data) => (this.warehouses = data),
      error: () => (this.warehouses = []),
    });

    this.api.getItems().subscribe({
      next: (data) => (this.items = data),
      error: () => (this.items = []),
    });
  }
}

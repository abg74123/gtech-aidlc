import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import { ItemData, WarehouseData } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-transfer-create',
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
  ],
  template: `
    <div class="page-header">
      <h2>Create Stock Transfer</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="create-form">
      <div class="warehouse-pickers">
        <mat-form-field appearance="outline" class="picker-field">
          <mat-label>Source Warehouse</mat-label>
          <mat-select
            formControlName="sourceWarehouseId"
            aria-label="Select source warehouse"
          >
            @for (warehouse of warehouses; track warehouse.id) {
              <mat-option
                [value]="warehouse.id"
                [disabled]="warehouse.id === form.get('destWarehouseId')?.value"
              >
                {{ warehouse.code }} — {{ warehouse.name }}
              </mat-option>
            }
          </mat-select>
          @if (form.get('sourceWarehouseId')?.hasError('required') && form.get('sourceWarehouseId')?.touched) {
            <mat-error>Source warehouse is required</mat-error>
          }
        </mat-form-field>

        <mat-icon class="arrow-icon">arrow_forward</mat-icon>

        <mat-form-field appearance="outline" class="picker-field">
          <mat-label>Destination Warehouse</mat-label>
          <mat-select
            formControlName="destWarehouseId"
            aria-label="Select destination warehouse"
          >
            @for (warehouse of warehouses; track warehouse.id) {
              <mat-option
                [value]="warehouse.id"
                [disabled]="warehouse.id === form.get('sourceWarehouseId')?.value"
              >
                {{ warehouse.code }} — {{ warehouse.name }}
              </mat-option>
            }
          </mat-select>
          @if (form.get('destWarehouseId')?.hasError('required') && form.get('destWarehouseId')?.touched) {
            <mat-error>Destination warehouse is required</mat-error>
          }
        </mat-form-field>
      </div>

      @if (form.hasError('sameWarehouse')) {
        <p class="form-error">Source and destination warehouses must be different.</p>
      }

      <mat-divider></mat-divider>

      <h3>Transfer Items</h3>

      <div formArrayName="lines" class="lines-container">
        @for (line of lines.controls; track $index; let i = $index) {
          <div [formGroupName]="i" class="line-row">
            <mat-form-field appearance="outline" class="item-field">
              <mat-label>Item</mat-label>
              <mat-select
                formControlName="itemId"
                [attr.aria-label]="'Select item for line ' + (i + 1)"
              >
                @for (item of items; track item.id) {
                  <mat-option [value]="item.id">
                    {{ item.sku }} — {{ item.name }}
                  </mat-option>
                }
              </mat-select>
              @if (line.get('itemId')?.hasError('required') && line.get('itemId')?.touched) {
                <mat-error>Item is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="qty-field">
              <mat-label>Quantity</mat-label>
              <input
                matInput
                type="number"
                formControlName="qty"
                min="0.01"
                step="0.01"
                [attr.aria-label]="'Quantity for line ' + (i + 1)"
              />
              @if (line.get('qty')?.hasError('required') && line.get('qty')?.touched) {
                <mat-error>Qty is required</mat-error>
              }
              @if (line.get('qty')?.hasError('min') && line.get('qty')?.touched) {
                <mat-error>Must be greater than 0</mat-error>
              }
            </mat-form-field>

            <button
              mat-icon-button
              color="warn"
              type="button"
              (click)="removeLine(i)"
              [disabled]="lines.length <= 1"
              [attr.aria-label]="'Remove line ' + (i + 1)"
            >
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
      </div>

      <button
        mat-stroked-button
        type="button"
        (click)="addLine()"
        class="add-line-btn"
        aria-label="Add another item line"
      >
        <mat-icon>add</mat-icon>
        Add Item
      </button>

      <mat-form-field appearance="outline" class="full-width notes-field">
        <mat-label>Notes (optional)</mat-label>
        <textarea
          matInput
          formControlName="notes"
          rows="3"
          aria-label="Optional notes for the transfer"
        ></textarea>
      </mat-form-field>

      <div class="form-actions">
        <a mat-button routerLink="/warehouse/transfers" aria-label="Cancel and go back to list">
          Cancel
        </a>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting"
          aria-label="Submit transfer"
        >
          @if (submitting) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Create & Post Transfer
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

    .warehouse-pickers {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .picker-field {
      flex: 1;
      min-width: 200px;
    }

    .arrow-icon {
      color: rgba(0, 0, 0, 0.54);
      margin-top: -20px;
    }

    .form-error {
      color: #c62828;
      font-size: 12px;
      margin: -8px 0 16px 0;
    }

    h3 {
      margin: 24px 0 16px 0;
    }

    .lines-container {
      margin-bottom: 16px;
    }

    .line-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 8px;
    }

    .item-field {
      flex: 2;
      min-width: 200px;
    }

    .qty-field {
      flex: 1;
      min-width: 100px;
    }

    .add-line-btn {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
    }

    .notes-field {
      margin-top: 8px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `],
})
export class TransferCreateComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  warehouses: WarehouseData[] = [];
  items: ItemData[] = [];
  submitting = false;

  form: FormGroup = this.fb.group(
    {
      sourceWarehouseId: ['', Validators.required],
      destWarehouseId: ['', Validators.required],
      lines: this.fb.array([this.createLineGroup()]),
      notes: [''],
    },
    { validators: [this.sameWarehouseValidator] }
  );

  get lines(): FormArray {
    return this.form.get('lines') as FormArray;
  }

  ngOnInit(): void {
    this.loadMasterData();
  }

  addLine(): void {
    this.lines.push(this.createLineGroup());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) {
      this.lines.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    const { sourceWarehouseId, destWarehouseId, lines, notes } = this.form.value;

    this.api
      .createTransfer({
        sourceWarehouseId,
        destWarehouseId,
        lines: lines.map((line: { itemId: string; qty: number }) => ({
          itemId: line.itemId,
          qty: Number(line.qty),
        })),
        notes: notes || undefined,
      })
      .subscribe({
        next: (transfer) => {
          this.snackBar.open('Transfer created and posted successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/warehouse/transfers', transfer.id]);
        },
        error: (err) => {
          this.submitting = false;
          const message =
            err.error?.message || 'Failed to create transfer';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        },
      });
  }

  private createLineGroup(): FormGroup {
    return this.fb.group({
      itemId: ['', Validators.required],
      qty: [null, [Validators.required, Validators.min(0.01)]],
    });
  }

  private sameWarehouseValidator(control: AbstractControl): ValidationErrors | null {
    const source = control.get('sourceWarehouseId')?.value;
    const dest = control.get('destWarehouseId')?.value;
    if (source && dest && source === dest) {
      return { sameWarehouse: true };
    }
    return null;
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

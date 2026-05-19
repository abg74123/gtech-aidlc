import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WarehouseApiService } from '../../services/warehouse-api.service';
import { ItemData, WarehouseData } from '../../models/warehouse.models';

@Component({
  selector: 'warehouse-count-session-create',
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
  ],
  template: `
    <div class="page-header">
      <h2>Create Count Session</h2>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="create-form">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Warehouse</mat-label>
        <mat-select
          formControlName="warehouseId"
          aria-label="Select warehouse for count session"
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

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Items to Count</mat-label>
        <mat-select
          formControlName="items"
          multiple
          aria-label="Select items to include in count session"
        >
          @for (item of items; track item.id) {
            <mat-option [value]="item.id">
              {{ item.sku }} — {{ item.name }} ({{ item.unit }})
            </mat-option>
          }
        </mat-select>
        @if (form.get('items')?.hasError('required') && form.get('items')?.touched) {
          <mat-error>At least one item is required</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Notes (optional)</mat-label>
        <textarea
          matInput
          formControlName="notes"
          rows="3"
          aria-label="Optional notes for the count session"
        ></textarea>
      </mat-form-field>

      <div class="form-actions">
        <a mat-button routerLink="/warehouse/count" aria-label="Cancel and go back to list">
          Cancel
        </a>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting"
          aria-label="Create count session"
        >
          @if (submitting) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            Create Session
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
      max-width: 600px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `],
})
export class CountSessionCreateComponent implements OnInit {
  private readonly api = inject(WarehouseApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  warehouses: WarehouseData[] = [];
  items: ItemData[] = [];
  submitting = false;

  form: FormGroup = this.fb.group({
    warehouseId: ['', Validators.required],
    items: [[] as string[], Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    this.loadMasterData();
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting) return;

    this.submitting = true;
    const { warehouseId, items, notes } = this.form.value;

    this.api
      .createCountSession({
        warehouseId,
        items: items.map((itemId: string) => ({ itemId })),
        notes: notes || undefined,
      })
      .subscribe({
        next: (session) => {
          this.snackBar.open('Count session created successfully', 'Close', {
            duration: 3000,
          });
          this.router.navigate(['/warehouse/count', session.id]);
        },
        error: (err) => {
          this.submitting = false;
          const message =
            err.error?.message || 'Failed to create count session';
          this.snackBar.open(message, 'Close', { duration: 5000 });
        },
      });
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

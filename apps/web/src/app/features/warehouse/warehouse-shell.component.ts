import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-warehouse-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, MatTabsModule],
  template: `
    <div class="warehouse-shell">
      <nav mat-tab-nav-bar [tabPanel]="tabPanel">
        <a
          mat-tab-link
          routerLink="count"
          routerLinkActive
          #countLink="routerLinkActive"
          [active]="countLink.isActive"
        >
          Stock Count
        </a>
        <a
          mat-tab-link
          routerLink="transfers"
          routerLinkActive
          #transferLink="routerLinkActive"
          [active]="transferLink.isActive"
        >
          Transfers
        </a>
        <a
          mat-tab-link
          routerLink="write-offs"
          routerLinkActive
          #writeOffLink="routerLinkActive"
          [active]="writeOffLink.isActive"
        >
          Write-offs
        </a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <div class="warehouse-content">
          <router-outlet />
        </div>
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    .warehouse-shell {
      padding: 16px;
    }
    .warehouse-content {
      padding: 16px 0;
    }
  `],
})
export class WarehouseShellComponent {}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import {
  ReportsApiService,
  DashboardResponse,
} from '../../services/reports-api.service';

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [DecimalPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly reportsApi = inject(ReportsApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<DashboardResponse | null>(null);

  /** Computed list of alertsByCode entries for template iteration */
  readonly alertsByCodeEntries = computed(() => {
    const data = this.dashboard();
    if (!data?.alertsByCode) return [];
    return Object.entries(data.alertsByCode).map(([code, count]) => ({
      code,
      count,
    }));
  });

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportsApi.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('ไม่สามารถโหลดข้อมูล Dashboard ได้ กรุณาลองใหม่อีกครั้ง');
        this.loading.set(false);
      },
    });
  }
}

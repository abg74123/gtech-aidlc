import { Injectable } from '@nestjs/common';
import { IPeriodService, PeriodInfo, PeriodStatus } from '@autoflow/shared-types';
import { MOCK_PERIODS } from './mock-data';

/**
 * Mock implementation of IPeriodService for the Reports module.
 * Returns period status (OPEN/CLOSED) from mock data.
 * Will be replaced with real service when Period management is integrated.
 */
@Injectable()
export class MockPeriodService implements IPeriodService {
  async validatePeriodOpen(period: string): Promise<boolean> {
    const periodInfo = MOCK_PERIODS.find((p) => p.period === period);

    // If period not found, treat as OPEN (fail-open for mocks)
    if (!periodInfo) {
      return true;
    }

    return periodInfo.status === 'OPEN';
  }

  getCurrentPeriod(): string {
    // Return the latest open period
    const openPeriod = MOCK_PERIODS.find((p) => p.status === 'OPEN');
    return openPeriod?.period ?? '2025-01';
  }

  async closePeriod(period: string, closedBy: string): Promise<PeriodInfo> {
    return {
      period,
      status: PeriodStatus.CLOSED,
      closedAt: new Date().toISOString(),
      closedBy,
    };
  }

  async getPeriodInfo(period: string): Promise<PeriodInfo | null> {
    const periodData = MOCK_PERIODS.find((p) => p.period === period);

    if (!periodData) {
      return null;
    }

    return {
      period: periodData.period,
      status: periodData.status === 'OPEN' ? PeriodStatus.OPEN : PeriodStatus.CLOSED,
      closedAt: periodData.closedAt,
      closedBy: periodData.closedBy,
    };
  }
}

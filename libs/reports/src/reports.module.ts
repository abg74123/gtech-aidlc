import { Module } from '@nestjs/common';
import {
  MockTxLogService,
  MockStockValidationService,
  MockPeriodService,
  TX_LOG_SERVICE,
  STOCK_VALIDATION_SERVICE,
  PERIOD_SERVICE,
} from './mocks';
import { AlertRuleService } from './alerts/alert-rule.service';
import { AlertLogService } from './alerts/alert-log.service';
import { AlertsController } from './alerts/alerts.controller';
import { AlertValidationGuard } from './alerts/alert-validation.guard';
import { ReportQueryService } from './reports/report-query.service';
import { ReportsController } from './reports/reports.controller';

@Module({
  imports: [],
  controllers: [AlertsController, ReportsController],
  providers: [
    {
      provide: TX_LOG_SERVICE,
      useClass: MockTxLogService,
    },
    {
      provide: STOCK_VALIDATION_SERVICE,
      useClass: MockStockValidationService,
    },
    {
      provide: PERIOD_SERVICE,
      useClass: MockPeriodService,
    },
    AlertRuleService,
    AlertLogService,
    AlertValidationGuard,
    ReportQueryService,
  ],
  exports: [
    TX_LOG_SERVICE,
    STOCK_VALIDATION_SERVICE,
    PERIOD_SERVICE,
    AlertRuleService,
    AlertLogService,
    AlertValidationGuard,
    ReportQueryService,
  ],
})
export class ReportsModule {}

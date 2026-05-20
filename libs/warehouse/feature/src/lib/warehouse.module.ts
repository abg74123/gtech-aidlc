import { Module } from '@nestjs/common';
import { WarehouseDataAccessModule } from '@autoflow/warehouse-data-access';
import { AuthModule } from '@autoflow/shared-auth';
import { StockCountService } from './services/stock-count.service';
import { StockTransferService } from './services/stock-transfer.service';
import { WriteOffService } from './services/write-off.service';
import { CountSessionController } from './controllers/count-session.controller';
import { MasterDataController } from './controllers/master-data.controller';
import { TransferController } from './controllers/transfer.controller';
import { WriteOffController } from './controllers/write-off.controller';
import { MockTxLogService } from './mocks/mock-tx-log.service';
import { MockMaService } from './mocks/mock-ma.service';
import { MockStockValidationService } from './mocks/mock-stock-validation.service';
import { MockPeriodService } from './mocks/mock-period.service';
import { MockMasterDataQueryService } from './mocks/mock-master-data-query.service';
import { WAREHOUSE_DI_TOKENS } from './mocks/di-tokens';

/**
 * WarehouseModule — Warehouse Operations (Stock Count, Transfer, Write-off)
 *
 * This module encapsulates all warehouse adjustment operations:
 * - **Stock Count**: Cycle count sessions with freeze/unfreeze, physical count recording,
 *   approval workflow, and automatic ADJ_COUNT_UP/DOWN TX posting.
 * - **Stock Transfer**: Atomic inter-warehouse transfers with ADJ_TRANSFER TX posting.
 * - **Write-off**: Evidence-based write-off requests with CFO approval and ADJ_WRITEOFF TX posting.
 *
 * ## Dependency Injection Strategy
 *
 * External dependencies (TX Log, MA Calculation, Stock Validation, Period, Master Data)
 * are injected via DI tokens defined in `WAREHOUSE_DI_TOKENS`. Currently wired to mock
 * implementations for self-contained development and testing. To swap with real services:
 *
 * ```typescript
 * // Replace mock with real service:
 * { provide: WAREHOUSE_DI_TOKENS.TX_LOG_SERVICE, useClass: RealTxLogService }
 * ```
 *
 * ## OpenAPI Tags
 * - `warehouse / stock-count` — Count session lifecycle endpoints
 * - `warehouse / stock-transfer` — Transfer order endpoints
 * - `warehouse / write-off` — Write-off request and evidence endpoints
 *
 * @see design.md — Architecture section for full module diagram
 */
@Module({
  imports: [WarehouseDataAccessModule, AuthModule],
  controllers: [CountSessionController, MasterDataController, TransferController, WriteOffController],
  providers: [
    // Domain services
    StockCountService,
    StockTransferService,
    WriteOffService,

    // Mock service providers — replaceable with real implementations via DI tokens
    {
      provide: WAREHOUSE_DI_TOKENS.TX_LOG_SERVICE,
      useClass: MockTxLogService,
    },
    {
      provide: WAREHOUSE_DI_TOKENS.MA_SERVICE,
      useClass: MockMaService,
    },
    {
      provide: WAREHOUSE_DI_TOKENS.STOCK_VALIDATION_SERVICE,
      useClass: MockStockValidationService,
    },
    {
      provide: WAREHOUSE_DI_TOKENS.PERIOD_SERVICE,
      useClass: MockPeriodService,
    },
    {
      provide: WAREHOUSE_DI_TOKENS.MASTER_DATA_QUERY_SERVICE,
      useClass: MockMasterDataQueryService,
    },
  ],
  exports: [
    StockCountService,
    StockTransferService,
    WriteOffService,
    // Export DI tokens so other modules can access mock services if needed
    WAREHOUSE_DI_TOKENS.TX_LOG_SERVICE,
    WAREHOUSE_DI_TOKENS.MA_SERVICE,
    WAREHOUSE_DI_TOKENS.STOCK_VALIDATION_SERVICE,
    WAREHOUSE_DI_TOKENS.PERIOD_SERVICE,
    WAREHOUSE_DI_TOKENS.MASTER_DATA_QUERY_SERVICE,
  ],
})
export class WarehouseModule {}

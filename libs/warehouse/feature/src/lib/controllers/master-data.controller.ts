import { Controller, Get, Inject, OnModuleInit } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WAREHOUSE_DI_TOKENS } from '../mocks/di-tokens';
import {
  IMasterDataQueryService,
  ItemData,
  WarehouseData,
} from '../mocks/interfaces';
import { MockMasterDataQueryService } from '../mocks/mock-master-data-query.service';

/**
 * MasterDataController — Exposes warehouse master data (items, warehouses)
 * via REST endpoints for the frontend UI.
 *
 * This is a temporary controller that wraps the MockMasterDataQueryService
 * with seed data. It will be replaced by the real master-data module (Unit 1)
 * once implemented.
 */
@ApiTags('warehouse / master-data')
@Controller('warehouse/master-data')
export class MasterDataController implements OnModuleInit {
  constructor(
    @Inject(WAREHOUSE_DI_TOKENS.MASTER_DATA_QUERY_SERVICE)
    private readonly masterDataService: IMasterDataQueryService,
  ) {}

  onModuleInit(): void {
    // Seed mock data if the service supports it (MockMasterDataQueryService)
    if ('loadItems' in this.masterDataService) {
      const mock = this.masterDataService as MockMasterDataQueryService;
      mock.loadItems([
        { id: 'item-001', name: 'Widget A', sku: 'WGT-001', unit: 'PCS' },
        { id: 'item-002', name: 'Widget B', sku: 'WGT-002', unit: 'BOX' },
        { id: 'item-003', name: 'Bolt M8x20', sku: 'BLT-M8-020', unit: 'PCS' },
        { id: 'item-004', name: 'Lubricant 5L', sku: 'LUB-005', unit: 'CAN' },
        { id: 'item-005', name: 'Packing Tape', sku: 'PKG-TAPE-01', unit: 'ROLL' },
      ]);
      mock.loadWarehouses([
        { id: 'wh-001', name: 'Main Warehouse', code: 'WH-MAIN' },
        { id: 'wh-002', name: 'Branch Warehouse', code: 'WH-BR01' },
        { id: 'wh-003', name: 'Cold Storage', code: 'WH-COLD' },
      ]);
    }
  }

  @Get('items')
  @ApiOperation({ summary: 'List all items in master data' })
  @ApiResponse({ status: 200, description: 'Array of item master data' })
  async getItems(): Promise<ItemData[]> {
    return this.masterDataService.listItems();
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiResponse({ status: 200, description: 'Array of warehouse master data' })
  async getWarehouses(): Promise<WarehouseData[]> {
    return this.masterDataService.listWarehouses();
  }
}

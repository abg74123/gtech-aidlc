import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@autoflow/shared-auth';
import { Role } from '@autoflow/shared-types';
import { ReportQueryService } from './report-query.service';
import { ReportFilterDto } from './dto/report-filter.dto';

/**
 * Controller for report endpoints.
 *
 * GET /api/v1/reports/stock-balance — paginated stock balance with filters
 * GET /api/v1/reports/stock-balance/:itemId — stock detail for specific item
 * GET /api/v1/reports/ap-aging — paginated AP aging with filters
 * GET /api/v1/reports/ar-aging — paginated AR aging with filters
 * GET /api/v1/reports/dashboard — dashboard summary metrics
 *
 * All endpoints require JWT authentication and Manager/CFO/Admin role.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MANAGER, Role.CFO, Role.ADMIN)
export class ReportsController {
  constructor(private readonly reportQueryService: ReportQueryService) {}

  /**
   * Get paginated stock balance report with optional filters.
   * Supports: itemId, warehouseId, search keyword.
   */
  @Get('stock-balance')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getStockBalance(@Query() filter: ReportFilterDto) {
    return this.reportQueryService.getStockReport(filter);
  }

  /**
   * Get stock detail for a specific item across all warehouses.
   * Returns 404 if itemId does not exist.
   */
  @Get('stock-balance/:itemId')
  async getStockDetail(@Param('itemId') itemId: string) {
    return this.reportQueryService.getStockDetail(itemId);
  }

  /**
   * Get paginated AP aging report grouped by vendor with aging buckets.
   * Supports: vendorId, asOfDate filters.
   */
  @Get('ap-aging')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getAPAging(@Query() filter: ReportFilterDto) {
    return this.reportQueryService.getAPAging(filter);
  }

  /**
   * Get paginated AR aging report grouped by customer with aging buckets.
   * Supports: customerId, asOfDate filters.
   */
  @Get('ar-aging')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getARAging(@Query() filter: ReportFilterDto) {
    return this.reportQueryService.getARAging(filter);
  }

  /**
   * Get dashboard summary metrics.
   * Returns: totalAlerts, alertsByCode, stockValue, totalAP, totalAR, recentAlerts.
   */
  @Get('dashboard')
  async getDashboard() {
    return this.reportQueryService.getDashboard();
  }
}

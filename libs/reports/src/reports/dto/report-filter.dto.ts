import { IsOptional, IsInt, Min, IsUUID, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Base DTO for report queries with pagination parameters.
 * Used by all report endpoints (stock balance, AP/AR aging).
 */
export class ReportFilterDto {
  /** Page number (1-based, default 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Items per page (default 20) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  /** Filter by item ID (UUID v4) — used in stock balance */
  @IsOptional()
  @IsUUID('4')
  itemId?: string;

  /** Filter by warehouse ID (UUID v4) — used in stock balance */
  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;

  /** Search keyword — used in stock balance (item name search) */
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by vendor ID (UUID v4) — used in AP aging */
  @IsOptional()
  @IsUUID('4')
  vendorId?: string;

  /** Filter by customer ID (UUID v4) — used in AR aging */
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  /** As-of date for aging calculation (ISO 8601) — used in AP/AR aging */
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}

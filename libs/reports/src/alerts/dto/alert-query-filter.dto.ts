import { IsOptional, IsString, IsUUID, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying alert history with filters and pagination.
 * Used by GET /api/v1/alerts/history endpoint.
 */
export class AlertQueryFilterDto {
  /** Filter by alert code (e.g., STOCK_NEGATIVE, PERIOD_LOCKED) */
  @IsOptional()
  @IsString()
  alertCode?: string;

  /** Filter by transaction type */
  @IsOptional()
  @IsString()
  txType?: string;

  /** Filter alerts from this date (inclusive, ISO 8601) */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /** Filter alerts up to this date (inclusive, ISO 8601) */
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** Filter by user who triggered the alert (UUID v4) */
  @IsOptional()
  @IsUUID('4')
  userId?: string;

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
}

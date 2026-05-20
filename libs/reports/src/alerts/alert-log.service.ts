import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@autoflow/shared-prisma';
import { AlertLog, Prisma } from '@prisma/client';
import { CreateAlertLogDto } from './dto/create-alert-log.dto';
import { AlertQueryFilterDto } from './dto/alert-query-filter.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedAlertLogs {
  data: AlertLog[];
  pagination: PaginationMeta;
}

/**
 * Service responsible for persisting blocked ERROR events to the alert_log table
 * and querying alert history with filters and pagination.
 */
@Injectable()
export class AlertLogService {
  private readonly logger = new Logger(AlertLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persist a blocked ERROR event to the alert_log table.
   * If persistence fails, logs the error and re-throws a DomainException
   * so the original TX is still blocked.
   *
   * @param alert - The alert data to persist
   * @returns The persisted AlertLog entry
   * @throws Error if database write fails (after logging)
   */
  async logAlert(alert: CreateAlertLogDto): Promise<AlertLog> {
    try {
      const alertLog = await this.prisma.alertLog.create({
        data: {
          alertCode: alert.alertCode,
          alertMessage: alert.alertMessage,
          txType: alert.txType,
          txData: alert.txData as unknown as Prisma.InputJsonValue,
          itemId: alert.itemId ?? null,
          warehouseId: alert.warehouseId ?? null,
          period: alert.period ?? null,
          userId: alert.userId,
        },
      });

      this.logger.log(
        `Alert logged: ${alert.alertCode} for user ${alert.userId}`,
      );

      return alertLog;
    } catch (error) {
      this.logger.error(
        `Failed to persist alert log: ${alert.alertCode}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Query alert history with filters and pagination.
   * Results are sorted by createdAt descending (newest first).
   *
   * @param filter - Query filters and pagination params
   * @returns Paginated alert log entries matching the filters
   */
  async findAlerts(filter: AlertQueryFilterDto): Promise<PaginatedAlertLogs> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filter);

    const [data, total] = await Promise.all([
      this.prisma.alertLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.alertLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Build Prisma where clause from filter DTO.
   */
  private buildWhereClause(
    filter: AlertQueryFilterDto,
  ): Prisma.AlertLogWhereInput {
    const where: Prisma.AlertLogWhereInput = {};

    if (filter.alertCode) {
      where.alertCode = filter.alertCode;
    }

    if (filter.txType) {
      where.txType = filter.txType;
    }

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.dateFrom || filter.dateTo) {
      const createdAt: { gte?: Date; lte?: Date } = {};
      if (filter.dateFrom) {
        createdAt.gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        // Include the entire end date by setting to end of day
        const endDate = new Date(filter.dateTo);
        endDate.setHours(23, 59, 59, 999);
        createdAt.lte = endDate;
      }
      where.createdAt = createdAt;
    }

    return where;
  }
}

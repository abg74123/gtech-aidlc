import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { CreateTxDto } from '@autoflow/shared-types';
import { DomainException, ErrorCodes } from '@autoflow/shared-errors';
import { AlertRuleService } from './alert-rule.service';
import { AlertLogService } from './alert-log.service';
import { AlertError } from './dto/alert-validation-result.dto';

/**
 * NestJS Guard that intercepts TX POST requests and validates them
 * against all ERROR alert rules before allowing the operation to proceed.
 *
 * Flow:
 * 1. Extract CreateTxDto from request body
 * 2. Invoke AlertRuleService.validatePrePost()
 * 3. If any rule fails:
 *    a. Log each error via AlertLogService.logAlert()
 *    b. Throw DomainException with HTTP 422
 * 4. If all pass: return true (allow request to proceed)
 */
@Injectable()
export class AlertValidationGuard implements CanActivate {
  private readonly logger = new Logger(AlertValidationGuard.name);

  constructor(
    private readonly alertRuleService: AlertRuleService,
    private readonly alertLogService: AlertLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body: CreateTxDto = request.body;
    const userId: string = request.user?.userId ?? 'unknown';

    const result = await this.alertRuleService.validatePrePost(body);

    if (!result.valid) {
      // Log each error to the alert_log table
      await this.logErrors(result.errors, body, userId);

      // Throw DomainException with HTTP 422 including all errors
      throw new DomainException(
        'การตรวจสอบล้มเหลว — พบข้อผิดพลาดที่ต้องแก้ไขก่อนดำเนินการ',
        ErrorCodes.ALERT_VALIDATION_FAILED,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          valid: false,
          errors: result.errors,
        },
      );
    }

    return true;
  }

  /**
   * Log each alert error to the alert_log table.
   * Errors during logging are caught and logged but do not prevent
   * the DomainException from being thrown.
   */
  private async logErrors(
    errors: AlertError[],
    dto: CreateTxDto,
    userId: string,
  ): Promise<void> {
    const logPromises = errors.map((error) =>
      this.alertLogService
        .logAlert({
          alertCode: error.code,
          alertMessage: error.message,
          txType: dto.txType,
          txData: dto as unknown as Record<string, unknown>,
          itemId: dto.itemId,
          warehouseId: dto.warehouseId,
          period: dto.period,
          userId,
        })
        .catch((logError) => {
          this.logger.error(
            `Failed to log alert ${error.code}: ${logError instanceof Error ? logError.message : String(logError)}`,
          );
        }),
    );

    await Promise.all(logPromises);
  }
}

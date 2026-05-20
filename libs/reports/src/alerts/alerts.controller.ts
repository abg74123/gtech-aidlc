import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '@autoflow/shared-auth';
import { CreateTxDto, Role } from '@autoflow/shared-types';
import { AlertRuleService } from './alert-rule.service';
import { AlertLogService } from './alert-log.service';
import { AlertQueryFilterDto } from './dto/alert-query-filter.dto';
import { AlertValidationResult } from './dto/alert-validation-result.dto';

/**
 * Controller for alert validation and alert history endpoints.
 *
 * POST /api/v1/alerts/validate — programmatic TX validation (any authenticated user)
 * GET /api/v1/alerts/history — alert log history (Manager/CFO/Admin only)
 */
@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertRuleService: AlertRuleService,
    private readonly alertLogService: AlertLogService,
  ) {}

  /**
   * Validate a CreateTxDto against all 5 ERROR rules.
   * Returns 200 with { valid: true, errors: [] } if all pass.
   * Returns 422 with { valid: false, errors: [...] } if any fail.
   */
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async validate(@Body() dto: CreateTxDto): Promise<AlertValidationResult> {
    const result = await this.alertRuleService.validatePrePost(dto);

    if (!result.valid) {
      // Manually set status code to 422 by throwing an HttpException-like response
      // We use a custom approach: return the result but with 422 status
      throw new ValidationFailedException(result);
    }

    return result;
  }

  /**
   * Query alert history with filters and pagination.
   * Restricted to Manager, CFO, and Admin roles.
   */
  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MANAGER, Role.CFO, Role.ADMIN)
  async getHistory(@Query() filter: AlertQueryFilterDto) {
    return this.alertLogService.findAlerts(filter);
  }
}

/**
 * Custom exception for validation failures (HTTP 422).
 * Returns the AlertValidationResult as the response body.
 */
class ValidationFailedException extends HttpException {
  constructor(result: AlertValidationResult) {
    super(result, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

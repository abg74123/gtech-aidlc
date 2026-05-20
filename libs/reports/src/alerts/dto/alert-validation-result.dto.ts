/**
 * Represents a single alert error returned by the validation service.
 */
export interface AlertError {
  /** Error code identifying the violated rule */
  code: string;
  /** Human-readable error message (Thai) */
  message: string;
  /** Additional context about the violation */
  details: Record<string, unknown>;
}

/**
 * Result of alert validation — returned by AlertRuleService.validatePrePost().
 * Contains whether the TX is valid and any errors found.
 */
export interface AlertValidationResult {
  /** Whether the TX passed all validation rules */
  valid: boolean;
  /** List of all violated rules (empty if valid) */
  errors: AlertError[];
}

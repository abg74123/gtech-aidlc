/**
 * Transaction status lifecycle.
 * TX moves: DRAFT → POSTED (immutable after this) → VOIDED (via VOID TX).
 */
export enum TxStatus {
  /** Draft — editable, not yet committed */
  DRAFT = 'DRAFT',
  /** Posted — immutable, affects stock/AP/AR/MA */
  POSTED = 'POSTED',
  /** Voided — cancelled via reverse TX */
  VOIDED = 'VOIDED',
}

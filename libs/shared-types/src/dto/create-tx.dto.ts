import { TxType } from '../enums/tx-type.enum';
import { VatType } from '../enums/vat-type.enum';

/**
 * DTO for creating a new transaction.
 * Used by all units that create TX log entries.
 */
export interface CreateTxDto {
  /** Transaction type — determines system behavior */
  txType: TxType;
  /** Transaction date (ISO 8601 UTC) */
  txDate: string;
  /** Accounting period (YYYY-MM) */
  period: string;

  // ── Stock & Cost ──
  /** Item ID (UUID v4) — null for non-inventory TXs */
  itemId?: string;
  /** Warehouse ID (UUID v4) — null for non-inventory TXs */
  warehouseId?: string;
  /** Quantity change (+ in, − out) */
  qty: number;
  /** Unit cost for this transaction */
  unitCost: number;
  /** Total cost (qty × unitCost) */
  totalCost: number;

  // ── Reference Chain ──
  /** Reference to Purchase Order */
  refPoId?: string;
  /** Reference to Goods Receive */
  refGrId?: string;
  /** Reference to Invoice (Tax Invoice No) */
  refInvoiceId?: string;
  /** Reference to Return */
  refReturnId?: string;
  /** Reference to Credit Note */
  refCnId?: string;
  /** Reference to Job Order */
  refJoId?: string;
  /** Reference to Delivery Order */
  refDoId?: string;
  /** Parent TX ID (for VOID) */
  parentTxId?: string;

  // ── AP / AR ──
  /** Vendor ID (UUID v4) */
  vendorId?: string;
  /** Customer ID (UUID v4) */
  customerId?: string;
  /** AP amount change (+/−) */
  apAmount?: number;
  /** AR amount change (+/−) */
  arAmount?: number;

  // ── VAT ──
  /** VAT type classification */
  vatType?: VatType;
  /** VAT rate (e.g., 7 for 7%) */
  vatRate?: number;
  /** Base amount before VAT */
  baseAmount?: number;
  /** VAT amount */
  vatAmount?: number;
  /** Tax invoice number */
  taxInvoiceNo?: string;
  /** Tax period (YYYY-MM) */
  taxPeriod?: string;

  // ── Variance & Audit ──
  /** PPV amount (auto-calculated for CN_RETURN) */
  ppvAmount?: number;
  /** COGS adjustment amount (for CN_PRICE_ADJ) */
  cogsAdjAmount?: number;
  /** Variance reason description */
  varianceReason?: string;
  /** Reason code */
  reasonCode?: string;

  // ── Audit ──
  /** User ID who created this TX */
  createdBy: string;
}

import { TxType } from '../enums/tx-type.enum';
import { TxStatus } from '../enums/tx-status.enum';

/**
 * TX Log entry representing an immutable transaction record.
 */
export interface TxLogEntry {
  txId: string;
  txType: TxType;
  txDate: string;
  period: string;
  status: TxStatus;
  itemId: string | null;
  warehouseId: string | null;
  qty: number;
  unitCost: number;
  totalCost: number;
  maBefore: number;
  maAfter: number;
  stockBefore: number;
  stockAfter: number;
  cogsUnit: number | null;
  vendorId: string | null;
  customerId: string | null;
  apAmount: number;
  arAmount: number;
  parentTxId: string | null;
  createdBy: string;
  postedBy: string | null;
}

/**
 * Service interface for TX Log operations.
 * All units that create transactions must go through this interface.
 */
export interface ITxLogService {
  /**
   * Create a new TX log entry in DRAFT status.
   */
  createTx(dto: Omit<TxLogEntry, 'txId' | 'status' | 'maBefore' | 'maAfter' | 'stockBefore' | 'stockAfter'>): Promise<TxLogEntry>;

  /**
   * Post a DRAFT TX — validates business rules, calculates MA, updates stock.
   * This is an atomic operation; failure rolls back all changes.
   */
  postTx(txId: string, postedBy: string): Promise<TxLogEntry>;

  /**
   * Void a POSTED TX — creates a reverse TX with opposite values.
   * Original TX status becomes VOIDED.
   */
  voidTx(txId: string, reason: string, voidedBy: string): Promise<TxLogEntry>;

  /**
   * Retrieve a TX by ID.
   */
  findById(txId: string): Promise<TxLogEntry | null>;

  /**
   * Retrieve TX entries by reference chain (e.g., all TXs linked to a JOB_ORDER).
   */
  findByReference(refField: string, refId: string): Promise<TxLogEntry[]>;
}

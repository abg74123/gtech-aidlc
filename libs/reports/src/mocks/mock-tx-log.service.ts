import { Injectable } from '@nestjs/common';
import { ITxLogService, TxLogEntry } from '@autoflow/shared-types';
import { TxStatus } from '@autoflow/shared-types';
import {
  MOCK_TX_LOG_ENTRIES,
  MOCK_STOCK_BALANCES,
  MockTxLogEntry,
} from './mock-data';

/**
 * Mock implementation of ITxLogService for the Reports module.
 * Provides mock TX entries, stock balance lookups, and invoice existence checks.
 * Will be replaced with real service when TX Log unit is integrated.
 */
@Injectable()
export class MockTxLogService implements ITxLogService {
  private readonly entries: MockTxLogEntry[] = [...MOCK_TX_LOG_ENTRIES];

  async createTx(
    dto: Omit<TxLogEntry, 'txId' | 'status' | 'maBefore' | 'maAfter' | 'stockBefore' | 'stockAfter'>,
  ): Promise<TxLogEntry> {
    const entry: TxLogEntry = {
      ...dto,
      txId: `tx-mock-${Date.now()}`,
      status: TxStatus.DRAFT,
      maBefore: 0,
      maAfter: 0,
      stockBefore: 0,
      stockAfter: 0,
    };
    return entry;
  }

  async postTx(txId: string, postedBy: string): Promise<TxLogEntry> {
    const entry = this.entries.find((e) => e.txId === txId);
    if (!entry) {
      throw new Error(`TX not found: ${txId}`);
    }
    return { ...entry, status: TxStatus.POSTED, postedBy } as TxLogEntry;
  }

  async voidTx(txId: string, _reason: string, voidedBy: string): Promise<TxLogEntry> {
    const entry = this.entries.find((e) => e.txId === txId);
    if (!entry) {
      throw new Error(`TX not found: ${txId}`);
    }
    return { ...entry, status: TxStatus.VOIDED, postedBy: voidedBy } as TxLogEntry;
  }

  async findById(txId: string): Promise<TxLogEntry | null> {
    const entry = this.entries.find((e) => e.txId === txId);
    return entry ? (entry as unknown as TxLogEntry) : null;
  }

  async findByReference(refField: string, refId: string): Promise<TxLogEntry[]> {
    const results = this.entries.filter(
      (e) => (e as unknown as Record<string, unknown>)[refField] === refId,
    );
    return results as unknown as TxLogEntry[];
  }

  // ── Reports-specific methods ──────────────────────────────────────

  /**
   * Check if a Job Order already has an invoice.
   * Used by DUPLICATE_INVOICE alert rule.
   */
  async hasInvoiceForJo(refJoId: string): Promise<boolean> {
    const jo = this.entries.find((e) => e.refJoId === refJoId);
    return jo?.hasInvoice ?? false;
  }

  /**
   * Check if a Job Order has a TEMP_DO.
   * Used by DUPLICATE_INVOICE alert rule (SALE_INVOICE blocked if has_temp_do).
   */
  async hasTempDoForJo(refJoId: string): Promise<boolean> {
    const jo = this.entries.find((e) => e.refJoId === refJoId);
    return jo?.hasTempDo ?? false;
  }

  /**
   * Get stock balance for an item in a warehouse.
   * Used by STOCK_NEGATIVE alert rule.
   */
  async getStockBalance(itemId: string, warehouseId: string): Promise<{ qty: number; ma: number }> {
    const balance = MOCK_STOCK_BALANCES.find(
      (b) => b.itemId === itemId && b.warehouseId === warehouseId,
    );
    return balance
      ? { qty: balance.currentQty, ma: balance.currentMA }
      : { qty: 0, ma: 0 };
  }
}

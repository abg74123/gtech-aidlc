import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import { StockNegativeException } from './stock-negative.exception';
import { PeriodLockedException } from './period-locked.exception';
import { ImmutableTxException } from './immutable-tx.exception';
import { RefChainInvalidException } from './ref-chain-invalid.exception';
import { ApprovalRequiredException } from './approval-required.exception';
import { DuplicateInvoiceException } from './duplicate-invoice.exception';
import { InsufficientRoleException } from './insufficient-role.exception';

describe('Domain Exceptions', () => {
  describe('StockNegativeException', () => {
    it('should use STOCK_NEGATIVE error code with UNPROCESSABLE_ENTITY status', () => {
      const ex = new StockNegativeException('item-123', 5, 10);
      expect(ex.errorCode).toBe(ErrorCodes.STOCK_NEGATIVE);
      expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should include product details in message', () => {
      const ex = new StockNegativeException('item-123', 5, 10);
      expect(ex.message).toContain('item-123');
      expect(ex.message).toContain('5');
      expect(ex.message).toContain('10');
    });

    it('should include metadata with product info', () => {
      const ex = new StockNegativeException('item-123', 5, 10);
      expect(ex.metadata).toEqual({
        productId: 'item-123',
        currentQty: 5,
        requestedQty: 10,
      });
    });
  });

  describe('PeriodLockedException', () => {
    it('should use PERIOD_LOCKED error code with UNPROCESSABLE_ENTITY status', () => {
      const ex = new PeriodLockedException('2024-01');
      expect(ex.errorCode).toBe(ErrorCodes.PERIOD_LOCKED);
      expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should include period in message', () => {
      const ex = new PeriodLockedException('2024-01');
      expect(ex.message).toContain('2024-01');
    });

    it('should include metadata with period', () => {
      const ex = new PeriodLockedException('2024-01');
      expect(ex.metadata).toEqual({ period: '2024-01' });
    });
  });

  describe('ImmutableTxException', () => {
    it('should use TX_IMMUTABLE error code with UNPROCESSABLE_ENTITY status', () => {
      const ex = new ImmutableTxException('tx-456');
      expect(ex.errorCode).toBe(ErrorCodes.TX_IMMUTABLE);
      expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should include TX ID in message', () => {
      const ex = new ImmutableTxException('tx-456');
      expect(ex.message).toContain('tx-456');
    });

    it('should include metadata with txId', () => {
      const ex = new ImmutableTxException('tx-456');
      expect(ex.metadata).toEqual({ txId: 'tx-456' });
    });
  });

  describe('RefChainInvalidException', () => {
    it('should use REF_CHAIN_INVALID error code with UNPROCESSABLE_ENTITY status', () => {
      const ex = new RefChainInvalidException('tx-1', 'tx-2');
      expect(ex.errorCode).toBe(ErrorCodes.REF_CHAIN_INVALID);
      expect(ex.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should include source and target TX IDs in message', () => {
      const ex = new RefChainInvalidException('tx-1', 'tx-2');
      expect(ex.message).toContain('tx-1');
      expect(ex.message).toContain('tx-2');
    });

    it('should include optional reason in message', () => {
      const ex = new RefChainInvalidException('tx-1', 'tx-2', 'parent TX not found');
      expect(ex.message).toContain('parent TX not found');
    });
  });

  describe('ApprovalRequiredException', () => {
    it('should use APPROVAL_REQUIRED error code with FORBIDDEN status', () => {
      const ex = new ApprovalRequiredException('tx-789', 'MANAGER');
      expect(ex.errorCode).toBe(ErrorCodes.APPROVAL_REQUIRED);
      expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('should include TX ID and required role in message', () => {
      const ex = new ApprovalRequiredException('tx-789', 'MANAGER');
      expect(ex.message).toContain('tx-789');
      expect(ex.message).toContain('MANAGER');
    });

    it('should include metadata with txId and requiredRole', () => {
      const ex = new ApprovalRequiredException('tx-789', 'MANAGER');
      expect(ex.metadata).toEqual({ txId: 'tx-789', requiredRole: 'MANAGER' });
    });
  });

  describe('DuplicateInvoiceException', () => {
    it('should use DUPLICATE_INVOICE error code with CONFLICT status', () => {
      const ex = new DuplicateInvoiceException('INV-001');
      expect(ex.errorCode).toBe(ErrorCodes.DUPLICATE_INVOICE);
      expect(ex.getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('should include invoice number in message', () => {
      const ex = new DuplicateInvoiceException('INV-001');
      expect(ex.message).toContain('INV-001');
    });

    it('should include metadata with invoiceNumber', () => {
      const ex = new DuplicateInvoiceException('INV-001');
      expect(ex.metadata).toEqual({ invoiceNumber: 'INV-001' });
    });
  });

  describe('InsufficientRoleException', () => {
    it('should use INSUFFICIENT_ROLE error code with FORBIDDEN status', () => {
      const ex = new InsufficientRoleException('ADMIN');
      expect(ex.errorCode).toBe(ErrorCodes.INSUFFICIENT_ROLE);
      expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('should include required role in message', () => {
      const ex = new InsufficientRoleException('ADMIN');
      expect(ex.message).toContain('ADMIN');
    });

    it('should include current role in message when provided', () => {
      const ex = new InsufficientRoleException('ADMIN', 'CASHIER');
      expect(ex.message).toContain('ADMIN');
      expect(ex.message).toContain('CASHIER');
    });
  });
});

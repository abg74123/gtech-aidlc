import {
  TxType,
  TxStatus,
  ApArStatus,
  VatType,
  Role,
  PeriodStatus,
} from './index';

describe('shared-types', () => {
  describe('TxType enum', () => {
    it('should contain all sales TX types', () => {
      expect(TxType.JOB_ORDER).toBe('JOB_ORDER');
      expect(TxType.TEMP_DO).toBe('TEMP_DO');
      expect(TxType.SALE_INVOICE).toBe('SALE_INVOICE');
      expect(TxType.CN_SALES_RETURN).toBe('CN_SALES_RETURN');
      expect(TxType.AR_RECEIVE).toBe('AR_RECEIVE');
    });

    it('should contain all purchasing TX types', () => {
      expect(TxType.GR_RECEIVE).toBe('GR_RECEIVE');
      expect(TxType.GR_RETURN).toBe('GR_RETURN');
      expect(TxType.GR_REPLACEMENT).toBe('GR_REPLACEMENT');
      expect(TxType.CN_RETURN).toBe('CN_RETURN');
      expect(TxType.AP_PAYMENT).toBe('AP_PAYMENT');
    });

    it('should contain warehouse adjustment TX types', () => {
      expect(TxType.ADJ_COUNT_UP).toBe('ADJ_COUNT_UP');
      expect(TxType.ADJ_COUNT_DOWN).toBe('ADJ_COUNT_DOWN');
      expect(TxType.ADJ_WRITEOFF).toBe('ADJ_WRITEOFF');
      expect(TxType.ADJ_TRANSFER).toBe('ADJ_TRANSFER');
    });

    it('should contain VOID type', () => {
      expect(TxType.VOID).toBe('VOID');
    });
  });

  describe('TxStatus enum', () => {
    it('should have DRAFT, POSTED, VOIDED statuses', () => {
      expect(TxStatus.DRAFT).toBe('DRAFT');
      expect(TxStatus.POSTED).toBe('POSTED');
      expect(TxStatus.VOIDED).toBe('VOIDED');
    });
  });

  describe('ApArStatus enum', () => {
    it('should have OPEN, PARTIAL, CLOSED statuses', () => {
      expect(ApArStatus.OPEN).toBe('OPEN');
      expect(ApArStatus.PARTIAL).toBe('PARTIAL');
      expect(ApArStatus.CLOSED).toBe('CLOSED');
    });
  });

  describe('VatType enum', () => {
    it('should have INPUT, OUTPUT, NONE types', () => {
      expect(VatType.INPUT).toBe('INPUT');
      expect(VatType.OUTPUT).toBe('OUTPUT');
      expect(VatType.NONE).toBe('NONE');
    });
  });

  describe('Role enum', () => {
    it('should have all 6 roles', () => {
      expect(Role.CASHIER).toBe('CASHIER');
      expect(Role.STORE).toBe('STORE');
      expect(Role.SUPERVISOR).toBe('SUPERVISOR');
      expect(Role.MANAGER).toBe('MANAGER');
      expect(Role.CFO).toBe('CFO');
      expect(Role.ADMIN).toBe('ADMIN');
    });
  });

  describe('PeriodStatus enum', () => {
    it('should have OPEN and CLOSED statuses', () => {
      expect(PeriodStatus.OPEN).toBe('OPEN');
      expect(PeriodStatus.CLOSED).toBe('CLOSED');
    });
  });
});

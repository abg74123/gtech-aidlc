import { TxType } from '@autoflow/shared-types';
import { TxStatus } from '@autoflow/shared-types';
import { ApArStatus } from '@autoflow/shared-types';

// ── Items ──────────────────────────────────────────────────────────

export interface MockItem {
  id: string;
  name: string;
  sku: string;
  unitCost: number;
}

export const MOCK_ITEMS: MockItem[] = [
  { id: 'item-001', name: 'น้ำมันเครื่อง 5W-30', sku: 'OIL-5W30', unitCost: 250 },
  { id: 'item-002', name: 'ผ้าเบรค หน้า', sku: 'BRK-FRONT', unitCost: 1200 },
  { id: 'item-003', name: 'กรองอากาศ', sku: 'FLT-AIR', unitCost: 350 },
  { id: 'item-004', name: 'หัวเทียน NGK', sku: 'SPK-NGK', unitCost: 180 },
  { id: 'item-005', name: 'น้ำมันเกียร์ ATF', sku: 'OIL-ATF', unitCost: 420 },
];

// ── Warehouses ─────────────────────────────────────────────────────

export interface MockWarehouse {
  id: string;
  name: string;
  code: string;
}

export const MOCK_WAREHOUSES: MockWarehouse[] = [
  { id: 'wh-001', name: 'คลังหลัก สาขา 1', code: 'WH-MAIN' },
  { id: 'wh-002', name: 'คลังสำรอง สาขา 2', code: 'WH-SUB' },
  { id: 'wh-003', name: 'คลังชั่วคราว', code: 'WH-TEMP' },
];

// ── Vendors ────────────────────────────────────────────────────────

export interface MockVendor {
  id: string;
  name: string;
  code: string;
}

export const MOCK_VENDORS: MockVendor[] = [
  { id: 'vendor-001', name: 'บริษัท ออโต้พาร์ท จำกัด', code: 'V-AUTO' },
  { id: 'vendor-002', name: 'บริษัท น้ำมันไทย จำกัด', code: 'V-OIL' },
  { id: 'vendor-003', name: 'บริษัท อะไหล่รถยนต์ จำกัด', code: 'V-PARTS' },
];

// ── Customers ──────────────────────────────────────────────────────

export interface MockCustomer {
  id: string;
  name: string;
  code: string;
}

export const MOCK_CUSTOMERS: MockCustomer[] = [
  { id: 'cust-001', name: 'คุณสมชาย ใจดี', code: 'C-001' },
  { id: 'cust-002', name: 'บริษัท ขนส่งไทย จำกัด', code: 'C-002' },
  { id: 'cust-003', name: 'ห้างหุ้นส่วน รถเร็ว', code: 'C-003' },
];

// ── Stock Balances ─────────────────────────────────────────────────

export interface MockStockBalance {
  itemId: string;
  warehouseId: string;
  currentQty: number;
  currentMA: number;
}

export const MOCK_STOCK_BALANCES: MockStockBalance[] = [
  { itemId: 'item-001', warehouseId: 'wh-001', currentQty: 50, currentMA: 250 },
  { itemId: 'item-001', warehouseId: 'wh-002', currentQty: 20, currentMA: 250 },
  { itemId: 'item-002', warehouseId: 'wh-001', currentQty: 30, currentMA: 1200 },
  { itemId: 'item-002', warehouseId: 'wh-002', currentQty: 10, currentMA: 1200 },
  { itemId: 'item-003', warehouseId: 'wh-001', currentQty: 100, currentMA: 350 },
  { itemId: 'item-003', warehouseId: 'wh-003', currentQty: 15, currentMA: 350 },
  { itemId: 'item-004', warehouseId: 'wh-001', currentQty: 200, currentMA: 180 },
  { itemId: 'item-005', warehouseId: 'wh-001', currentQty: 25, currentMA: 420 },
  { itemId: 'item-005', warehouseId: 'wh-002', currentQty: 5, currentMA: 420 },
];

// ── TX Log Entries (for invoice lookups) ───────────────────────────

export interface MockTxLogEntry {
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
  refJoId?: string;
  hasInvoice?: boolean;
  hasTempDo?: boolean;
}

export const MOCK_TX_LOG_ENTRIES: MockTxLogEntry[] = [
  {
    txId: 'tx-001',
    txType: TxType.JOB_ORDER,
    txDate: '2025-01-15T10:00:00Z',
    period: '2025-01',
    status: TxStatus.POSTED,
    itemId: null,
    warehouseId: null,
    qty: 0,
    unitCost: 0,
    totalCost: 0,
    maBefore: 0,
    maAfter: 0,
    stockBefore: 0,
    stockAfter: 0,
    cogsUnit: null,
    vendorId: null,
    customerId: 'cust-001',
    apAmount: 0,
    arAmount: 0,
    parentTxId: null,
    createdBy: 'user-001',
    postedBy: 'user-001',
    refJoId: 'jo-001',
    hasInvoice: true,
    hasTempDo: false,
  },
  {
    txId: 'tx-002',
    txType: TxType.JOB_ORDER,
    txDate: '2025-01-16T09:00:00Z',
    period: '2025-01',
    status: TxStatus.POSTED,
    itemId: null,
    warehouseId: null,
    qty: 0,
    unitCost: 0,
    totalCost: 0,
    maBefore: 0,
    maAfter: 0,
    stockBefore: 0,
    stockAfter: 0,
    cogsUnit: null,
    vendorId: null,
    customerId: 'cust-002',
    apAmount: 0,
    arAmount: 0,
    parentTxId: null,
    createdBy: 'user-001',
    postedBy: 'user-001',
    refJoId: 'jo-002',
    hasInvoice: false,
    hasTempDo: true,
  },
  {
    txId: 'tx-003',
    txType: TxType.JOB_ORDER,
    txDate: '2025-01-17T14:00:00Z',
    period: '2025-01',
    status: TxStatus.POSTED,
    itemId: null,
    warehouseId: null,
    qty: 0,
    unitCost: 0,
    totalCost: 0,
    maBefore: 0,
    maAfter: 0,
    stockBefore: 0,
    stockAfter: 0,
    cogsUnit: null,
    vendorId: null,
    customerId: 'cust-003',
    apAmount: 0,
    arAmount: 0,
    parentTxId: null,
    createdBy: 'user-002',
    postedBy: 'user-002',
    refJoId: 'jo-003',
    hasInvoice: false,
    hasTempDo: false,
  },
];

// ── Open AP Items ──────────────────────────────────────────────────

export interface MockOpenAPItem {
  id: string;
  vendorId: string;
  amount: number;
  status: ApArStatus;
  createdAt: string;
  txType: TxType;
}

export const MOCK_OPEN_AP_ITEMS: MockOpenAPItem[] = [
  { id: 'ap-001', vendorId: 'vendor-001', amount: 15000, status: ApArStatus.OPEN, createdAt: '2025-01-05T08:00:00Z', txType: TxType.GR_RECEIVE },
  { id: 'ap-002', vendorId: 'vendor-001', amount: 8500, status: ApArStatus.PARTIAL, createdAt: '2024-12-10T10:00:00Z', txType: TxType.GR_RECEIVE },
  { id: 'ap-003', vendorId: 'vendor-002', amount: 22000, status: ApArStatus.OPEN, createdAt: '2024-11-20T09:00:00Z', txType: TxType.GR_RECEIVE },
  { id: 'ap-004', vendorId: 'vendor-002', amount: 5000, status: ApArStatus.OPEN, createdAt: '2024-10-01T11:00:00Z', txType: TxType.GR_RECEIVE },
  { id: 'ap-005', vendorId: 'vendor-003', amount: 12000, status: ApArStatus.OPEN, createdAt: '2025-01-10T14:00:00Z', txType: TxType.GR_RECEIVE },
];

// ── Open AR Items ──────────────────────────────────────────────────

export interface MockOpenARItem {
  id: string;
  customerId: string;
  amount: number;
  status: ApArStatus;
  createdAt: string;
  txType: TxType;
}

export const MOCK_OPEN_AR_ITEMS: MockOpenARItem[] = [
  { id: 'ar-001', customerId: 'cust-001', amount: 18000, status: ApArStatus.OPEN, createdAt: '2025-01-08T10:00:00Z', txType: TxType.SALE_INVOICE },
  { id: 'ar-002', customerId: 'cust-001', amount: 7500, status: ApArStatus.PARTIAL, createdAt: '2024-12-15T09:00:00Z', txType: TxType.SALE_INVOICE },
  { id: 'ar-003', customerId: 'cust-002', amount: 35000, status: ApArStatus.OPEN, createdAt: '2024-11-05T08:00:00Z', txType: TxType.SALE_INVOICE },
  { id: 'ar-004', customerId: 'cust-003', amount: 9800, status: ApArStatus.OPEN, createdAt: '2024-10-15T11:00:00Z', txType: TxType.SALE_INVOICE },
  { id: 'ar-005', customerId: 'cust-003', amount: 4200, status: ApArStatus.OPEN, createdAt: '2025-01-12T15:00:00Z', txType: TxType.SALE_INVOICE },
];

// ── Periods ────────────────────────────────────────────────────────

export interface MockPeriod {
  period: string;
  status: 'OPEN' | 'CLOSED';
  closedAt: string | null;
  closedBy: string | null;
}

export const MOCK_PERIODS: MockPeriod[] = [
  { period: '2025-01', status: 'OPEN', closedAt: null, closedBy: null },
  { period: '2024-12', status: 'CLOSED', closedAt: '2025-01-05T18:00:00Z', closedBy: 'user-cfo' },
  { period: '2024-11', status: 'CLOSED', closedAt: '2024-12-05T18:00:00Z', closedBy: 'user-cfo' },
  { period: '2024-10', status: 'CLOSED', closedAt: '2024-11-05T18:00:00Z', closedBy: 'user-cfo' },
];

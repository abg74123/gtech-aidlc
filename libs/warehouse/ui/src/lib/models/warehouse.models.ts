/**
 * Warehouse UI Models — TypeScript interfaces for API responses and requests
 */

// ─── Master Data ─────────────────────────────────────────────────────────────

export interface ItemData {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

export interface WarehouseData {
  id: string;
  name: string;
  code: string;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum CountSessionStatus {
  INITIATED = 'INITIATED',
  COUNTING = 'COUNTING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
}

export enum WriteOffStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REJECTED = 'REJECTED',
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ─── Stock Count ─────────────────────────────────────────────────────────────

export interface CountLine {
  id: string;
  sessionId: string;
  itemId: string;
  systemQty: number;
  physicalQty: number | null;
  difference: number | null;
  systemMa: number;
  isFrozen: boolean;
  reasonCode: string | null;
  txId: string | null;
  createdAt: string;
}

export interface CountSession {
  id: string;
  warehouseId: string;
  status: CountSessionStatus;
  initiatedBy: string;
  initiatedAt: string;
  completedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
  lines: CountLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCountSessionDto {
  warehouseId: string;
  items: { itemId: string }[];
  notes?: string;
}

export interface RecordCountResultDto {
  physicalQty: number;
  reasonCode?: string;
}

export interface CountApprovalResult {
  id: string;
  status: CountSessionStatus;
  adjustments: { lineId: string; txType: string; txId: string }[];
}

// ─── Stock Transfer ──────────────────────────────────────────────────────────

export interface TransferLine {
  id: string;
  transferId: string;
  itemId: string;
  qty: number;
  unitCost: number;
  txId: string | null;
  createdAt: string;
}

export interface TransferOrder {
  id: string;
  sourceWarehouseId: string;
  destWarehouseId: string;
  status: TransferStatus;
  initiatedBy: string;
  postedAt: string | null;
  notes: string | null;
  lines: TransferLine[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferDto {
  sourceWarehouseId: string;
  destWarehouseId: string;
  lines: { itemId: string; qty: number }[];
  notes?: string;
}

// ─── Write-off ───────────────────────────────────────────────────────────────

export interface WriteOffEvidence {
  id: string;
  writeOffId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface WriteOffRequest {
  id: string;
  warehouseId: string;
  itemId: string;
  qty: number;
  unitCost: number;
  totalLoss: number;
  salvageValue: number;
  reason: string;
  status: WriteOffStatus;
  requestedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  txId: string | null;
  evidence: WriteOffEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWriteOffDto {
  warehouseId: string;
  itemId: string;
  qty: number;
  reason: string;
  salvageValue?: number;
}

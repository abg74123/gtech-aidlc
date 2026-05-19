import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CountSession,
  CountLine,
  CountApprovalResult,
  CreateCountSessionDto,
  RecordCountResultDto,
  TransferOrder,
  CreateTransferDto,
  WriteOffRequest,
  WriteOffEvidence,
  CreateWriteOffDto,
  PaginatedResponse,
  ItemData,
  WarehouseData,
} from '../models/warehouse.models';

/**
 * Injection token for the API base URL.
 * Provide this in the app config or feature route providers.
 */
export const WAREHOUSE_API_BASE_URL = new InjectionToken<string>(
  'WAREHOUSE_API_BASE_URL',
  {
    providedIn: 'root',
    factory: () => '/api/v1/warehouse',
  }
);

@Injectable({ providedIn: 'root' })
export class WarehouseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(WAREHOUSE_API_BASE_URL);

  // ─── Master Data ──────────────────────────────────────────────────────────

  getItems(): Observable<ItemData[]> {
    return this.http.get<ItemData[]>(`${this.baseUrl}/master-data/items`);
  }

  getWarehouses(): Observable<WarehouseData[]> {
    return this.http.get<WarehouseData[]>(`${this.baseUrl}/master-data/warehouses`);
  }

  // ─── Stock Count ─────────────────────────────────────────────────────────

  createCountSession(dto: CreateCountSessionDto): Observable<CountSession> {
    return this.http.post<CountSession>(`${this.baseUrl}/count-sessions`, dto);
  }

  getCountSessions(params?: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<PaginatedResponse<CountSession>> {
    let httpParams = new HttpParams();
    if (params?.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<PaginatedResponse<CountSession>>(`${this.baseUrl}/count-sessions`, {
      params: httpParams,
    });
  }

  getCountSession(id: string): Observable<CountSession> {
    return this.http.get<CountSession>(`${this.baseUrl}/count-sessions/${id}`);
  }

  recordCountResult(
    sessionId: string,
    lineId: string,
    dto: RecordCountResultDto
  ): Observable<CountLine> {
    return this.http.patch<CountLine>(
      `${this.baseUrl}/count-sessions/${sessionId}/lines/${lineId}`,
      dto
    );
  }

  submitCountSession(sessionId: string): Observable<CountSession> {
    return this.http.post<CountSession>(
      `${this.baseUrl}/count-sessions/${sessionId}/submit`,
      {}
    );
  }

  approveCountSession(sessionId: string): Observable<CountApprovalResult> {
    return this.http.post<CountApprovalResult>(
      `${this.baseUrl}/count-sessions/${sessionId}/approve`,
      {}
    );
  }

  // ─── Stock Transfer ──────────────────────────────────────────────────────

  createTransfer(dto: CreateTransferDto): Observable<TransferOrder> {
    return this.http.post<TransferOrder>(`${this.baseUrl}/transfers`, dto);
  }

  getTransfers(params?: {
    sourceWarehouseId?: string;
    destWarehouseId?: string;
    page?: number;
    limit?: number;
  }): Observable<PaginatedResponse<TransferOrder>> {
    let httpParams = new HttpParams();
    if (params?.sourceWarehouseId)
      httpParams = httpParams.set('sourceWarehouseId', params.sourceWarehouseId);
    if (params?.destWarehouseId)
      httpParams = httpParams.set('destWarehouseId', params.destWarehouseId);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<PaginatedResponse<TransferOrder>>(`${this.baseUrl}/transfers`, {
      params: httpParams,
    });
  }

  getTransfer(id: string): Observable<TransferOrder> {
    return this.http.get<TransferOrder>(`${this.baseUrl}/transfers/${id}`);
  }

  // ─── Write-off ───────────────────────────────────────────────────────────

  createWriteOff(dto: CreateWriteOffDto): Observable<WriteOffRequest> {
    return this.http.post<WriteOffRequest>(`${this.baseUrl}/write-offs`, dto);
  }

  uploadWriteOffEvidence(writeOffId: string, file: File): Observable<WriteOffEvidence> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<WriteOffEvidence>(
      `${this.baseUrl}/write-offs/${writeOffId}/evidence`,
      formData
    );
  }

  approveWriteOff(writeOffId: string): Observable<WriteOffRequest> {
    return this.http.post<WriteOffRequest>(
      `${this.baseUrl}/write-offs/${writeOffId}/approve`,
      {}
    );
  }

  getWriteOffs(params?: {
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Observable<PaginatedResponse<WriteOffRequest>> {
    let httpParams = new HttpParams();
    if (params?.warehouseId) httpParams = httpParams.set('warehouseId', params.warehouseId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());

    return this.http.get<PaginatedResponse<WriteOffRequest>>(`${this.baseUrl}/write-offs`, {
      params: httpParams,
    });
  }

  getWriteOff(id: string): Observable<WriteOffRequest> {
    return this.http.get<WriteOffRequest>(`${this.baseUrl}/write-offs/${id}`);
  }
}

import { apiGet, apiPost, apiPatch } from './client';

export type AssetStockItemRecord = {
  id: string;
  itemCode?: string | null;
  itemName?: string | null;
  itemType?: string | null;
  category?: string | null;
  unitOfMeasure?: string | null;
  status?: string | null;
};

export type AssetLocationRecord = {
  id: string;
  locationCode?: string | null;
  locationName?: string | null;
  site?: string | null;
  branch?: string | null;
  department?: string | null;
  locationType?: string | null;
  status?: string | null;
};

export type AssetBalanceRecord = {
  id?: string;
  stockItemId?: string | null;
  locationId?: string | null;
  quantityOnHand?: string | number | null;
  availableQuantity?: string | number | null;
  stockItem?: AssetStockItemRecord | null;
  location?: AssetLocationRecord | null;
};

export type AssetMovementRecord = {
  id: string;
  movementNo?: string | null;
  movementType?: string | null;
  status?: string | null;
  referenceNo?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  requestedBy?: string | null;
  approvedBy?: string | null;
  postedBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fromLocation?: AssetLocationRecord | null;
  toLocation?: AssetLocationRecord | null;
  lines?: any[];
};

export type AssetStockCountRecord = {
  id: string;
  countNo?: string | null;
  sessionNo?: string | null;
  locationId?: string | null;
  status?: string | null;
  countedBy?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  countDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  notes?: string | null;
  location?: AssetLocationRecord | null;
  lines?: any[];
};

export type AssetQrTagRecord = {
  id: string;
  tagCode: string;
  tagType?: string | null;
  status?: string | null;
  assignedToType?: string | null;
  assignedToId?: string | null;
  lastScannedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  stockItem?: AssetStockItemRecord | null;
  stockItemId?: string | null;
  location?: AssetLocationRecord | null;
  locationId?: string | null;
};

export type AssetScanPayload = {
  tagCode?: string;
  scanType?: string;
  scanSource?: string;
  scannedBy?: string;
  employeeNo?: string;
  employeeNumber?: string;
  department?: string;
  site?: string;
  locationName?: string;
  notes?: string;
  submittedFrom?: string;
  scannedAt?: string;
};

export type AssetScanResult = {
  message?: string;
  tagCode?: string;
  qrTag?: AssetQrTagRecord;
  tag?: AssetQrTagRecord;
  scan?: any;
  stockItem?: any;
  location?: any;
  result?: any;
};

export const getAssetQrTags = () => apiGet<AssetQrTagRecord[]>('/assets/qr-tags');

export const scanAssetQrTag = (tagCode: string, payload: AssetScanPayload) =>
  apiPost<AssetScanResult>(`/assets/qr-tags/${encodeURIComponent(tagCode)}/scan`, payload);

export const getAssetStockItems = () => apiGet<AssetStockItemRecord[]>('/assets/stock-items');

export const getAssetLocations = () => apiGet<AssetLocationRecord[]>('/assets/locations');

export const getAssetBalances = () => apiGet<AssetBalanceRecord[]>('/assets/balances');

export const getAssetMovements = () => apiGet<AssetMovementRecord[]>('/assets/movements');

export const createAssetMovement = (payload: any) =>
  apiPost<AssetMovementRecord>('/assets/movements', payload);

export const approveAssetMovement = (id: string, payload: any) =>
  apiPatch<AssetMovementRecord>(`/assets/movements/${id}/approve`, payload);

export const postAssetMovement = (id: string, payload: any) =>
  apiPatch<AssetMovementRecord>(`/assets/movements/${id}/post`, payload);

export const getAssetStockCounts = () => apiGet<AssetStockCountRecord[]>('/assets/stock-counts');

export const createAssetStockCount = (payload: any) =>
  apiPost<AssetStockCountRecord>('/assets/stock-counts', payload);

export const approveAssetStockCount = (id: string, payload: any) =>
  apiPatch<AssetStockCountRecord>(`/assets/stock-counts/${id}/approve`, payload);
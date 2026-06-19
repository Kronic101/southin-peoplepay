import { withDevRoleHeaders } from './dev-role';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type JsonBody = Record<string, unknown> | any;

async function readApiError(res: Response, fallback: string): Promise<never> {
  let errorBody: any = null;

  try {
    errorBody = await res.json();
  } catch {
    try {
      const text = await res.text();
      throw new Error(text || fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  if (typeof errorBody?.message === 'string') {
    throw new Error(errorBody.message);
  }

  if (Array.isArray(errorBody?.message)) {
    throw new Error(errorBody.message.join(', '));
  }

  if (typeof errorBody?.error === 'string') {
    throw new Error(errorBody.error);
  }

  throw new Error(fallback);
}

function jsonHeaders(): HeadersInit {
  return withDevRoleHeaders({
    'Content-Type': 'application/json',
  });
}

function roleHeaders(): HeadersInit {
  return withDevRoleHeaders();
}

async function apiGet<T = any>(
  path: string,
  fallback: string,
  protectedRoute = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: protectedRoute ? roleHeaders() : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

async function apiPost<T = any>(
  path: string,
  payload?: JsonBody,
  fallback = 'Request failed',
  protectedRoute = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: protectedRoute ? jsonHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

async function apiPatch<T = any>(
  path: string,
  payload?: JsonBody,
  fallback = 'Request failed',
  protectedRoute = true,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: protectedRoute ? jsonHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    cache: 'no-store',
  });

  if (!res.ok) {
    await readApiError(res, fallback);
  }

  return res.json();
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type AssetDashboardResponse = {
  summary: {
    assets: number;
    activeAssets: number;
    stockItems: number;
    locations: number;
    movements: number;
    pendingMovements: number;
    qrTags?: number;
    assetQrTags?: number;
    scaffoldComponents: number;
    availableScaffolds: number;
    issuedScaffolds: number;
    damagedScaffolds: number;
  };
  lowStock: Array<{
    itemCode: string;
    itemName: string;
    locationCode: string;
    locationName: string;
    quantityOnHand: number;
    minimumLevel: number;
  }>;
  recentMovements?: StockMovementRecord[];
};

export type StockItemRecord = {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  category?: string | null;
  description?: string | null;
  unitOfMeasure: string;
  minimumLevel?: string | number | null;
  reorderLevel?: string | number | null;
  standardCost?: string | number | null;
  supplierId?: string | null;
  supplierCode?: string | null;
  supplierName?: string | null;
  poNumber?: string | null;
  legacyCode?: string | null;
  legacySource?: string | null;
  isSerialized: boolean;
  isQrTracked: boolean;
  isRfidTracked?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  balances?: StockBalanceRecord[];
  qrTags?: AssetQrTagRecord[];
  scaffoldComponents?: ScaffoldComponentRecord[];
};
export type StockItem = StockItemRecord;

export type StockLocationRecord = {
  id: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  site?: string | null;
  branch?: string | null;
  department?: string | null;
  isActive: boolean;
};

export type StockBalanceRecord = {
  id: string;
  stockItemId: string;
  locationId: string;
  quantityOnHand: string | number;
  quantityIssued?: string | number;
  quantityDamaged?: string | number;
  quantityLost?: string | number;
  updatedAt: string;
  stockItem?: StockItemRecord;
  location?: StockLocationRecord;
};
export type StockBalance = StockBalanceRecord;

export type AssetQrTagRecord = {
  id: string;
  tagCode: string;
  qrPayload?: string | null;
  barcodeValue?: string | null;
  status?: string | null;
  stockItemId?: string | null;
  locationId?: string | null;
  stockItem?: StockItemRecord | null;
  location?: StockLocationRecord | null;
  lastScannedAt?: string | null;
  lastScannedBy?: string | null;
  lastScanSite?: string | null;
};

export type AssetQrTag = AssetQrTagRecord;

export type StockMovementRecord = {
  id: string;
  movementNo: string;
  movementType: string;
  status: string;
  ledgerStatus?: string | null;
  financeStatus?: string | null;
  financeExpenseNo?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  requestedBy?: string | null;
  requestedByEmail?: string | null;
  department?: string | null;
  site?: string | null;
  branch?: string | null;
  projectCode?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  financeExpenseId?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fromLocation?: StockLocationRecord | null;
  toLocation?: StockLocationRecord | null;
  financeExpense?: any | null;
  lines?: StockMovementLineRecord[];
  ledgerEntries?: StockLedgerRecord[];
};

export type StockMovementLineRecord = {
  id: string;
  movementId: string;
  stockItemId: string;
  qrTagId?: string | null;
  quantity: string | number;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  notes?: string | null;
  stockItem?: StockItemRecord | null;
  qrTag?: AssetQrTagRecord | null;
  ledgerEntries?: StockLedgerRecord[];
};

export type ScaffoldComponentRecord = {
  id: string;
  componentNo: string;
  componentType: string;
  description?: string | null;
  stockItemId?: string | null;
  currentSite?: string | null;
  currentLocation?: string | null;
  conditionStatus: string;
  tagStatus: string;
  purchaseDate?: string | null;
  purchaseValue?: string | number | null;
  lastInspectionDate?: string | null;
  nextInspectionDate?: string | null;
  createdAt: string;
  updatedAt: string;
  stockItem?: StockItemRecord | null;
  qrTags?: AssetQrTagRecord[];
};

export type StockLedgerRecord = {
  id: string;
  stockItemId?: string | null;
  locationId?: string | null;
  movementId?: string | null;
  movementLineId?: string | null;
  financeExpenseId?: string | null;
  procurementRequestId?: string | null;
  workshopJobId?: string | null;
  transactionType?: string | null;
  quantityIn?: string | number | null;
  quantityOut?: string | number | null;
  balanceAfter?: string | number | null;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  referenceNo?: string | null;
  department?: string | null;
  site?: string | null;
  branch?: string | null;
  projectCode?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  stockItem?: StockItemRecord | null;
  location?: StockLocationRecord | null;
  movement?: StockMovementRecord | null;
  movementLine?: StockMovementLineRecord | null;
};

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export async function getAssetDashboard(): Promise<AssetDashboardResponse> {
  return apiGet<AssetDashboardResponse>(
    '/assets/dashboard',
    'Failed to load asset dashboard',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Stock Items / Locations / Balances                                          */
/* -------------------------------------------------------------------------- */

export async function getAssetStockItems(): Promise<StockItemRecord[]> {
  return apiGet<StockItemRecord[]>(
    '/assets/stock-items',
    'Failed to load stock items',
    true,
  );
}

export async function createAssetStockItem(payload: {
  itemCode?: string;
  codeMode?: string;
  itemName: string;
  itemType: string;
  category?: string;
  unitOfMeasure?: string;
  minimumLevel?: number;
  reorderLevel?: number;
  standardCost?: number;
  isSerialized?: boolean;
  isQrTracked?: boolean;
  isRfidTracked?: boolean;
  allowUpdateIfCodeExists?: boolean;
}) {
  return apiPost<StockItemRecord>(
    '/assets/stock-items',
    payload,
    'Failed to create stock item',
    true,
  );
}

export async function previewAssetStockItemCode(payload: {
  codeMode?: string;
  itemType?: string;
  category?: string;
}) {
  return apiPost<any>(
    '/assets/stock-items/preview-code',
    payload,
    'Failed to preview stock item code',
    true,
  );
}

export async function getAssetLocations(): Promise<StockLocationRecord[]> {
  return apiGet<StockLocationRecord[]>(
    '/assets/locations',
    'Failed to load asset locations',
    true,
  );
}

export async function createAssetLocation(payload: any) {
  return apiPost<StockLocationRecord>(
    '/assets/locations',
    payload,
    'Failed to create asset location',
    true,
  );
}

export async function getAssetBalances(): Promise<StockBalanceRecord[]> {
  return apiGet<StockBalanceRecord[]>(
    '/assets/balances',
    'Failed to load stock balances',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Movements                                                                  */
/* -------------------------------------------------------------------------- */

export async function getAssetMovements(): Promise<StockMovementRecord[]> {
  return apiGet<StockMovementRecord[]>(
    '/assets/movements',
    'Failed to load stock movements',
    true,
  );
}

export async function getAssetMovement(id: string): Promise<StockMovementRecord> {
  return apiGet<StockMovementRecord>(
    `/assets/movements/${id}`,
    'Failed to load stock movement',
    true,
  );
}

export async function createAssetMovement(payload: {
  movementType: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  requestedBy?: string;
  requestedByEmail?: string;
  department?: string;
  site?: string;
  branch?: string;
  projectCode?: string;
  reason?: string;
  lines: Array<{
    stockItemId: string;
    quantity: number;
    unitCost?: number;
    qrTagId?: string | null;
    notes?: string;
  }>;
}) {
  return apiPost<StockMovementRecord>(
    '/assets/movements',
    payload,
    'Failed to create stock movement',
    true,
  );
}

export async function approveAssetMovement(id: string, approvedBy = 'Asset Manager') {
  return apiPatch<StockMovementRecord>(
    `/assets/movements/${id}/approve`,
    { approvedBy },
    'Failed to approve stock movement',
    true,
  );
}

export async function postAssetMovement(id: string, postedBy = 'Asset Manager') {
  return apiPatch<any>(
    `/assets/movements/${id}/post`,
    { postedBy },
    'Failed to post stock movement',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Ledger                                                                      */
/* -------------------------------------------------------------------------- */

export async function getAssetLedger(): Promise<StockLedgerRecord[]> {
  return apiGet<StockLedgerRecord[]>(
    '/assets/ledger',
    'Failed to load stock ledger',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* QR / RFID                                                                   */
/* -------------------------------------------------------------------------- */

export async function getAssetQrTags(): Promise<AssetQrTagRecord[]> {
  return apiGet<AssetQrTagRecord[]>(
    '/assets/qr-tags',
    'Failed to load QR/RFID tags',
    true,
  );
}

export async function createAssetQrTag(payload: any) {
  return apiPost<AssetQrTagRecord>(
    '/assets/qr-tags',
    payload,
    'Failed to create QR/RFID tag',
    true,
  );
}

export async function scanAssetQrTag(
  tagCode: string,
  payload: { scannedBy?: string; site?: string; scanType?: string },
) {
  return apiPost<AssetQrTagRecord>(
    `/assets/qr-tags/${encodeURIComponent(tagCode)}/scan`,
    payload,
    'Failed to scan QR/RFID tag',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Scaffolds                                                                   */
/* -------------------------------------------------------------------------- */

export async function getScaffoldComponents(): Promise<ScaffoldComponentRecord[]> {
  return apiGet<ScaffoldComponentRecord[]>(
    '/assets/scaffolds',
    'Failed to load scaffold components',
    true,
  );
}

export async function getAssetScaffoldComponents(): Promise<ScaffoldComponentRecord[]> {
  return getScaffoldComponents();
}

export async function createScaffoldComponent(payload: any) {
  return apiPost<ScaffoldComponentRecord>(
    '/assets/scaffolds',
    payload,
    'Failed to create scaffold component',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Omni Core Import                                                            */
/* -------------------------------------------------------------------------- */

export async function getAssetImportBatches() {
  try {
    const data = await apiGet<any[]>(
      '/assets/imports',
      'Failed to load asset import batches',
      true,
    );

    return {
      ok: true,
      data,
      error: '',
    };
  } catch (err: any) {
    return {
      ok: false,
      data: [],
      error: err?.message || 'Failed to load asset import batches',
    };
  }
}

export async function createAssetImportPreview(payload: any) {
  try {
    const data = await apiPost<any>(
      '/assets/imports/preview',
      payload,
      'Failed to create import preview',
      true,
    );

    return {
      ok: true,
      data,
      error: '',
    };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: err?.message || 'Failed to create import preview',
    };
  }
}

export async function postAssetImportBatch(
  id: string,
  postedByOrPayload: string | { postedBy?: string },
) {
  const postedBy =
    typeof postedByOrPayload === 'string'
      ? postedByOrPayload
      : postedByOrPayload?.postedBy || 'Asset Manager';

  try {
    const data = await apiPost<any>(
      `/assets/imports/${id}/post`,
      { postedBy },
      'Failed to post asset import batch',
      true,
    );

    return {
      ok: true,
      data,
      error: '',
      message: data?.message || 'Import batch posted.',
    };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: err?.message || 'Failed to post asset import batch',
      message: '',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Backward-compatible aliases for older Asset pages                           */
/* -------------------------------------------------------------------------- */

export async function getStockItems(): Promise<StockItemRecord[]> {
  return getAssetStockItems();
}

export async function getStockBalances(): Promise<StockBalanceRecord[]> {
  return getAssetBalances();
}

export async function getStockMovements(): Promise<StockMovementRecord[]> {
  return getAssetMovements();
}

export async function getStockLocations(): Promise<StockLocationRecord[]> {
  return getAssetLocations();
}

/* -------------------------------------------------------------------------- */
/* Stock Counts                                                                */
/* -------------------------------------------------------------------------- */

export async function getAssetStockCounts() {
  return apiGet<any[]>(
    '/assets/stock-counts',
    'Failed to load stock count sessions',
    true,
  );
}

export async function createAssetStockCount(payload: any) {
  return apiPost<any>(
    '/assets/stock-counts',
    payload,
    'Failed to create stock count session',
    true,
  );
}

export async function approveAssetStockCount(id: string, payload: any) {
  return apiPatch<any>(
    `/assets/stock-counts/${id}/approve`,
    payload,
    'Failed to approve stock count session',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Custody                                                                     */
/* -------------------------------------------------------------------------- */

export async function getAssetCustodyAssignments() {
  return apiGet<any[]>(
    '/assets/custody',
    'Failed to load custody assignments',
    true,
  );
}

export async function createAssetCustodyAssignment(payload: any) {
  return apiPost<any>(
    '/assets/custody',
    payload,
    'Failed to create custody assignment',
    true,
  );
}

export async function returnAssetCustodyAssignment(id: string, payload: any) {
  return apiPatch<any>(
    `/assets/custody/${id}/return`,
    payload,
    'Failed to return custody assignment',
    true,
  );
}

/* -------------------------------------------------------------------------- */
/* Deployments                                                                 */
/* -------------------------------------------------------------------------- */

export async function getAssetScaffoldDeployments() {
  return apiGet<any[]>(
    '/assets/deployments',
    'Failed to load scaffold deployments',
    true,
  );
}

export async function createAssetScaffoldDeployment(payload: any) {
  return apiPost<any>(
    '/assets/deployments',
    payload,
    'Failed to create scaffold deployment',
    true,
  );
}

export async function closeAssetScaffoldDeployment(id: string, payload: any) {
  return apiPatch<any>(
    `/assets/deployments/${id}/close`,
    payload,
    'Failed to close scaffold deployment',
    true,
  );
}

export async function updateAssetStockCountLine(
  sessionId: string,
  lineId: string,
  payload: any,
) {
  return apiPatch<any>(
    `/assets/stock-counts/${sessionId}/lines/${lineId}`,
    payload,
    'Failed to update stock count line',
    true,
  );
}

export async function postAssetStockCountAdjustment(id: string, payload: any) {
  return apiPatch<any>(
    `/assets/stock-counts/${id}/post-adjustment`,
    payload,
    'Failed to post stock count adjustment',
    true,
  );
}
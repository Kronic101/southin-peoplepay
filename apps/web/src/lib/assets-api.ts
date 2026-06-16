'use client';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

export type AssetApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
};

async function assetRequest<T>(path: string, init?: RequestInit): Promise<AssetApiResult<T>> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const body = isJson ? await response.json().catch(() => null) : await response.text();

    if (!response.ok) {
      const message =
        typeof body === 'object' && body?.message
          ? Array.isArray(body.message)
            ? body.message.join(', ')
            : body.message
          : `Request failed with status ${response.status}`;

      return {
        ok: false,
        status: response.status,
        error: message,
      };
    }

    return {
      ok: true,
      status: response.status,
      data: body as T,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to connect to the Asset Management API.',
    };
  }
}

function normalizeError(result: AssetApiResult<unknown>, fallback: string) {
  return result.error || fallback;
}

export type AssetDashboardResponse = {
  summary: {
    assets: number;
    activeAssets: number;
    stockItems: number;
    locations: number;
    movements: number;
    pendingMovements: number;
    qrTags: number;
    scaffoldComponents: number;
    availableScaffolds: number;
    issuedScaffolds: number;
    damagedScaffolds: number;
  };
  lowStock?: Array<{
    itemCode: string;
    itemName: string;
    locationCode: string;
    locationName: string;
    quantityOnHand: string | number;
    minimumLevel: string | number;
  }>;
};

export type StockItem = {
  id: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  category: string;
  description?: string | null;
  unitOfMeasure: string;
  minimumLevel?: string | number | null;
  reorderLevel?: string | number | null;
  standardCost?: string | number | null;
  isSerialized: boolean;
  isQrTracked: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  balances?: StockBalance[];
};

export type StockLocation = {
  id: string;
  locationCode: string;
  locationName: string;
  locationType: string;
  site?: string | null;
  branch?: string | null;
  department?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type StockBalance = {
  id: string;
  stockItemId: string;
  locationId: string;
  quantityOnHand: string | number;
  quantityIssued: string | number;
  quantityDamaged: string | number;
  quantityLost: string | number;
  updatedAt?: string;
  stockItem?: StockItem;
  location?: StockLocation;
};

export type AssetQrTag = {
  id: string;
  tagCode: string;
  qrPayload?: string | null;
  barcodeValue?: string | null;
  stockItemId?: string | null;
  assetId?: string | null;
  scaffoldComponentId?: string | null;
  assignedLocationId?: string | null;
  status: string;
  lastScannedAt?: string | null;
  lastScannedBy?: string | null;
  lastScanSite?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stockItem?: StockItem | null;
  assignedLocation?: StockLocation | null;
};

export type StockMovementLine = {
  id: string;
  stockMovementId?: string;
  stockItemId: string;
  qrTagId?: string | null;
  quantity: string | number;
  unitCost?: string | number | null;
  totalCost?: string | number | null;
  notes?: string | null;
  stockItem?: StockItem | null;
  qrTag?: AssetQrTag | null;
};

export type StockMovement = {
  id: string;
  movementNo: string;
  movementType: string;
  status: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  requestedBy?: string | null;
  requestedByEmail?: string | null;
  department?: string | null;
  site?: string | null;
  projectCode?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceNo?: string | null;
  approvalRequestId?: string | null;
  submittedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  fromLocation?: StockLocation | null;
  toLocation?: StockLocation | null;
  lines?: StockMovementLine[];
};

export type ScaffoldComponent = {
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
  createdAt?: string;
  updatedAt?: string;
  stockItem?: StockItem | null;
  qrTags?: AssetQrTag[];
};

export type AssetImportBatch = {
  id: string;
  batchNo: string;
  sourceType: string;
  fileName?: string | null;
  status: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  postedRows: number;
  createdBy?: string | null;
  postedBy?: string | null;
  postedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  lines?: AssetImportLine[];
};

export type AssetImportLine = {
  id: string;
  batchId: string;
  rowNumber: number;
  itemCode?: string | null;
  itemName?: string | null;
  itemType?: string | null;
  category?: string | null;
  unitOfMeasure?: string | null;
  locationCode?: string | null;
  locationName?: string | null;
  locationType?: string | null;
  site?: string | null;
  branch?: string | null;
  department?: string | null;
  quantityOnHand?: string | number | null;
  minimumLevel?: string | number | null;
  reorderLevel?: string | number | null;
  standardCost?: string | number | null;
  scaffoldComponentNo?: string | null;
  componentType?: string | null;
  conditionStatus?: string | null;
  tagStatus?: string | null;
  qrTagCode?: string | null;
  status: string;
  validationErrors?: unknown;
  createdAt: string;
  updatedAt: string;
};

export type CreateStockMovementPayload = {
  movementType: string;
  fromLocationId?: string;
  toLocationId?: string;
  requestedBy?: string;
  requestedByEmail?: string;
  department?: string;
  site?: string;
  projectCode?: string;
  reason?: string;
  referenceType?: string;
  referenceNo?: string;
  lines: Array<{
    stockItemId: string;
    quantity: number;
    unitCost?: number;
    qrTagId?: string;
    notes?: string;
  }>;
};

export type ScanAssetTagPayload = {
  tagCode: string;
  scanType: 'QR_CODE' | 'RFID_UHF' | 'BARCODE';
  scannedBy: string;
  site: string;
};

export async function getAssetDashboard() {
  return assetRequest<AssetDashboardResponse>('/assets/dashboard');
}

export async function getStockItems() {
  return assetRequest<StockItem[]>('/assets/stock-items');
}

export async function getStockBalances() {
  return assetRequest<StockBalance[]>('/assets/balances');
}

export async function getStockLocations() {
  return assetRequest<StockLocation[]>('/assets/locations');
}

export async function getAssetQrTags() {
  return assetRequest<AssetQrTag[]>('/assets/qr-tags');
}

export async function getStockMovements() {
  return assetRequest<StockMovement[]>('/assets/movements');
}

export async function getScaffoldComponents() {
  return assetRequest<ScaffoldComponent[]>('/assets/scaffolds');
}

export async function createStockMovement(payload: CreateStockMovementPayload) {
  return assetRequest<StockMovement>('/assets/movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function approveStockMovement(id: string, payload?: { approvedBy?: string; comments?: string }) {
  return assetRequest<StockMovement>(`/assets/movements/${encodeURIComponent(id)}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({
      approvedBy: payload?.approvedBy || 'Asset Manager',
      comments: payload?.comments || 'Movement approved.',
    }),
  });
}

export async function postStockMovement(id: string, payload?: { postedBy?: string; comments?: string }) {
  return assetRequest<StockMovement>(`/assets/movements/${encodeURIComponent(id)}/post`, {
    method: 'PATCH',
    body: JSON.stringify({
      postedBy: payload?.postedBy || 'Stores Officer',
      comments: payload?.comments || 'Movement posted to stock.',
    }),
  });
}

export async function rejectStockMovement(id: string, payload?: { rejectedBy?: string; reason?: string }) {
  return assetRequest<StockMovement>(`/assets/movements/${encodeURIComponent(id)}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({
      rejectedBy: payload?.rejectedBy || 'Line Manager',
      reason: payload?.reason || 'Movement rejected.',
    }),
  });
}

export async function scanAssetQrTag(tagCode: string, payload: { scannedBy: string; site: string }) {
  return assetRequest<AssetQrTag>(`/assets/qr-tags/${encodeURIComponent(tagCode)}/scan`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Production-ready scan wrapper.
 * Current backend supports QR route. RFID and barcode are captured gracefully on the frontend
 * and can be mapped to dedicated backend routes later without changing the scanner page.
 */
export async function scanAssetTag(payload: ScanAssetTagPayload) {
  if (payload.scanType === 'QR_CODE') {
    return scanAssetQrTag(payload.tagCode, {
      scannedBy: payload.scannedBy,
      site: payload.site,
    });
  }

  const rfidRoute =
    payload.scanType === 'RFID_UHF'
      ? `/assets/rfid-tags/${encodeURIComponent(payload.tagCode)}/scan`
      : `/assets/barcodes/${encodeURIComponent(payload.tagCode)}/scan`;

  const result = await assetRequest<AssetQrTag>(rfidRoute, {
    method: 'POST',
    body: JSON.stringify({
      scannedBy: payload.scannedBy,
      site: payload.site,
      scanType: payload.scanType,
    }),
  });

  if (result.ok) return result;

  return {
    ok: false,
    status: result.status,
    error:
      result.status === 404
        ? `${payload.scanType === 'RFID_UHF' ? 'RFID' : 'Barcode'} scanner endpoint is not yet active on the backend. Use QR scanning for now while the RFID backend route is added.`
        : normalizeError(result, 'Scan failed.'),
  };
}

export function createAssetImportPreview(payload: {
  sourceType: string;
  fileName?: string;
  createdBy?: string;
  csvText: string;
}) {
  return assetRequest<{ message: string; batch: AssetImportBatch }>('/assets/imports/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getAssetImportBatches() {
  return assetRequest<AssetImportBatch[]>('/assets/imports');
}

export function getAssetImportBatch(id: string) {
  return assetRequest<AssetImportBatch>(`/assets/imports/${encodeURIComponent(id)}`);
}

export function postAssetImportBatch(id: string, postedBy: string) {
  return assetRequest<{ message: string; batch: AssetImportBatch }>(
    `/assets/imports/${encodeURIComponent(id)}/post`,
    {
      method: 'POST',
      body: JSON.stringify({ postedBy }),
    },
  );
}
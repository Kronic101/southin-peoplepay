export type AssetMovementPayload = {
  movementType: string;
  stockItemId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantity: string | number;
  unitCost?: string | number;
  requestedBy: string;
  requestedByEmail?: string;
  department?: string;
  site?: string;
  projectCode?: string;
  reason?: string;
};

export type AssetStockCountPayload = {
  locationId: string;
  countedBy: string;
  notes?: string;
};

export type AssetScanResult = {
  tagCode: string;
  scannedAt: string;
  action: 'LOOKUP' | 'MOVE' | 'COUNT';
};
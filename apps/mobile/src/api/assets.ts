import { apiGet, apiPatch, apiPost } from './client';
import {
  AssetMovementPayload,
  AssetStockCountPayload,
} from '../types/assets';

export const getAssetStockItems = () => apiGet<any[]>('/assets/stock-items');

export const getAssetMovements = () => apiGet<any[]>('/assets/movements');

export const createAssetMovement = (payload: AssetMovementPayload) =>
  apiPost<any>('/assets/movements', payload);

export const getAssetStockCounts = () => apiGet<any[]>('/assets/stock-counts');

export const createAssetStockCount = (payload: AssetStockCountPayload) =>
  apiPost<any>('/assets/stock-counts', payload);

export const updateAssetStockCountLine = (
  countId: string,
  lineId: string,
  payload: any,
) => apiPatch<any>(`/assets/stock-counts/${countId}/lines/${lineId}`, payload);
'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../../components/AppShell';
import { exportToCsv } from '@/lib/csv-export';

import {
  getStockBalances,
  getStockItems,
  StockBalance,
  StockItem,
} from '@/lib/assets-api';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

type CodeMode = 'AUTO' | 'MANUAL' | 'EXTERNAL';
type InventoryControlType = 'CONSUMABLE' | 'NON_CONSUMABLE';

type ExtendedStockItem = StockItem & {
  inventoryControlType?: InventoryControlType | null;
  assetRegistrationRequired?: boolean | null;
  custodyTrackingRequired?: boolean | null;
};

type ExtendedStockBalance = StockBalance & {
  stockItem?: ExtendedStockItem | null;
};

type CreateStockForm = {
  codeMode: CodeMode;
  itemCode: string;
  externalSystem: string;
  externalItemCode: string;
  itemName: string;
  itemType: string;
  inventoryControlType: InventoryControlType;
  category: string;
  unitOfMeasure: string;
  minimumLevel: string;
  reorderLevel: string;
  standardCost: string;
  description: string;
  assetRegistrationRequired: boolean;
  custodyTrackingRequired: boolean;
  isSerialized: boolean;
  isQrTracked: boolean;
  isRfidTracked: boolean;
  allowUpdate: boolean;
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `K ${asNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || body?.error || `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return body as T;
}

const initialForm: CreateStockForm = {
  codeMode: 'AUTO',
  itemCode: '',
  externalSystem: 'OMNI_CORE',
  externalItemCode: '',
  itemName: '',
  itemType: 'OTHER',
  inventoryControlType: 'CONSUMABLE',
  category: 'General',
  unitOfMeasure: 'EA',
  minimumLevel: '0',
  reorderLevel: '0',
  standardCost: '0',
  description: '',
  assetRegistrationRequired: false,
  custodyTrackingRequired: false,
  isSerialized: false,
  isQrTracked: false,
  isRfidTracked: false,
  allowUpdate: false,
};

function controlStatusClass(isLow: boolean) {
  return isLow ? 'status-pill warning' : 'status-pill success';
}

export default function AssetStockPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ExtendedStockItem[]>([]);
  const [balances, setBalances] = useState<ExtendedStockBalance[]>([]);
  const [form, setForm] = useState<CreateStockForm>(initialForm);
  const [previewCode, setPreviewCode] = useState('');
  const [search, setSearch] = useState('');
  const [controlFilter, setControlFilter] = useState<'ALL' | InventoryControlType>('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    loadPage();
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = window.setTimeout(() => {
      previewNextCode();
    }, 350);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, form.codeMode, form.itemCode, form.externalItemCode, form.itemType, form.category]);

  function handleExportCsv() {
    const rows = items.map((item: any) => {
      const itemBalances = balances.filter((balance: any) => balance.stockItemId === item.id);
      const totalOnHand = itemBalances.reduce(
        (sum: number, balance: any) => sum + Number(balance.quantityOnHand || 0),
        0,
      );

      return {
        itemCode: item.itemCode || '',
        itemName: item.itemName || '',
        itemType: item.itemType || '',
        inventoryControlType: item.inventoryControlType || 'CONSUMABLE',
        category: item.category || '',
        unitOfMeasure: item.unitOfMeasure || '',
        minimumLevel: item.minimumLevel || 0,
        reorderLevel: item.reorderLevel || 0,
        standardCost: item.standardCost || 0,
        totalOnHand,
        assetRegistrationRequired: item.assetRegistrationRequired ? 'Yes' : 'No',
        custodyTrackingRequired: item.custodyTrackingRequired ? 'Yes' : 'No',
        isSerialized: item.isSerialized ? 'Yes' : 'No',
        isQrTracked: item.isQrTracked ? 'Yes' : 'No',
        isRfidTracked: item.isRfidTracked ? 'Yes' : 'No',
        isActive: item.isActive ? 'Yes' : 'No',
      };
    });

    exportToCsv('southin-stores-stock.csv', rows);
  }

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [stockResult, balanceResult] = await Promise.all([
        getStockItems(),
        getStockBalances(),
      ]);

      setItems(Array.isArray(stockResult) ? (stockResult as ExtendedStockItem[]) : []);
      setBalances(Array.isArray(balanceResult) ? (balanceResult as ExtendedStockBalance[]) : []);
    } catch (err: any) {
      setItems([]);
      setBalances([]);
      setError(err?.message || 'Unable to load stock data.');
    } finally {
      setLoading(false);
    }
  }

  async function previewNextCode() {
    try {
      const result = await postJson<{ itemCode: string }>('/assets/stock-items/preview-code', {
        codeMode: form.codeMode,
        itemCode: form.itemCode,
        externalItemCode: form.externalItemCode,
        externalSystem: form.externalSystem,
        itemType: form.itemType,
        category: form.category,
      });

      setPreviewCode(result.itemCode);
    } catch {
      setPreviewCode('');
    }
  }

  function updateForm<K extends keyof CreateStockForm>(key: K, value: CreateStockForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function changeInventoryControlType(value: InventoryControlType) {
    setForm((current) => ({
      ...current,
      inventoryControlType: value,
      assetRegistrationRequired:
        value === 'CONSUMABLE' ? false : current.assetRegistrationRequired,
      custodyTrackingRequired: value === 'NON_CONSUMABLE',
    }));
  }

  async function handleCreateStockItem() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.itemName.trim()) {
        throw new Error('Item name is required.');
      }

      if (form.codeMode === 'MANUAL' && !form.itemCode.trim()) {
        throw new Error('Manual item code is required.');
      }

      if (form.codeMode === 'EXTERNAL' && !form.externalItemCode.trim()) {
        throw new Error('External item code is required.');
      }

      if (form.inventoryControlType === 'CONSUMABLE' && form.assetRegistrationRequired) {
        throw new Error('A consumable item cannot require asset registration.');
      }

      const payload = {
        ...form,
        itemCode: form.codeMode === 'EXTERNAL' ? form.externalItemCode : form.itemCode,
        minimumLevel: Number(form.minimumLevel || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        standardCost: Number(form.standardCost || 0),
      };

      const created = await postJson<StockItem>('/assets/stock-items', payload);

      setMessage(`Stock item ${created.itemCode} saved successfully.`);

      setForm({
        ...initialForm,
        itemType: form.itemType,
        inventoryControlType: form.inventoryControlType,
        category: form.category,
        unitOfMeasure: form.unitOfMeasure,
        custodyTrackingRequired: form.inventoryControlType === 'NON_CONSUMABLE',
      });

      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save stock item.');
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const consumable = items.filter(
      (item) => String(item.inventoryControlType || 'CONSUMABLE').toUpperCase() === 'CONSUMABLE',
    ).length;
    const nonConsumable = items.filter(
      (item) => String(item.inventoryControlType || '').toUpperCase() === 'NON_CONSUMABLE',
    ).length;
    const controlled = items.filter(
      (item) => item.assetRegistrationRequired || item.custodyTrackingRequired,
    ).length;

    const lowStock = balances.filter((balance) => {
      const item = balance.stockItem;
      if (!item) return false;
      const min = asNumber(item.minimumLevel);
      return min > 0 && asNumber(balance.quantityOnHand) <= min;
    }).length;

    return {
      stockItems: items.length,
      balances: balances.length,
      consumable,
      nonConsumable,
      controlled,
      lowStock,
    };
  }, [items, balances]);

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      const control = String(item.inventoryControlType || 'CONSUMABLE').toUpperCase();
      if (controlFilter !== 'ALL' && control !== controlFilter) return false;
      if (!needle) return true;
      return [item.itemCode, item.itemName, item.itemType, item.category, item.unitOfMeasure]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(needle));
    });
  }, [items, search, controlFilter]);

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Stores & Inventory</p>
              <h1>Stores & Stock Register</h1>
              <p className="muted">
                Central stock master for consumable and non-consumable Stores inventory,
                controlled items, provisional balances and future physical stock-count reconciliation.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadPage}>
              Refresh
            </button>

            <button className="btn-secondary" type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>

          <div className="finance-notice warning">
            <strong>PROVISIONAL OPENING STOCK — PHYSICAL STOCKTAKE PENDING.</strong>{' '}
            Current balances are available for controlled production testing. The new physical
            stocktake will be posted through Stock Count adjustments so issue history is retained.
          </div>

          {error ? <div className="finance-notice danger">{error}</div> : null}
          {message ? <div className="finance-notice success">{message}</div> : null}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Stock Items</span>
              <strong>{summary.stockItems}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Balances</span>
              <strong>{summary.balances}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Consumable</span>
              <strong>{summary.consumable}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Non-Consumable</span>
              <strong>{summary.nonConsumable}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Asset / Custody Controlled</span>
              <strong>{summary.controlled}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Low Stock</span>
              <strong>{summary.lowStock}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Find Stock</h2>
          <div className="finance-form-grid">
            <label className="span-2">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by item code, name or category"
              />
            </label>

            <label>
              Inventory Control
              <select
                value={controlFilter}
                onChange={(event) =>
                  setControlFilter(event.target.value as 'ALL' | InventoryControlType)
                }
              >
                <option value="ALL">All stock</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="NON_CONSUMABLE">Non-Consumable</option>
              </select>
            </label>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create / Update Stock Item</h2>
          <p className="muted">
            Create new stock items while allowing existing Omni Core item codes and Southin-generated
            item code sequences.
          </p>

          <div className="finance-form-grid">
            <label>
              Code Mode
              <select
                value={form.codeMode}
                onChange={(event) => updateForm('codeMode', event.target.value as CodeMode)}
              >
                <option value="AUTO">Auto-generate Southin code</option>
                <option value="MANUAL">Manual Southin code</option>
                <option value="EXTERNAL">Existing external / Omni Core code</option>
              </select>
            </label>

            {form.codeMode === 'MANUAL' ? (
              <label>
                Manual Item Code
                <input
                  value={form.itemCode}
                  onChange={(event) => updateForm('itemCode', event.target.value)}
                  placeholder="e.g. PPE-GLOVES"
                />
              </label>
            ) : null}

            {form.codeMode === 'EXTERNAL' ? (
              <>
                <label>
                  External System
                  <select
                    value={form.externalSystem}
                    onChange={(event) => updateForm('externalSystem', event.target.value)}
                  >
                    <option value="OMNI_CORE">Omni Core</option>
                    <option value="EXCEL_IMPORT">Excel Import</option>
                    <option value="MANUAL_EXTERNAL">Manual External</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label>
                  Existing External Code
                  <input
                    value={form.externalItemCode}
                    onChange={(event) => updateForm('externalItemCode', event.target.value)}
                    placeholder="Existing Omni Core code"
                  />
                </label>
              </>
            ) : null}

            <label>
              System Code Preview
              <input value={previewCode || 'Preview unavailable'} readOnly />
            </label>

            <label>
              Item Name
              <input
                value={form.itemName}
                onChange={(event) => updateForm('itemName', event.target.value)}
                placeholder="e.g. Scaffold Standard, Safety Gloves, Brake Pads"
              />
            </label>

            <label>
              Item Type
              <select
                value={form.itemType}
                onChange={(event) => updateForm('itemType', event.target.value)}
              >
                <option value="OTHER">Other</option>
                <option value="PPE">PPE</option>
                <option value="SCAFFOLD_COMPONENT">Scaffold Component</option>
                <option value="TOOL">Tool</option>
                <option value="SPARE_PART">Workshop Spare</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="MATERIAL">Material</option>
                <option value="FUEL">Fuel</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </label>

            <label>
              Inventory Control
              <select
                value={form.inventoryControlType}
                onChange={(event) =>
                  changeInventoryControlType(event.target.value as InventoryControlType)
                }
              >
                <option value="CONSUMABLE">Consumable — used up through operations</option>
                <option value="NON_CONSUMABLE">Non-Consumable — reusable / accountable</option>
              </select>
            </label>

            <label>
              Category
              <input
                value={form.category}
                onChange={(event) => updateForm('category', event.target.value)}
                placeholder="PPE, Scaffold, Workshop, Consumable"
              />
            </label>

            <label>
              Unit of Measure
              <input
                value={form.unitOfMeasure}
                onChange={(event) => updateForm('unitOfMeasure', event.target.value)}
                placeholder="EA, PAIR, BOX, LTR"
              />
            </label>

            <label>
              Minimum Level
              <input
                type="number"
                value={form.minimumLevel}
                onChange={(event) => updateForm('minimumLevel', event.target.value)}
              />
            </label>

            <label>
              Reorder Level
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(event) => updateForm('reorderLevel', event.target.value)}
              />
            </label>

            <label>
              Standard Cost
              <input
                type="number"
                step="0.01"
                value={form.standardCost}
                onChange={(event) => updateForm('standardCost', event.target.value)}
              />
            </label>

            <label className="span-2">
              Description / Notes
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Optional stock description, business use, supplier notes, or migration remarks."
              />
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.assetRegistrationRequired}
                disabled={form.inventoryControlType === 'CONSUMABLE'}
                onChange={(event) =>
                  updateForm('assetRegistrationRequired', event.target.checked)
                }
              />
              Asset registration required
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.custodyTrackingRequired}
                disabled={form.inventoryControlType === 'CONSUMABLE'}
                onChange={(event) =>
                  updateForm('custodyTrackingRequired', event.target.checked)
                }
              />
              Custody tracking required
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isSerialized}
                onChange={(event) => updateForm('isSerialized', event.target.checked)}
              />
              Serialized item
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isQrTracked}
                onChange={(event) => updateForm('isQrTracked', event.target.checked)}
              />
              QR tracked
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isRfidTracked}
                onChange={(event) => updateForm('isRfidTracked', event.target.checked)}
              />
              RFID/UHF ready
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.allowUpdate}
                onChange={(event) => updateForm('allowUpdate', event.target.checked)}
              />
              Allow update if code exists
            </label>

            <button className="btn" type="button" disabled={saving} onClick={handleCreateStockItem}>
              {saving ? 'Saving...' : 'Save Stock Item'}
            </button>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Stock Catalogue</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Control</th>
                  <th>Category</th>
                  <th>UOM</th>
                  <th>Minimum</th>
                  <th>Reorder</th>
                  <th>Standard Cost</th>
                  <th>Asset</th>
                  <th>Custody</th>
                  <th>QR/RFID</th>
                  <th>Serialized</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={13}>
                      {loading ? 'Loading stock items...' : 'No stock items match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.itemType}</td>
                      <td>{item.inventoryControlType === 'NON_CONSUMABLE' ? 'NON-CONSUMABLE' : 'CONSUMABLE'}</td>
                      <td>{item.category}</td>
                      <td>{item.unitOfMeasure}</td>
                      <td>{asNumber(item.minimumLevel)}</td>
                      <td>{asNumber(item.reorderLevel)}</td>
                      <td>{item.standardCost ? money(item.standardCost) : '-'}</td>
                      <td>{item.assetRegistrationRequired ? 'Yes' : 'No'}</td>
                      <td>{item.custodyTrackingRequired ? 'Yes' : 'No'}</td>
                      <td>{item.isQrTracked || item.isRfidTracked ? 'Yes' : 'No'}</td>
                      <td>{item.isSerialized ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Stock Balances by Location</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Control</th>
                  <th>Location Code</th>
                  <th>Location</th>
                  <th>On Hand</th>
                  <th>Issued</th>
                  <th>Damaged</th>
                  <th>Lost</th>
                  <th>Control Status</th>
                </tr>
              </thead>

              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={10}>{loading ? 'Loading balances...' : 'No stock balances found.'}</td>
                  </tr>
                ) : (
                  balances.map((balance) => {
                    const item = balance.stockItem;
                    const location = balance.location;
                    const onHand = asNumber(balance.quantityOnHand);
                    const min = asNumber(item?.minimumLevel);
                    const reorder = asNumber(item?.reorderLevel);
                    const isOut = onHand <= 0;
                    const isLow = Boolean(item && !isOut && min > 0 && onHand <= min);
                    const isReorder = Boolean(item && !isOut && reorder > 0 && onHand <= reorder);
                    const stockStatus = isOut
                      ? 'OUT OF STOCK'
                      : isLow
                        ? 'LOW STOCK'
                        : isReorder
                          ? 'REORDER'
                          : 'IN STOCK';

                    return (
                      <tr key={balance.id}>
                        <td>{item?.itemCode || '-'}</td>
                        <td>{item?.itemName || '-'}</td>
                        <td>{item?.inventoryControlType === 'NON_CONSUMABLE' ? 'NON-CONSUMABLE' : 'CONSUMABLE'}</td>
                        <td>{location?.locationCode || '-'}</td>
                        <td>{location?.locationName || '-'}</td>
                        <td>{onHand}</td>
                        <td>{asNumber(balance.quantityIssued)}</td>
                        <td>{asNumber(balance.quantityDamaged)}</td>
                        <td>{asNumber(balance.quantityLost)}</td>
                        <td>
                          <span className={controlStatusClass(isOut || isLow || isReorder)}>
                            {stockStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

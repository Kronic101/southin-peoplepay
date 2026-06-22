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

type CreateStockForm = {
  codeMode: CodeMode;
  itemCode: string;
  externalSystem: string;
  externalItemCode: string;
  itemName: string;
  itemType: string;
  category: string;
  unitOfMeasure: string;
  minimumLevel: string;
  reorderLevel: string;
  standardCost: string;
  description: string;
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
  category: 'General',
  unitOfMeasure: 'EA',
  minimumLevel: '0',
  reorderLevel: '0',
  standardCost: '0',
  description: '',
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
  const [items, setItems] = useState<StockItem[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [form, setForm] = useState<CreateStockForm>(initialForm);
  const [previewCode, setPreviewCode] = useState('');
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
        category: item.category || '',
        unitOfMeasure: item.unitOfMeasure || '',
        minimumLevel: item.minimumLevel || 0,
        reorderLevel: item.reorderLevel || 0,
        standardCost: item.standardCost || 0,
        totalOnHand,
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

      setItems(Array.isArray(stockResult) ? stockResult : []);
      setBalances(Array.isArray(balanceResult) ? balanceResult : []);
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
        category: form.category,
        unitOfMeasure: form.unitOfMeasure,
      });

      await loadPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save stock item.');
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const qrTracked = items.filter((item) => item.isQrTracked).length;
    const serialized = items.filter((item) => item.isSerialized).length;

    const lowStock = balances.filter((balance) => {
      const item = balance.stockItem;
      if (!item) return false;

      const min = asNumber(item.minimumLevel);
      if (min <= 0) return false;

      return asNumber(balance.quantityOnHand) <= min;
    }).length;

    return {
      stockItems: items.length,
      balances: balances.length,
      qrTracked,
      serialized,
      lowStock,
    };
  }, [items, balances]);

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Stores & Stock Register</h1>
              <p className="muted">
                Central stock master for Omni Core migrated items, PPE, scaffold components,
                materials, tools, workshop spares and disposable stock. The system supports manual,
                external and generated Southin item codes.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadPage}>
              Refresh
            </button>

            <button className="btn-secondary" type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
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
              <span>QR / RFID Ready</span>
              <strong>{summary.qrTracked}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Serialized</span>
              <strong>{summary.serialized}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Low Stock</span>
              <strong>{summary.lowStock}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create Stock Item</h2>
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
                <option value="SPARE">Workshop Spare</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="MATERIAL">Material</option>
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
          <h2>Stock Items</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>UOM</th>
                  <th>Minimum</th>
                  <th>Reorder</th>
                  <th>Standard Cost</th>
                  <th>QR/RFID</th>
                  <th>Serialized</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={10}>
                      {loading ? 'Loading stock items...' : 'No stock items found.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.itemType}</td>
                      <td>{item.category}</td>
                      <td>{item.unitOfMeasure}</td>
                      <td>{asNumber(item.minimumLevel)}</td>
                      <td>{asNumber(item.reorderLevel)}</td>
                      <td>{item.standardCost ? money(item.standardCost) : '-'}</td>
                      <td>{item.isQrTracked ? 'Yes' : 'No'}</td>
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
                    <td colSpan={9}>{loading ? 'Loading balances...' : 'No stock balances found.'}</td>
                  </tr>
                ) : (
                  balances.map((balance) => {
                    const item = balance.stockItem;
                    const location = balance.location;
                    const onHand = asNumber(balance.quantityOnHand);
                    const min = asNumber(item?.minimumLevel);
                    const isLow = Boolean(item && min > 0 && onHand <= min);

                    return (
                      <tr key={balance.id}>
                        <td>{item?.itemCode || '-'}</td>
                        <td>{item?.itemName || '-'}</td>
                        <td>{location?.locationCode || '-'}</td>
                        <td>{location?.locationName || '-'}</td>
                        <td>{onHand}</td>
                        <td>{asNumber(balance.quantityIssued)}</td>
                        <td>{asNumber(balance.quantityDamaged)}</td>
                        <td>{asNumber(balance.quantityLost)}</td>
                        <td>
                          <span className={controlStatusClass(isLow)}>
                            {isLow ? 'LOW STOCK' : 'OK'}
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
'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  createAssetStockItem,
  getAssetBalances,
  getAssetStockItems,
  type StockBalanceRecord,
  type StockItemRecord,
} from '../../../lib/api';

export default function AssetStockPage() {
  const [items, setItems] = useState<StockItemRecord[]>([]);
  const [balances, setBalances] = useState<StockBalanceRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadStock() {
    setError('');

    try {
      const [stockItems, stockBalances] = await Promise.all([
        getAssetStockItems(),
        getAssetBalances(),
      ]);

      setItems(stockItems);
      setBalances(stockBalances);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock.');
    }
  }

  useEffect(() => {
    loadStock();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await createAssetStockItem({
        itemCode: String(formData.get('itemCode') || ''),
        itemName: String(formData.get('itemName') || ''),
        itemType: String(formData.get('itemType') || 'OTHER'),
        category: String(formData.get('category') || ''),
        unitOfMeasure: String(formData.get('unitOfMeasure') || 'EA'),
        minimumLevel: Number(formData.get('minimumLevel') || 0),
        reorderLevel: Number(formData.get('reorderLevel') || 0),
        standardCost: Number(formData.get('standardCost') || 0),
        isSerialized: formData.get('isSerialized') === 'on',
        isQrTracked: formData.get('isQrTracked') === 'on',
      });

      event.currentTarget.reset();
      setMessage('Stock item created successfully.');
      await loadStock();
    } catch (err: any) {
      setError(err?.message || 'Failed to create stock item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Stores & Stock Register</h1>
              <p className="muted">
                Omni Core-style stock master and balance view for stores, PPE, scaffold components,
                materials, tools and spares.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadStock} type="button">
              Refresh
            </button>
          </div>

          {message && <div className="finance-notice success">{message}</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card"><span>Stock Items</span><strong>{items.length}</strong></div>
            <div className="finance-summary-card"><span>Balances</span><strong>{balances.length}</strong></div>
            <div className="finance-summary-card"><span>QR Tracked</span><strong>{items.filter((i) => i.isQrTracked).length}</strong></div>
            <div className="finance-summary-card"><span>Serialized</span><strong>{items.filter((i) => i.isSerialized).length}</strong></div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create Stock Item</h2>

          <form className="finance-form-grid" onSubmit={handleSubmit}>
            <label>Item Code<input name="itemCode" placeholder="SCF-STANDARD" required /></label>
            <label>Item Name<input name="itemName" placeholder="Scaffold Standard" required /></label>
            <label>
              Item Type
              <select name="itemType" defaultValue="OTHER">
                <option value="SCAFFOLD_COMPONENT">Scaffold Component</option>
                <option value="PPE">PPE</option>
                <option value="TOOL">Tool</option>
                <option value="SPARE_PART">Spare Part</option>
                <option value="MATERIAL">Material</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>Category<input name="category" placeholder="Scaffold" /></label>
            <label>Unit of Measure<input name="unitOfMeasure" defaultValue="EA" /></label>
            <label>Minimum Level<input name="minimumLevel" type="number" defaultValue="0" /></label>
            <label>Reorder Level<input name="reorderLevel" type="number" defaultValue="0" /></label>
            <label>Standard Cost<input name="standardCost" type="number" step="0.01" defaultValue="0" /></label>
            <label><input name="isSerialized" type="checkbox" /> Serialized item</label>
            <label><input name="isQrTracked" type="checkbox" /> QR tracked</label>

            <button className="btn" disabled={saving} type="submit">
              {saving ? 'Creating...' : 'Create Stock Item'}
            </button>
          </form>
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
                  <th>QR</th>
                  <th>Serialized</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={9}>No stock items found.</td></tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.itemType}</td>
                      <td>{item.category || '-'}</td>
                      <td>{item.unitOfMeasure}</td>
                      <td>{String(item.minimumLevel || 0)}</td>
                      <td>{String(item.reorderLevel || 0)}</td>
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
          <h2>Stock Balances</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Location</th>
                  <th>Site</th>
                  <th>On Hand</th>
                  <th>Damaged</th>
                  <th>Lost</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr><td colSpan={7}>No stock balances found.</td></tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.id}>
                      <td>{balance.stockItem?.itemCode || '-'}</td>
                      <td>{balance.stockItem?.itemName || '-'}</td>
                      <td>{balance.location?.locationName || '-'}</td>
                      <td>{balance.location?.site || '-'}</td>
                      <td>{String(balance.quantityOnHand)}</td>
                      <td>{String(balance.quantityDamaged)}</td>
                      <td>{String(balance.quantityLost)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
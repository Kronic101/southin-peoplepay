'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import { getAssetDashboard, type AssetDashboardResponse } from '../../../lib/api';

const emptyDashboard: AssetDashboardResponse = {
  summary: {
    assets: 0,
    activeAssets: 0,
    stockItems: 0,
    locations: 0,
    movements: 0,
    pendingMovements: 0,
    qrTags: 0,
    scaffoldComponents: 0,
    availableScaffolds: 0,
    issuedScaffolds: 0,
    damagedScaffolds: 0,
  },
  lowStock: [],
};

export default function AssetDashboardPage() {
  const [data, setData] = useState<AssetDashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const response = await getAssetDashboard();
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load asset dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Asset, Stores & Scaffold Dashboard</h1>
              <p className="muted">
                Central view for stock items, site stores, scaffold components, QR tags, movements
                and low-stock alerts.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadDashboard} type="button">
              Refresh
            </button>
          </div>

          {loading && <div className="finance-notice">Loading asset dashboard...</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card"><span>Assets</span><strong>{data.summary.assets}</strong></div>
            <div className="finance-summary-card"><span>Active Assets</span><strong>{data.summary.activeAssets}</strong></div>
            <div className="finance-summary-card"><span>Stock Items</span><strong>{data.summary.stockItems}</strong></div>
            <div className="finance-summary-card"><span>Locations</span><strong>{data.summary.locations}</strong></div>
            <div className="finance-summary-card"><span>Movements</span><strong>{data.summary.movements}</strong></div>
            <div className="finance-summary-card"><span>Pending Movements</span><strong>{data.summary.pendingMovements}</strong></div>
            <div className="finance-summary-card"><span>QR Tags</span><strong>{data.summary.qrTags}</strong></div>
            <div className="finance-summary-card"><span>Scaffolds</span><strong>{data.summary.scaffoldComponents}</strong></div>
            <div className="finance-summary-card"><span>Available Scaffolds</span><strong>{data.summary.availableScaffolds}</strong></div>
            <div className="finance-summary-card"><span>Issued Scaffolds</span><strong>{data.summary.issuedScaffolds}</strong></div>
            <div className="finance-summary-card"><span>Damaged Scaffolds</span><strong>{data.summary.damagedScaffolds}</strong></div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Low Stock Alerts</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Location</th>
                  <th>Quantity On Hand</th>
                  <th>Minimum Level</th>
                </tr>
              </thead>
              <tbody>
                {data.lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No low stock alerts found.</td>
                  </tr>
                ) : (
                  data.lowStock.map((item) => (
                    <tr key={`${item.itemCode}-${item.locationCode}`}>
                      <td>{item.itemCode}</td>
                      <td>{item.itemName}</td>
                      <td>{item.locationName}</td>
                      <td>{item.quantityOnHand}</td>
                      <td>{item.minimumLevel}</td>
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
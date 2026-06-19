'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../../components/AppShell';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000/api';

type AssetDashboardResponse = {
  summary?: {
    assets?: number;
    activeAssets?: number;
    stockItems?: number;
    locations?: number;
    movements?: number;
    pendingMovements?: number;
    postedMovements?: number;
    qrTags?: number;
    scaffoldComponents?: number;
    availableScaffolds?: number;
    issuedScaffolds?: number;
    damagedScaffolds?: number;
    ledgerEntries?: number;
    financeLinkedMovements?: number;
    activeCustody?: number;
    activeDeployments?: number;
    openStockCounts?: number;
  };
  lowStock?: Array<{
    itemCode?: string;
    itemName?: string;
    locationCode?: string;
    locationName?: string;
    quantityOnHand?: number | string;
    minimumLevel?: number | string;
    reorderLevel?: number | string;
  }>;
  recentMovements?: Array<any>;
  recentQrScans?: Array<any>;
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
  });

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Request failed with status ${response.status}`);
  }

  return body as T;
}

export default function AssetDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<AssetDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<AssetDashboardResponse>('/assets/dashboard');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load asset dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    return {
      assets: asNumber(data?.summary?.assets),
      activeAssets: asNumber(data?.summary?.activeAssets),
      stockItems: asNumber(data?.summary?.stockItems),
      locations: asNumber(data?.summary?.locations),
      movements: asNumber(data?.summary?.movements),
      pendingMovements: asNumber(data?.summary?.pendingMovements),
      qrTags: asNumber(data?.summary?.qrTags),
      scaffoldComponents: asNumber(data?.summary?.scaffoldComponents),
      availableScaffolds: asNumber(data?.summary?.availableScaffolds),
      issuedScaffolds: asNumber(data?.summary?.issuedScaffolds),
      damagedScaffolds: asNumber(data?.summary?.damagedScaffolds),
      postedMovements: asNumber(data?.summary?.postedMovements),
      ledgerEntries: asNumber(data?.summary?.ledgerEntries),
      financeLinkedMovements: asNumber(data?.summary?.financeLinkedMovements),
      activeCustody: asNumber(data?.summary?.activeCustody),
      activeDeployments: asNumber(data?.summary?.activeDeployments),
      openStockCounts: asNumber(data?.summary?.openStockCounts),
    };
  }, [data]);

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Asset, Stores & Scaffold Dashboard</h1>
              <p className="muted">
                Central view for stores, scaffolds, QR/RFID tracking, stock balances, site movement
                control and low-stock alerts.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadDashboard}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {error ? <div className="finance-notice danger">{error}</div> : null}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Assets</span>
              <strong>{summary.assets}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Active Assets</span>
              <strong>{summary.activeAssets}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Stock Items</span>
              <strong>{summary.stockItems}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Locations</span>
              <strong>{summary.locations}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Movements</span>
              <strong>{summary.movements}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Pending Movements</span>
              <strong>{summary.pendingMovements}</strong>
            </div>
            <div className="finance-summary-card">
              <span>QR / RFID Tags</span>
              <strong>{summary.qrTags}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Scaffold Components</span>
              <strong>{summary.scaffoldComponents}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Available Scaffolds</span>
              <strong>{summary.availableScaffolds}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Issued Scaffolds</span>
              <strong>{summary.issuedScaffolds}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Damaged Scaffolds</span>
              <strong>{summary.damagedScaffolds}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Posted Movements</span>
              <strong>{summary.postedMovements}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Ledger Entries</span>
              <strong>{summary.ledgerEntries}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Finance Linked</span>
              <strong>{summary.financeLinkedMovements}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Active Custody</span>
              <strong>{summary.activeCustody}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Active Deployments</span>
              <strong>{summary.activeDeployments}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Open Stock Counts</span>
              <strong>{summary.openStockCounts}</strong>
            </div>
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
                  <th>Location Code</th>
                  <th>Location</th>
                  <th>On Hand</th>
                  <th>Minimum</th>
                  <th>Reorder</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {!data?.lowStock || data.lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No low stock alerts found.</td>
                  </tr>
                ) : (
                  data.lowStock.map((row, index) => (
                    <tr key={`${row.itemCode || 'item'}-${row.locationCode || 'loc'}-${index}`}>
                      <td>{row.itemCode || '-'}</td>
                      <td>{row.itemName || '-'}</td>
                      <td>{row.locationCode || '-'}</td>
                      <td>{row.locationName || '-'}</td>
                      <td>{asNumber(row.quantityOnHand)}</td>
                      <td>{asNumber(row.minimumLevel)}</td>
                      <td>{asNumber(row.reorderLevel)}</td>
                      <td>
                        <span className="status-pill warning">LOW STOCK</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Recent Stock Movements</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Movement No.</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Requested By</th>
                  <th>Reason</th>
                  <th>Posted</th>
                </tr>
              </thead>

              <tbody>
                {!data?.recentMovements || data.recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No recent movements found.</td>
                  </tr>
                ) : (
                  data.recentMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.movementNo || '-'}</td>
                      <td>{movement.movementType || '-'}</td>
                      <td>
                        <span className="status-pill">{movement.status || '-'}</span>
                      </td>
                      <td>{movement.fromLocation?.locationCode || '-'}</td>
                      <td>{movement.toLocation?.locationCode || '-'}</td>
                      <td>{movement.requestedBy || '-'}</td>
                      <td>{movement.reason || '-'}</td>
                      <td>{formatDateTime(movement.postedAt)}</td>
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
'use client';

import { AppShell } from '@/components/AppShell';
import {
  approveAssetStockCount,
  createAssetStockCount,
  getAssetLocations,
  getAssetStockCounts,
} from '@/lib/assets-api';
import { useEffect, useMemo, useState } from 'react';

type StockCountSession = any;
type StockLocation = any;

function formatDate(value: unknown) {
  if (!value) return '-';

  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (['APPROVED', 'POSTED', 'CLOSED'].includes(status)) return 'badge success';
  if (['DRAFT', 'OPEN', 'PENDING'].includes(status)) return 'badge warning';

  return 'badge';
}

function handleExportCsv() {
  const rows = sessions.flatMap((session: any) => {
    if (!session.lines?.length) {
      return [
        {
          sessionNo: session.sessionNo || '',
          status: session.status || '',
          location: session.location?.locationCode || '',
          countedBy: session.countedBy || '',
          approvedBy: session.approvedBy || '',
          createdAt: session.createdAt || '',
          stockItemCode: '',
          stockItemName: '',
          systemQuantity: '',
          countedQuantity: '',
          varianceQuantity: '',
        },
      ];
    }

    return session.lines.map((line: any) => ({
      sessionNo: session.sessionNo || '',
      status: session.status || '',
      location: session.location?.locationCode || '',
      countedBy: session.countedBy || '',
      approvedBy: session.approvedBy || '',
      createdAt: session.createdAt || '',
      stockItemCode: line.stockItem?.itemCode || '',
      stockItemName: line.stockItem?.itemName || '',
      systemQuantity: line.systemQuantity || 0,
      countedQuantity: line.countedQuantity || 0,
      varianceQuantity: line.varianceQuantity || 0,
      notes: line.notes || '',
    }));
  });

  exportToCsv('southin-stock-counts.csv', rows);
}

export default function AssetStockCountsPage() {
  const [sessions, setSessions] = useState<StockCountSession[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [countedBy, setCountedBy] = useState('Asset Manager');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [countData, locationData] = await Promise.all([
        getAssetStockCounts(),
        getAssetLocations(),
      ]);

      setSessions(Array.isArray(countData) ? countData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock count data.');
      setSessions([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const summary = useMemo(() => {
    const total = sessions.length;
    const draft = sessions.filter((item) => item.status === 'DRAFT').length;
    const approved = sessions.filter((item) => item.status === 'APPROVED').length;
    const totalLines = sessions.reduce(
      (sum, session) => sum + Number(session.lines?.length || 0),
      0,
    );

    return {
      total,
      draft,
      approved,
      totalLines,
    };
  }, [sessions]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!locationId) {
        setError('Please select a location before creating a stock count.');
        return;
      }

      await createAssetStockCount({
        locationId,
        countedBy,
        notes,
      });

      setMessage('Stock count session created successfully.');
      setNotes('');
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create stock count session.');
    }
  }

  async function handleApprove(session: StockCountSession) {
    setMessage('');
    setError('');

    try {
      await approveAssetStockCount(session.id, {
        approvedBy: countedBy || 'Asset Manager',
      });

      setMessage(`Stock count ${session.sessionNo} approved.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve stock count.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stock Counts</h1>
            <p className="muted">
              Physical stock verification sessions for stores, PPE, scaffold components and
              operational stock balances.
            </p>
          </div>

          <button className="btn-secondary" type="button" onClick={loadPage}>
            Refresh
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Counts</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="metric-card">
            <span>Draft</span>
            <strong>{summary.draft}</strong>
          </div>

          <div className="metric-card">
            <span>Approved</span>
            <strong>{summary.approved}</strong>
          </div>

          <div className="metric-card">
            <span>Count Lines</span>
            <strong>{summary.totalLines}</strong>
          </div>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Create Stock Count</h2>
              <p className="muted">
                Select a location. The system will prepare count lines from existing stock balances.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Location
              <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Counted By
              <input value={countedBy} onChange={(event) => setCountedBy(event.target.value)} />
            </label>

            <label className="full-span">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional stock count notes, variance comments, or audit remarks."
              />
            </label>

            <div className="form-actions full-span">
              <button className="btn" type="submit">
                Create Stock Count
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Stock Count Register</h2>
              <p className="muted">
                Count sessions support audit control before stock adjustments are posted.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Session No.</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Counted By</th>
                  <th>Lines</th>
                  <th>Approved By</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      {loading ? 'Loading stock counts...' : 'No stock count sessions found.'}
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.sessionNo}</td>
                      <td>
                        <span className={statusClass(session.status)}>{session.status}</span>
                      </td>
                      <td>
                        {session.location?.locationCode || '-'}
                        <br />
                        <span className="muted">{session.location?.locationName || ''}</span>
                      </td>
                      <td>{session.countedBy || '-'}</td>
                      <td>{session.lines?.length || 0}</td>
                      <td>{session.approvedBy || '-'}</td>
                      <td>{formatDate(session.createdAt)}</td>
                      <td>
                        {session.status === 'DRAFT' ? (
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => handleApprove(session)}
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="muted">No action</span>
                        )}
                      </td>
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
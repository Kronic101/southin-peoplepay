'use client';

import { AppShell } from '@/components/AppShell';
import { exportToCsv } from '@/lib/csv-export';
import {
  approveAssetStockCount,
  createAssetStockCount,
  getAssetLocations,
  getAssetStockCounts,
  postAssetStockCountAdjustment,
  updateAssetStockCountLine,
} from '@/lib/assets-api';
import { Fragment, useEffect, useMemo, useState } from 'react';

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

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (['APPROVED', 'POSTED', 'CLOSED'].includes(status)) return 'badge success';
  if (['DRAFT', 'OPEN', 'PENDING'].includes(status)) return 'badge warning';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'badge danger';

  return 'badge';
}

function varianceClass(value: number) {
  if (value === 0) return 'badge success';
  if (value > 0) return 'badge warning';
  return 'badge danger';
}

export default function AssetStockCountsPage() {
  const [sessions, setSessions] = useState<StockCountSession[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [locationId, setLocationId] = useState('');
  const [countedBy, setCountedBy] = useState('Asset Manager');
  const [notes, setNotes] = useState('');

  const [expandedSessionId, setExpandedSessionId] = useState('');
  const [lineDrafts, setLineDrafts] = useState<
    Record<string, { countedQuantity: string; notes: string }>
  >({});
  const [postingAdjustmentId, setPostingAdjustmentId] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    const draft = sessions.filter((item) => ['DRAFT', 'OPEN'].includes(item.status)).length;
    const approved = sessions.filter((item) => item.status === 'APPROVED').length;
    const posted = sessions.filter((item) => item.status === 'POSTED').length;
    const totalLines = sessions.reduce(
      (sum, session) => sum + Number(session.lines?.length || 0),
      0,
    );

    return {
      total,
      draft,
      approved,
      posted,
      totalLines,
    };
  }, [sessions]);

  function handleExportCsv() {
    const rows = sessions.flatMap((session: any) => {
      if (!session.lines?.length) {
        return [
          {
            sessionNo: session.sessionNo || session.countNo || '',
            status: session.status || '',
            locationCode: session.location?.locationCode || '',
            locationName: session.location?.locationName || '',
            countedBy: session.countedBy || session.startedBy || '',
            approvedBy: session.approvedBy || '',
            createdAt: session.createdAt || '',
            stockItemCode: '',
            stockItemName: '',
            systemQuantity: '',
            countedQuantity: '',
            varianceQuantity: '',
            notes: session.notes || '',
          },
        ];
      }

      return session.lines.map((line: any) => ({
        sessionNo: session.sessionNo || session.countNo || '',
        status: session.status || '',
        locationCode: session.location?.locationCode || '',
        locationName: session.location?.locationName || '',
        countedBy: session.countedBy || session.startedBy || '',
        approvedBy: session.approvedBy || '',
        createdAt: session.createdAt || '',
        stockItemCode: line.stockItem?.itemCode || '',
        stockItemName: line.stockItem?.itemName || '',
        systemQuantity: line.systemQuantity || 0,
        countedQuantity: line.countedQuantity || 0,
        varianceQuantity: asNumber(line.countedQuantity) - asNumber(line.systemQuantity),
        notes: line.notes || '',
      }));
    });

    exportToCsv('southin-stock-counts.csv', rows);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!locationId) {
        setError('Please select a location before creating a stock count.');
        return;
      }

      setSaving(true);

      const created = await createAssetStockCount({
        locationId,
        countedBy,
        notes,
      });

      setLocationId('');
      setNotes('');
      setExpandedSessionId(created?.id || '');

      setMessage(
        `Stock count ${created?.sessionNo || created?.countNo || 'session'} has been created successfully.`,
      );

      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create stock count session.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(session: StockCountSession) {
    setMessage('');
    setError('');

    try {
      await approveAssetStockCount(session.id, {
        approvedBy: countedBy || 'Asset Manager',
      });

      setMessage(`Stock count ${session.sessionNo || session.countNo} approved.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve stock count.');
    }
  }

  function prepareLineDrafts(session: any) {
    const drafts: Record<string, { countedQuantity: string; notes: string }> = {};

    (session.lines || []).forEach((line: any) => {
      drafts[line.id] = {
        countedQuantity: String(line.countedQuantity ?? line.systemQuantity ?? 0),
        notes: line.notes || '',
      };
    });

    setLineDrafts((current) => ({
      ...current,
      ...drafts,
    }));
  }

  function toggleSession(session: any) {
    if (expandedSessionId === session.id) {
      setExpandedSessionId('');
      return;
    }

    prepareLineDrafts(session);
    setExpandedSessionId(session.id);
  }

  function updateLineDraft(lineId: string, key: 'countedQuantity' | 'notes', value: string) {
    setLineDrafts((current) => ({
      ...current,
      [lineId]: {
        countedQuantity: current[lineId]?.countedQuantity || '0',
        notes: current[lineId]?.notes || '',
        [key]: value,
      },
    }));
  }

  async function handleSaveCountLine(session: any, line: any) {
    setError('');
    setMessage('');

    try {
      const draft = lineDrafts[line.id] || {
        countedQuantity: String(line.countedQuantity ?? line.systemQuantity ?? 0),
        notes: line.notes || '',
      };

      await updateAssetStockCountLine(session.id, line.id, {
        countedQuantity: Number(draft.countedQuantity || 0),
        notes: draft.notes,
      });

      setMessage(`Stock count line for ${line.stockItem?.itemCode || 'item'} updated.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to update stock count line.');
    }
  }

  async function handlePostAdjustment(session: any) {
    setError('');
    setMessage('');
    setPostingAdjustmentId(session.id);

    try {
      const result = await postAssetStockCountAdjustment(session.id, {
        postedBy: countedBy || 'Asset Manager',
      });

      setMessage(result?.message || `Stock count ${session.sessionNo || session.countNo} adjustment posted.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to post stock count adjustment.');
    } finally {
      setPostingAdjustmentId('');
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
              Physical stock verification sessions, counted quantities, variance review and
              adjustment posting.
            </p>
          </div>

          <div className="action-row">
            <button className="btn-secondary" type="button" onClick={loadPage}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>

            <button className="btn-secondary" type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Counts</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="metric-card">
            <span>Draft / Open</span>
            <strong>{summary.draft}</strong>
          </div>

          <div className="metric-card">
            <span>Approved</span>
            <strong>{summary.approved}</strong>
          </div>

          <div className="metric-card">
            <span>Posted</span>
            <strong>{summary.posted}</strong>
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
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Creating...' : 'Create Stock Count'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Stock Count Register</h2>
              <p className="muted">
                View count sessions, enter counted quantities, approve counts and post variance
                adjustments.
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
                    <Fragment key={session.id}>
                      <tr>
                        <td>{session.sessionNo || session.countNo}</td>
                        <td>
                          <span className={statusClass(session.status)}>{session.status}</span>
                        </td>
                        <td>
                          {session.location?.locationCode || '-'}
                          <br />
                          <span className="muted">{session.location?.locationName || ''}</span>
                        </td>
                        <td>{session.countedBy || session.startedBy || '-'}</td>
                        <td>{session.lines?.length || 0}</td>
                        <td>{session.approvedBy || '-'}</td>
                        <td>{formatDate(session.createdAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => toggleSession(session)}
                            >
                              {expandedSessionId === session.id ? 'Hide Lines' : 'View Lines'}
                            </button>

                            {['DRAFT', 'OPEN'].includes(session.status) ? (
                              <button
                                className="btn-secondary"
                                type="button"
                                onClick={() => handleApprove(session)}
                              >
                                Approve
                              </button>
                            ) : null}

                            {session.status === 'APPROVED' ? (
                              <button
                                className="btn"
                                type="button"
                                disabled={postingAdjustmentId === session.id}
                                onClick={() => handlePostAdjustment(session)}
                              >
                                {postingAdjustmentId === session.id
                                  ? 'Posting...'
                                  : 'Post Adjustment'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {expandedSessionId === session.id ? (
                        <tr>
                          <td colSpan={8}>
                            <div className="soft-card">
                              <h3>Stock Count Lines</h3>
                              <p className="muted">
                                Enter the physical counted quantity. Variance is calculated
                                immediately before approval and adjustment posting.
                              </p>

                              <div className="table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Item Code</th>
                                      <th>Item Name</th>
                                      <th>System Qty</th>
                                      <th>Counted Qty</th>
                                      <th>Variance</th>
                                      <th>Notes</th>
                                      <th>Action</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {!session.lines?.length ? (
                                      <tr>
                                        <td colSpan={7}>
                                          No stock count lines found for this session.
                                        </td>
                                      </tr>
                                    ) : (
                                      session.lines.map((line: any) => {
                                        const draft = lineDrafts[line.id] || {
                                          countedQuantity: String(
                                            line.countedQuantity ?? line.systemQuantity ?? 0,
                                          ),
                                          notes: line.notes || '',
                                        };

                                        const systemQty = asNumber(line.systemQuantity);
                                        const countedQty = asNumber(draft.countedQuantity);
                                        const variance = countedQty - systemQty;
                                        const editable = ['DRAFT', 'OPEN'].includes(session.status);

                                        return (
                                          <tr key={line.id}>
                                            <td>{line.stockItem?.itemCode || '-'}</td>
                                            <td>{line.stockItem?.itemName || '-'}</td>
                                            <td>{systemQty}</td>
                                            <td>
                                              <input
                                                type="number"
                                                value={draft.countedQuantity}
                                                disabled={!editable}
                                                onChange={(event) =>
                                                  updateLineDraft(
                                                    line.id,
                                                    'countedQuantity',
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                            </td>
                                            <td>
                                              <span className={varianceClass(variance)}>
                                                {variance}
                                              </span>
                                            </td>
                                            <td>
                                              <input
                                                value={draft.notes}
                                                disabled={!editable}
                                                placeholder="Variance notes"
                                                onChange={(event) =>
                                                  updateLineDraft(
                                                    line.id,
                                                    'notes',
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                            </td>
                                            <td>
                                              {editable ? (
                                                <button
                                                  className="btn-secondary"
                                                  type="button"
                                                  onClick={() => handleSaveCountLine(session, line)}
                                                >
                                                  Save
                                                </button>
                                              ) : (
                                                <span className="muted">Locked</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
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
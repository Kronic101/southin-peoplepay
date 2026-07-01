'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { exportToCsv } from '@/lib/csv-export';
import {
  createAssetMovement,
  getAssetLocations,
  getAssetMovements,
  getAssetStockItems,
  postAssetMovement,
} from '@/lib/assets-api';

const initialForm = {
  movementType: 'ISSUE',
  stockItemId: '',
  fromLocationId: '',
  toLocationId: '',
  quantity: '1',
  unitCost: '0',
  requestedBy: 'Asset Manager',
  requestedByEmail: 'assets@southincon.com',
  department: 'Operations',
  site: 'Kitwe Main Distribution Centre',
  branch: 'KMDC',
  projectCode: '',
  reason: '',
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

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (['APPROVED', 'POSTED', 'COMPLETE', 'LINKED', 'NOT_REQUIRED'].includes(status)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'FAILED', 'APPROVER_NOT_CONFIGURED', 'MISSING'].includes(status)) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

function locationName(location?: any) {
  if (!location) return '-';
  return location.locationCode || location.locationName || '-';
}

function movementValue(movement: any) {
  return (movement.lines || []).reduce((sum: number, line: any) => {
    const total = asNumber(line.totalCost);
    return sum + (total > 0 ? total : asNumber(line.quantity) * asNumber(line.unitCost));
  }, 0);
}

function movementLineCount(movement: any) {
  return movement.lines?.length || 0;
}

function isApproved(movement: any) {
  return String(movement.status || '').toUpperCase() === 'APPROVED';
}

function isPosted(movement: any) {
  return String(movement.status || '').toUpperCase() === 'POSTED';
}

function normaliseMovementResult(result: any) {
  return result?.movement || result;
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [movementData, itemData, locationData] = await Promise.all([
        getAssetMovements(),
        getAssetStockItems(),
        getAssetLocations(),
      ]);

      const safeMovements = Array.isArray(movementData) ? movementData : [];
      const safeItems = Array.isArray(itemData) ? itemData : [];
      const safeLocations = Array.isArray(locationData) ? locationData : [];

      setMovements(safeMovements);
      setItems(safeItems);
      setLocations(safeLocations);

      setForm((current) => ({
        ...current,
        stockItemId: current.stockItemId || safeItems?.[0]?.id || '',
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load asset movement data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const summary = useMemo(() => {
    return {
      total: movements.length,
      submitted: movements.filter((item) => item.status === 'SUBMITTED').length,
      approved: movements.filter((item) => item.status === 'APPROVED').length,
      posted: movements.filter((item) => item.status === 'POSTED').length,
      rejected: movements.filter((item) => item.status === 'REJECTED').length,
      missingApprover: movements.filter((item) => item.status === 'APPROVER_NOT_CONFIGURED').length,
      value: movements.reduce((sum, item) => sum + movementValue(item), 0),
    };
  }, [movements]);

  function updateForm(key: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleExportCsv() {
    exportToCsv(
      'southin-asset-movements.csv',
      movements.map((movement) => ({
        movementNo: movement.movementNo || '',
        movementType: movement.movementType || '',
        status: movement.status || '',
        approvalRequestId: movement.approvalRequestId || '',
        ledgerStatus: movement.ledgerStatus || '',
        financeStatus: movement.financeStatus || '',
        fromLocation: movement.fromLocation?.locationCode || '',
        toLocation: movement.toLocation?.locationCode || '',
        requestedBy: movement.requestedBy || '',
        requestedByEmail: movement.requestedByEmail || '',
        site: movement.site || '',
        branch: movement.branch || '',
        reason: movement.reason || '',
        value: movementValue(movement),
        createdAt: movement.createdAt || '',
      })),
    );
  }

  async function handleCreateMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.stockItemId) throw new Error('Please select a stock item.');

      const selectedItem = items.find((item) => item.id === form.stockItemId);
      const movementType = form.movementType.toUpperCase();
      const quantity = asNumber(form.quantity);
      const unitCost = asNumber(form.unitCost || selectedItem?.standardCost || selectedItem?.standardUnitCost || 0);

      if (quantity <= 0) throw new Error('Quantity must be greater than zero.');

      const needsFrom = ['ISSUE', 'TRANSFER', 'DAMAGE', 'LOSS', 'WRITE_OFF', 'WORKSHOP_ISSUE', 'SCAFFOLD_ISSUE'].includes(movementType);
      const needsTo = ['RECEIPT', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'SCAFFOLD_RETURN'].includes(movementType);

      if (needsFrom && !form.fromLocationId) throw new Error('Please select the From Location.');
      if (needsTo && !form.toLocationId) throw new Error('Please select the To Location.');

      const created = await createAssetMovement({
        movementType,
        fromLocationId: form.fromLocationId || undefined,
        toLocationId: form.toLocationId || undefined,
        requestedBy: form.requestedBy,
        requestedByEmail: form.requestedByEmail,
        department: form.department,
        site: form.site,
        branch: form.branch,
        projectCode: form.projectCode || undefined,
        reason: form.reason || `Asset ${movementType.toLowerCase()} request`,
        lines: [
          {
            stockItemId: form.stockItemId,
            quantity,
            unitCost,
          },
        ],
      });

      const movement = normaliseMovementResult(created);
      setMessage(`${movement.movementNo || 'Asset movement'} submitted to the approval workflow.`);
      setForm((current) => ({ ...initialForm, stockItemId: current.stockItemId }));
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create movement.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePostMovement(movement: any) {
    setPostingId(movement.id);
    setMessage('');
    setError('');

    try {
      const result = await (postAssetMovement as any)(movement.id, {
        postedBy: 'Asset Manager',
      });

      const updated = normaliseMovementResult(result);
      setMessage(`${updated.movementNo || movement.movementNo} posted. Ledger has been updated.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to post asset movement.');
    } finally {
      setPostingId('');
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Asset Movements</h1>
            <p className="muted">
              Create stock movements, route them through the approval chain, then post approved movements into the stock ledger.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">Approval Inbox</Link>
            <Link className="btn-secondary" href="/assets/ledger">Ledger</Link>
            <button className="btn-secondary" type="button" onClick={loadPage}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Movements</span><strong>{summary.total}</strong></div>
          <div className="finance-summary-card"><span>Submitted</span><strong>{summary.submitted}</strong></div>
          <div className="finance-summary-card"><span>Approved</span><strong>{summary.approved}</strong></div>
          <div className="finance-summary-card"><span>Posted</span><strong>{summary.posted}</strong></div>
          <div className="finance-summary-card"><span>Rejected</span><strong>{summary.rejected}</strong></div>
          <div className="finance-summary-card"><span>Missing Approver</span><strong>{summary.missingApprover}</strong></div>
          <div className="finance-summary-card"><span>Total Value</span><strong>{money(summary.value)}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Submit Asset Movement</h2>

          <form className="finance-form-grid" onSubmit={handleCreateMovement}>
            <label>
              Movement Type
              <select value={form.movementType} onChange={(event) => updateForm('movementType', event.target.value)}>
                <option value="ISSUE">Issue</option>
                <option value="RECEIPT">Receipt</option>
                <option value="TRANSFER">Transfer</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss</option>
                <option value="WRITE_OFF">Write-off</option>
                <option value="WORKSHOP_ISSUE">Workshop Issue</option>
                <option value="SCAFFOLD_ISSUE">Scaffold Issue</option>
                <option value="SCAFFOLD_RETURN">Scaffold Return</option>
              </select>
            </label>

            <label>
              Stock Item
              <select value={form.stockItemId} onChange={(event) => updateForm('stockItemId', event.target.value)}>
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.itemCode} - {item.itemName}</option>
                ))}
              </select>
            </label>

            <label>
              From Location
              <select value={form.fromLocationId} onChange={(event) => updateForm('fromLocationId', event.target.value)}>
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.locationCode} - {location.locationName}</option>
                ))}
              </select>
            </label>

            <label>
              To Location
              <select value={form.toLocationId} onChange={(event) => updateForm('toLocationId', event.target.value)}>
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>{location.locationCode} - {location.locationName}</option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={(event) => updateForm('quantity', event.target.value)} />
            </label>

            <label>
              Unit Cost
              <input type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => updateForm('unitCost', event.target.value)} />
            </label>

            <label>
              Requested By
              <input value={form.requestedBy} onChange={(event) => updateForm('requestedBy', event.target.value)} />
            </label>

            <label>
              Requester Email
              <input value={form.requestedByEmail} onChange={(event) => updateForm('requestedByEmail', event.target.value)} />
            </label>

            <label>
              Department
              <input value={form.department} onChange={(event) => updateForm('department', event.target.value)} />
            </label>

            <label>
              Site
              <input value={form.site} onChange={(event) => updateForm('site', event.target.value)} />
            </label>

            <label>
              Branch
              <input value={form.branch} onChange={(event) => updateForm('branch', event.target.value)} />
            </label>

            <label>
              Project Code
              <input value={form.projectCode} onChange={(event) => updateForm('projectCode', event.target.value)} placeholder="Optional" />
            </label>

            <label className="full-span">
              Reason
              <textarea value={form.reason} onChange={(event) => updateForm('reason', event.target.value)} placeholder="Reason for issue, return, transfer, loss, damage or write-off." />
            </label>

            <div className="form-actions full-span">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit for Approval'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Movement Register</h2>
              <p className="muted">Approval status, ledger posting and finance link are visible for audit control.</p>
            </div>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Movement</th>
                  <th>Type</th>
                  <th>Approval</th>
                  <th>Ledger</th>
                  <th>Finance</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Requester</th>
                  <th>Site</th>
                  <th>Value</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!movements.length ? (
                  <tr><td colSpan={12}>{loading ? 'Loading movements...' : 'No movements found.'}</td></tr>
                ) : (
                  movements.map((movement) => {
                    const canPost = isApproved(movement);
                    const posted = isPosted(movement);
                    const hasApproval = Boolean(movement.approvalRequestId);

                    return (
                      <tr key={movement.id}>
                        <td>
                          <strong>{movement.movementNo || '-'}</strong><br />
                          <span className="muted">{movement.id}</span>
                        </td>
                        <td>{cleanStatus(movement.movementType)}</td>
                        <td>
                          <span className={statusClass(movement.status)}>{cleanStatus(movement.status)}</span><br />
                          <span className="muted">{movement.approvalRequestId || 'No approval link'}</span>
                        </td>
                        <td><span className={statusClass(movement.ledgerStatus)}>{cleanStatus(movement.ledgerStatus)}</span></td>
                        <td>
                          <span className={statusClass(movement.financeStatus || 'PENDING')}>{cleanStatus(movement.financeStatus || 'PENDING')}</span><br />
                          <span className="muted">{movement.financeExpenseNo || movement.financeExpense?.expenseNo || movement.financeExpenseId || '-'}</span>
                        </td>
                        <td>{locationName(movement.fromLocation)}</td>
                        <td>{locationName(movement.toLocation)}</td>
                        <td>{movement.requestedBy || '-'}</td>
                        <td>{movement.site || '-'}</td>
                        <td>{money(movementValue(movement))}</td>
                        <td>{formatDate(movement.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            <Link className="btn-secondary" href={`/assets/movements/${movement.id}`}>View</Link>
                            {hasApproval && !canPost && !posted ? <Link className="btn-secondary" href="/approvals/inbox">Open Approval</Link> : null}
                            {canPost ? (
                              <button className="btn" type="button" disabled={postingId === movement.id} onClick={() => handlePostMovement(movement)}>
                                {postingId === movement.id ? 'Posting...' : 'Post'}
                              </button>
                            ) : null}
                            {posted ? <span className="status-pill success">Posted</span> : null}
                            {!hasApproval && !posted ? <span className="status-pill warning">Approval not linked</span> : null}
                          </div>
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

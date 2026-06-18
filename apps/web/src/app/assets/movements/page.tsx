'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  approveAssetMovement,
  createAssetMovement,
  getAssetLocations,
  getAssetMovements,
  getAssetStockItems,
  postAssetMovement,
  StockItemRecord,
  StockLocationRecord,
  StockMovementRecord,
} from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';

type MovementForm = {
  movementType: string;
  stockItemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: string;
  unitCost: string;
  requestedBy: string;
  requestedByEmail: string;
  department: string;
  site: string;
  projectCode: string;
  reason: string;
};

const defaultForm: MovementForm = {
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

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (
    status === 'POSTED' ||
    status === 'APPROVED' ||
    status === 'LINKED' ||
    status === 'NOT_REQUIRED'
  ) {
    return 'status-pill success';
  }

  if (status === 'REJECTED' || status === 'MISSING') {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

function displayLocation(location?: StockLocationRecord | null) {
  if (!location) return '-';
  return location.locationName || location.locationCode || '-';
}

function getMovementValue(movement: StockMovementRecord) {
  return (movement.lines || []).reduce((total, line) => {
    return total + asNumber(line.totalCost || asNumber(line.quantity) * asNumber(line.unitCost));
  }, 0);
}

function normalisePostResult(result: any): StockMovementRecord {
  return result?.movement || result;
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [items, setItems] = useState<StockItemRecord[]>([]);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [form, setForm] = useState<MovementForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPage() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const [movementData, itemData, locationData] = await Promise.all([
        getAssetMovements(),
        getAssetStockItems(),
        getAssetLocations(),
      ]);

      setMovements(movementData || []);
      setItems(itemData || []);
      setLocations(locationData || []);

      setForm((current) => ({
        ...current,
        stockItemId: current.stockItemId || itemData?.[0]?.id || '',
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load stock movement data.');
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
      ledgerPosted: movements.filter((item) => item.ledgerStatus === 'POSTED').length,
      financeLinked: movements.filter((item) => item.financeStatus === 'LINKED').length,
      rejected: movements.filter((item) => item.status === 'REJECTED').length,
    };
  }, [movements]);

  function updateForm(key: keyof MovementForm, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleCreateMovement() {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (!form.stockItemId) {
        throw new Error('Please select a stock item.');
      }

      const selectedItem = items.find((item) => item.id === form.stockItemId);
      const movementType = form.movementType.toUpperCase();

      const needsFrom = [
        'ISSUE',
        'TRANSFER',
        'DAMAGE',
        'LOSS',
        'WRITE_OFF',
        'WORKSHOP_ISSUE',
        'SCAFFOLD_ISSUE',
      ].includes(movementType);

      const needsTo = [
        'RECEIPT',
        'RETURN',
        'TRANSFER',
        'ADJUSTMENT',
        'SCAFFOLD_RETURN',
      ].includes(movementType);

      if (needsFrom && !form.fromLocationId) {
        throw new Error('Please select the From Location.');
      }

      if (needsTo && !form.toLocationId) {
        throw new Error('Please select the To Location.');
      }

      const quantity = asNumber(form.quantity);
      const unitCost = asNumber(form.unitCost || selectedItem?.standardCost || 0);

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than zero.');
      }

      const created = await createAssetMovement({
        movementType,
        fromLocationId: form.fromLocationId || undefined,
        toLocationId: form.toLocationId || undefined,
        requestedBy: form.requestedBy,
        requestedByEmail: form.requestedByEmail,
        department: form.department,
        site: form.site,
        projectCode: form.projectCode || undefined,
        reason: form.reason || `Stock ${movementType.toLowerCase()} request`,
        lines: [
          {
            stockItemId: form.stockItemId,
            quantity,
            unitCost,
          },
        ],
      });

      setMovements((current) => [created, ...current]);
      setMessage(`Movement ${created.movementNo} created successfully.`);
      setForm((current) => ({
        ...defaultForm,
        stockItemId: current.stockItemId,
      }));
    } catch (err: any) {
      setError(err?.message || 'Failed to create movement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(movement: StockMovementRecord) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const updated = await approveAssetMovement(movement.id, form.requestedBy || 'Asset Manager');

      setMovements((current) =>
        current.map((item) => (item.id === movement.id ? updated : item)),
      );

      setMessage(`Movement ${updated.movementNo} approved.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to approve movement.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(movement: StockMovementRecord) {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const result = await postAssetMovement(movement.id, form.requestedBy || 'Asset Manager');
      const updated = normalisePostResult(result);

      setMovements((current) =>
        current.map((item) => (item.id === movement.id ? updated : item)),
      );

      setMessage(result?.message || `Movement ${updated.movementNo} posted.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to post movement.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stock Movement Control</h1>
            <p className="muted">
              Create, approve and post stock receipts, issues, transfers, returns, damages,
              losses and write-offs. Posted movements update balances, stock ledger and finance
              records where required.
            </p>
          </div>

          <button className="dark-button" type="button" onClick={loadPage} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}
        {message ? <div className="success-banner">{message}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Total Movements</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="metric-card">
            <span>Submitted</span>
            <strong>{summary.submitted}</strong>
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
            <span>Ledger Posted</span>
            <strong>{summary.ledgerPosted}</strong>
          </div>

          <div className="metric-card">
            <span>Finance Linked</span>
            <strong>{summary.financeLinked}</strong>
          </div>

          <div className="metric-card">
            <span>Rejected</span>
            <strong>{summary.rejected}</strong>
          </div>
        </div>

        <div className="finance-card">
          <h2>Create Movement Request</h2>
          <p className="muted">
            High-value issues and write-offs should follow end-user, line manager, branch/site
            manager and director control before posting.
          </p>

          <div className="form-grid">
            <label>
              Movement Type
              <select
                value={form.movementType}
                onChange={(event) => updateForm('movementType', event.target.value)}
              >
                <option value="RECEIPT">Receipt</option>
                <option value="ISSUE">Issue</option>
                <option value="TRANSFER">Transfer</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss</option>
                <option value="WRITE_OFF">Write-off</option>
                <option value="WORKSHOP_ISSUE">Workshop Issue</option>
                <option value="SCAFFOLD_ISSUE">Scaffold Issue</option>
                <option value="SCAFFOLD_RETURN">Scaffold Return</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </label>

            <label>
              Stock Item
              <select
                value={form.stockItemId}
                onChange={(event) => updateForm('stockItemId', event.target.value)}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemCode} - {item.itemName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              From Location
              <select
                value={form.fromLocationId}
                onChange={(event) => updateForm('fromLocationId', event.target.value)}
              >
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              To Location
              <select
                value={form.toLocationId}
                onChange={(event) => updateForm('toLocationId', event.target.value)}
              >
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Quantity
              <input
                value={form.quantity}
                onChange={(event) => updateForm('quantity', event.target.value)}
                type="number"
                min="1"
              />
            </label>

            <label>
              Unit Cost / Value
              <input
                value={form.unitCost}
                onChange={(event) => updateForm('unitCost', event.target.value)}
                type="number"
                min="0"
              />
            </label>

            <label>
              Requested By
              <input
                value={form.requestedBy}
                onChange={(event) => updateForm('requestedBy', event.target.value)}
              />
            </label>

            <label>
              Requester Email
              <input
                value={form.requestedByEmail}
                onChange={(event) => updateForm('requestedByEmail', event.target.value)}
              />
            </label>

            <label>
              Department
              <input
                value={form.department}
                onChange={(event) => updateForm('department', event.target.value)}
              />
            </label>

            <label>
              Site / Branch
              <input value={form.site} onChange={(event) => updateForm('site', event.target.value)} />
            </label>

            <label>
              Project Code
              <input
                value={form.projectCode}
                onChange={(event) => updateForm('projectCode', event.target.value)}
                placeholder="Optional"
              />
            </label>

            <label className="form-grid-wide">
              Reason
              <textarea
                value={form.reason}
                onChange={(event) => updateForm('reason', event.target.value)}
                placeholder="Reason for stock issue, transfer, return, loss, damage or write-off."
              />
            </label>
          </div>

          <div className="action-row">
            <button
              className="orange-button"
              type="button"
              onClick={handleCreateMovement}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Create Movement Request'}
            </button>
          </div>
        </div>

        <div className="finance-card">
          <h2>Movement Register</h2>
          <p className="muted">
            Approval, ledger and finance status are shown together for audit control.
          </p>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Movement No.</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Ledger</th>
                  <th>Finance</th>
                  <th>Finance Ref</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Requested By</th>
                  <th>Site</th>
                  <th>Reason</th>
                  <th>Lines</th>
                  <th>Value</th>
                  <th>Actions</th>
                  <th>Receipt</th>
                </tr>
              </thead>

              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={15}>{loading ? 'Loading movements...' : 'No movements found.'}</td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.movementNo}</td>
                      <td>{movement.movementType}</td>
                      <td>
                        <span className={statusClass(movement.status)}>{movement.status}</span>
                      </td>
                      <td>
                        <span className={statusClass(movement.ledgerStatus)}>
                          {movement.ledgerStatus || '-'}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(movement.financeStatus)}>
                          {movement.financeStatus || '-'}
                        </span>
                      </td>
                      <td>{movement.financeExpenseNo || '-'}</td>
                      <td>{displayLocation(movement.fromLocation)}</td>
                      <td>{displayLocation(movement.toLocation)}</td>
                      <td>{movement.requestedBy || '-'}</td>
                      <td>{movement.site || '-'}</td>
                      <td>{movement.reason || '-'}</td>
                      <td>{movement.lines?.length || 0}</td>
                      <td>{money(getMovementValue(movement))}</td>
                      <td>
                        <div className="table-actions">
                          {movement.status === 'SUBMITTED' ? (
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => handleApprove(movement)}
                              disabled={saving}
                            >
                              Approve
                            </button>
                          ) : null}

                          {movement.status === 'APPROVED' ? (
                            <button
                              className="orange-button compact"
                              type="button"
                              onClick={() => handlePost(movement)}
                              disabled={saving}
                            >
                              Post
                            </button>
                          ) : null}

                          {movement.status === 'POSTED' ? (
                            <span className="status-pill success">Complete</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <Link
                          className="btn-secondary"
                          href={`/assets/movements/${movement.id}/receipt`}
                        >
                          Print
                        </Link>
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
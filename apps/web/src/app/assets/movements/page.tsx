'use client';

import AppShell from '@/components/AppShell';
import {
  approveStockMovement,
  createStockMovement,
  getStockItems,
  getStockLocations,
  getStockMovements,
  postStockMovement,
  rejectStockMovement,
  type StockItem,
  type StockLocation,
  type StockMovement,
} from '@/lib/assets-api';
import { useEffect, useMemo, useState } from 'react';

function statusClass(status: string) {
  const upper = String(status || '').toUpperCase();

  if (['POSTED', 'APPROVED'].includes(upper)) return 'status-pill success';
  if (['REJECTED', 'CANCELLED'].includes(upper)) return 'status-pill danger';
  return 'status-pill warning';
}

function movementNeedsDirector(movement: StockMovement) {
  const movementType = String(movement.movementType || '').toUpperCase();

  if (['LOSS', 'WRITE_OFF', 'DAMAGE'].includes(movementType)) return true;

  const total = (movement.lines || []).reduce((sum, line) => {
    const qty = Number(line.quantity || 0);
    const cost = Number(line.unitCost || 0);
    return sum + qty * cost;
  }, 0);

  return total >= 10000;
}

function approvalPathLabel(movement: StockMovement) {
  if (movement.status === 'POSTED') return 'Completed and posted';
  if (movement.status === 'APPROVED') return 'Approved, awaiting Stores posting';
  if (movement.status === 'REJECTED') return 'Rejected';

  if (movementNeedsDirector(movement)) {
    return 'Requester → Line Manager → Branch/Site Manager → Director → Stores Posting';
  }

  return 'Requester → Line Manager → Branch/Site Manager → Stores Posting';
}

export default function AssetMovementsPage() {
  const [mounted, setMounted] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [movementType, setMovementType] = useState('ISSUE');
  const [stockItemId, setStockItemId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [requestedBy, setRequestedBy] = useState('Asset Manager');
  const [requestedByEmail, setRequestedByEmail] = useState('assets@southincon.com');
  const [department, setDepartment] = useState('Operations');
  const [site, setSite] = useState('Kitwe Main Distribution Centre');
  const [reason, setReason] = useState('');

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      total: movements.length,
      submitted: movements.filter((movement) => movement.status === 'SUBMITTED').length,
      approved: movements.filter((movement) => movement.status === 'APPROVED').length,
      posted: movements.filter((movement) => movement.status === 'POSTED').length,
      rejected: movements.filter((movement) => movement.status === 'REJECTED').length,
    };
  }, [movements]);

  async function loadData() {
    setLoading(true);
    setError('');

    const [movementResult, itemResult, locationResult] = await Promise.all([
      getStockMovements(),
      getStockItems(),
      getStockLocations(),
    ]);

    if (!movementResult.ok) {
      setError(movementResult.error || 'Unable to load stock movements.');
      setLoading(false);
      return;
    }

    if (!itemResult.ok) {
      setError(itemResult.error || 'Unable to load stock items.');
      setLoading(false);
      return;
    }

    if (!locationResult.ok) {
      setError(locationResult.error || 'Unable to load stock locations.');
      setLoading(false);
      return;
    }

    setMovements(movementResult.data || []);
    setItems(itemResult.data || []);
    setLocations(locationResult.data || []);

    if (!stockItemId && itemResult.data?.[0]?.id) {
      setStockItemId(itemResult.data[0].id);
    }

    setLoading(false);
  }

  async function handleCreateMovement() {
    setLoading(true);
    setError('');
    setMessage('');

    if (!stockItemId) {
      setError('Select a stock item first.');
      setLoading(false);
      return;
    }

    const result = await createStockMovement({
      movementType,
      fromLocationId: fromLocationId || undefined,
      toLocationId: toLocationId || undefined,
      requestedBy,
      requestedByEmail,
      department,
      site,
      reason: reason || `${movementType} movement request`,
      referenceType: 'MANUAL_ASSET_MOVEMENT',
      referenceNo: '',
      lines: [
        {
          stockItemId,
          quantity: Number(quantity || 0),
          unitCost: Number(unitCost || 0),
          notes: reason || '',
        },
      ],
    });

    if (!result.ok) {
      setError(result.error || 'Unable to create movement.');
      setLoading(false);
      return;
    }

    setMessage(
      'Movement created. Production approval path: Requester → Line Manager → Branch/Site Manager → Director where required → Stores posting.',
    );
    setReason('');
    await loadData();
    setLoading(false);
  }

  async function handleApprove(movement: StockMovement) {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await approveStockMovement(movement.id, {
      approvedBy: 'Line Manager / Branch Manager',
      comments: 'Movement approved for next step.',
    });

    if (!result.ok) {
      setError(result.error || 'Unable to approve movement.');
      setLoading(false);
      return;
    }

    setMessage('Movement approval step completed.');
    await loadData();
    setLoading(false);
  }

  async function handleReject(movement: StockMovement) {
    const reasonText = window.prompt('Enter rejection reason:', 'Rejected during review.');

    if (!reasonText) return;

    setLoading(true);
    setError('');
    setMessage('');

    const result = await rejectStockMovement(movement.id, {
      rejectedBy: 'Line Manager',
      reason: reasonText,
    });

    if (!result.ok) {
      setError(result.error || 'Unable to reject movement.');
      setLoading(false);
      return;
    }

    setMessage('Movement rejected.');
    await loadData();
    setLoading(false);
  }

  async function handlePost(movement: StockMovement) {
    const confirmed = window.confirm(
      `Post movement ${movement.movementNo}? This updates stock balances.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setError('');
    setMessage('');

    const result = await postStockMovement(movement.id, {
      postedBy: 'Stores Officer',
      comments: 'Movement posted to live stock balance.',
    });

    if (!result.ok) {
      setError(result.error || 'Unable to post movement.');
      setLoading(false);
      return;
    }

    setMessage('Movement posted and stock balances updated.');
    await loadData();
    setLoading(false);
  }

  if (!mounted) return null;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Stock Movement Control</h1>
              <p className="muted">
                Movement workflow for stores, scaffolds, disposable equipment, tools, site transfers,
                losses, damages and write-offs. Approval path prepared for Line Manager, Branch/Site
                Manager and Director control.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadData}>
              Refresh
            </button>
          </div>

          {error && <div className="finance-notice danger">{error}</div>}
          {message && <div className="finance-notice success">{message}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Movements</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Submitted</span>
              <strong>{summary.submitted}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approved</span>
              <strong>{summary.approved}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Posted</span>
              <strong>{summary.posted}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Rejected</span>
              <strong>{summary.rejected}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create Movement Request</h2>

          <div className="finance-form-grid">
            <label>
              Movement Type
              <select value={movementType} onChange={(event) => setMovementType(event.target.value)}>
                <option value="RECEIPT">Receipt</option>
                <option value="ISSUE">Issue</option>
                <option value="RETURN">Return</option>
                <option value="TRANSFER">Transfer</option>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss</option>
                <option value="WRITE_OFF">Write Off</option>
              </select>
            </label>

            <label>
              Stock Item
              <select value={stockItemId} onChange={(event) => setStockItemId(event.target.value)}>
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
              <select value={fromLocationId} onChange={(event) => setFromLocationId(event.target.value)}>
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
              <select value={toLocationId} onChange={(event) => setToLocationId(event.target.value)}>
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
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </label>

            <label>
              Unit Cost / Value
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(Number(event.target.value))}
              />
            </label>

            <label>
              Requested By
              <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
            </label>

            <label>
              Requester Email
              <input
                value={requestedByEmail}
                onChange={(event) => setRequestedByEmail(event.target.value)}
              />
            </label>

            <label>
              Department
              <input value={department} onChange={(event) => setDepartment(event.target.value)} />
            </label>

            <label>
              Site / Branch
              <input value={site} onChange={(event) => setSite(event.target.value)} />
            </label>

            <label className="span-2">
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for stock issue, return, transfer, loss, damage or write-off."
              />
            </label>

            <button className="btn" type="button" disabled={loading} onClick={handleCreateMovement}>
              {loading ? 'Processing...' : 'Create Movement Request'}
            </button>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Movement Register</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Movement No.</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Approval Path</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Requested By</th>
                  <th>Site</th>
                  <th>Reason</th>
                  <th>Lines</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={11}>{loading ? 'Loading movements...' : 'No movements found.'}</td>
                  </tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.movementNo}</td>
                      <td>{movement.movementType}</td>
                      <td>
                        <span className={statusClass(movement.status)}>{movement.status}</span>
                      </td>
                      <td>{approvalPathLabel(movement)}</td>
                      <td>{movement.fromLocation?.locationName || '-'}</td>
                      <td>{movement.toLocation?.locationName || '-'}</td>
                      <td>{movement.requestedBy || '-'}</td>
                      <td>{movement.site || '-'}</td>
                      <td>{movement.reason || '-'}</td>
                      <td>{movement.lines?.length || 0}</td>
                      <td>
                        <div className="finance-inline-actions">
                          {movement.status === 'SUBMITTED' && (
                            <>
                              <button
                                className="btn-secondary"
                                type="button"
                                onClick={() => handleApprove(movement)}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-secondary danger"
                                type="button"
                                onClick={() => handleReject(movement)}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {movement.status === 'APPROVED' && (
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => handlePost(movement)}
                            >
                              Post
                            </button>
                          )}

                          {movement.status === 'POSTED' && <span className="status-pill success">Posted</span>}
                        </div>
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
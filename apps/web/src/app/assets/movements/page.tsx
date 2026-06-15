'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  approveAssetMovement,
  createAssetMovement,
  getAssetLocations,
  getAssetMovements,
  getAssetStockItems,
  postAssetMovement,
  type StockItemRecord,
  type StockLocationRecord,
  type StockMovementRecord,
} from '../../../lib/api';

function statusClass(status: string) {
  if (['APPROVED', 'POSTED'].includes(status)) return 'status-pill success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'status-pill danger';
  return 'status-pill warning';
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [items, setItems] = useState<StockItemRecord[]>([]);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setError('');

    try {
      const [movementData, itemData, locationData] = await Promise.all([
        getAssetMovements(),
        getAssetStockItems(),
        getAssetLocations(),
      ]);

      setMovements(movementData);
      setItems(itemData);
      setLocations(locationData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load movements.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await createAssetMovement({
        movementType: String(formData.get('movementType') || 'ISSUE'),
        fromLocationId: String(formData.get('fromLocationId') || '') || undefined,
        toLocationId: String(formData.get('toLocationId') || '') || undefined,
        requestedBy: String(formData.get('requestedBy') || 'Asset Manager'),
        department: String(formData.get('department') || 'Operations'),
        site: String(formData.get('site') || 'Kitwe Main Distribution Centre'),
        reason: String(formData.get('reason') || ''),
        lines: [
          {
            stockItemId: String(formData.get('stockItemId') || ''),
            quantity: Number(formData.get('quantity') || 1),
            unitCost: Number(formData.get('unitCost') || 0),
          },
        ],
      });

      event.currentTarget.reset();
      setMessage('Movement created successfully.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to create movement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(id: string) {
    await approveAssetMovement(id);
    await loadData();
  }

  async function handlePost(id: string) {
    await postAssetMovement(id);
    await loadData();
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Asset Management</p>
              <h1>Stock Movements</h1>
              <p className="muted">
                Create, approve and post receipts, issues, transfers, returns, damage, losses and
                write-offs between stores, yards and sites.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadData} type="button">
              Refresh
            </button>
          </div>

          {message && <div className="finance-notice success">{message}</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card"><span>Total Movements</span><strong>{movements.length}</strong></div>
            <div className="finance-summary-card"><span>Submitted</span><strong>{movements.filter((m) => m.status === 'SUBMITTED').length}</strong></div>
            <div className="finance-summary-card"><span>Approved</span><strong>{movements.filter((m) => m.status === 'APPROVED').length}</strong></div>
            <div className="finance-summary-card"><span>Posted</span><strong>{movements.filter((m) => m.status === 'POSTED').length}</strong></div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create Movement</h2>

          <form className="finance-form-grid" onSubmit={handleCreate}>
            <label>
              Movement Type
              <select name="movementType" defaultValue="ISSUE">
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
              <select name="stockItemId" required>
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
              <select name="fromLocationId">
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
              <select name="toLocationId">
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>Quantity<input name="quantity" type="number" defaultValue="1" min="1" required /></label>
            <label>Unit Cost<input name="unitCost" type="number" step="0.01" defaultValue="0" /></label>
            <label>Requested By<input name="requestedBy" defaultValue="Asset Manager" /></label>
            <label>Department<input name="department" defaultValue="Operations" /></label>
            <label className="span-2">Reason<textarea name="reason" placeholder="Reason for movement" /></label>

            <button className="btn" disabled={saving} type="submit">
              {saving ? 'Creating...' : 'Create Movement'}
            </button>
          </form>
        </div>

        <div className="finance-live-card">
          <h2>Movement Register</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Movement No</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Requested By</th>
                  <th>Reason</th>
                  <th>Lines</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={9}>No movements found.</td></tr>
                ) : (
                  movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.movementNo}</td>
                      <td>{movement.movementType}</td>
                      <td><span className={statusClass(movement.status)}>{movement.status}</span></td>
                      <td>{movement.fromLocation?.locationName || '-'}</td>
                      <td>{movement.toLocation?.locationName || '-'}</td>
                      <td>{movement.requestedBy || '-'}</td>
                      <td>{movement.reason || '-'}</td>
                      <td>{movement.lines?.length || 0}</td>
                      <td>
                        <div className="finance-inline-actions">
                          {movement.status === 'SUBMITTED' && (
                            <button className="btn-secondary" onClick={() => handleApprove(movement.id)} type="button">
                              Approve
                            </button>
                          )}
                          {movement.status === 'APPROVED' && (
                            <button className="btn-secondary" onClick={() => handlePost(movement.id)} type="button">
                              Post
                            </button>
                          )}
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
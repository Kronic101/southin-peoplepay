'use client';

import { AppShell } from '@/components/AppShell';
import {
  createAssetCustodyAssignment,
  getAssetCustodyAssignments,
  getAssetLocations,
  getAssetQrTags,
  getAssetStockItems,
  returnAssetCustodyAssignment,
} from '@/lib/assets-api';
import { useEffect, useMemo, useState } from 'react';

type CustodyAssignment = any;

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

  if (['ACTIVE', 'APPROVED'].includes(status)) return 'badge success';
  if (['RETURNED', 'CLOSED'].includes(status)) return 'badge';
  if (['OVERDUE', 'DAMAGED', 'LOST'].includes(status)) return 'badge danger';

  return 'badge warning';
}

function handleExportCsv() {
  const rows = assignments.map((assignment: any) => ({
    assignmentNo: assignment.assignmentNo || '',
    status: assignment.status || '',
    assignedTo: assignment.assignedTo || '',
    stockItemCode: assignment.stockItem?.itemCode || '',
    stockItemName: assignment.stockItem?.itemName || '',
    qrOrRfid: assignment.qrTag?.tagCode || '',
    locationCode: assignment.location?.locationCode || '',
    department: assignment.department || '',
    site: assignment.site || '',
    projectCode: assignment.projectCode || '',
    assignedBy: assignment.assignedBy || '',
    assignedAt: assignment.assignedAt || '',
    returnedBy: assignment.returnedBy || '',
    returnedAt: assignment.returnedAt || '',
    notes: assignment.notes || '',
  }));

  exportToCsv('southin-custody-assignments.csv', rows);
}

export default function AssetCustodyPage() {
  const [assignments, setAssignments] = useState<CustodyAssignment[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [qrTags, setQrTags] = useState<any[]>([]);

  const [stockItemId, setStockItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [qrTagId, setQrTagId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedBy, setAssignedBy] = useState('Asset Manager');
  const [department, setDepartment] = useState('Operations');
  const [site, setSite] = useState('Kitwe Main Distribution Centre');
  const [projectCode, setProjectCode] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPage() {
    setLoading(true);
    setError('');

    try {
      const [custodyData, stockItemData, locationData, qrTagData] = await Promise.all([
        getAssetCustodyAssignments(),
        getAssetStockItems(),
        getAssetLocations(),
        getAssetQrTags(),
      ]);

      setAssignments(Array.isArray(custodyData) ? custodyData : []);
      setStockItems(Array.isArray(stockItemData) ? stockItemData : []);
      setLocations(Array.isArray(locationData) ? locationData : []);
      setQrTags(Array.isArray(qrTagData) ? qrTagData : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load custody assignments.');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const summary = useMemo(() => {
    const active = assignments.filter((item) => item.status === 'ACTIVE').length;
    const returned = assignments.filter((item) => item.status === 'RETURNED').length;

    return {
      total: assignments.length,
      active,
      returned,
    };
  }, [assignments]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      if (!assignedTo) {
        setError('Assigned to is required.');
        return;
      }

      await createAssetCustodyAssignment({
        stockItemId: stockItemId || null,
        locationId: locationId || null,
        qrTagId: qrTagId || null,
        assignedTo,
        assignedBy,
        department,
        site,
        projectCode,
        notes,
      });

      setMessage('Custody assignment created successfully.');
      setAssignedTo('');
      setQrTagId('');
      setProjectCode('');
      setNotes('');
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create custody assignment.');
    }
  }

  async function handleReturn(assignment: CustodyAssignment) {
    setMessage('');
    setError('');

    try {
      await returnAssetCustodyAssignment(assignment.id, {
        returnedBy: assignedBy || 'Asset Manager',
      });

      setMessage(`Custody assignment ${assignment.assignmentNo} returned.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to return custody assignment.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Custody Assignments</h1>
            <p className="muted">
              Track issued tools, PPE, scaffold items, QR/RFID assets and employee custody control.
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
            <span>Total Assignments</span>
            <strong>{summary.total}</strong>
          </div>

          <div className="metric-card">
            <span>Active Custody</span>
            <strong>{summary.active}</strong>
          </div>

          <div className="metric-card">
            <span>Returned</span>
            <strong>{summary.returned}</strong>
          </div>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Create Custody Assignment</h2>
              <p className="muted">
                Use this when equipment, tools, QR/RFID-tagged items or PPE are issued to a person.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Stock Item
              <select value={stockItemId} onChange={(event) => setStockItemId(event.target.value)}>
                <option value="">Select stock item</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemCode} - {item.itemName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              QR / RFID Tag
              <select value={qrTagId} onChange={(event) => setQrTagId(event.target.value)}>
                <option value="">Optional tag</option>
                {qrTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.tagCode}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location
              <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                <option value="">Optional location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Assigned To
              <input
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
                placeholder="Employee / user receiving item"
              />
            </label>

            <label>
              Assigned By
              <input value={assignedBy} onChange={(event) => setAssignedBy(event.target.value)} />
            </label>

            <label>
              Department
              <input value={department} onChange={(event) => setDepartment(event.target.value)} />
            </label>

            <label>
              Site
              <input value={site} onChange={(event) => setSite(event.target.value)} />
            </label>

            <label>
              Project Code
              <input value={projectCode} onChange={(event) => setProjectCode(event.target.value)} />
            </label>

            <label className="full-span">
              Notes
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional custody notes, expected return date, handover details or condition remarks."
              />
            </label>

            <div className="form-actions full-span">
              <button className="btn" type="submit">
                Create Custody Assignment
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Custody Register</h2>
              <p className="muted">
                Active and returned custody records for audit, filing and accountability.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assignment No.</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Stock Item</th>
                  <th>QR / RFID</th>
                  <th>Location</th>
                  <th>Department</th>
                  <th>Site</th>
                  <th>Assigned By</th>
                  <th>Assigned</th>
                  <th>Returned</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {assignments.length === 0 ? (
                  <tr>
                    <td colSpan={12}>
                      {loading ? 'Loading custody assignments...' : 'No custody assignments found.'}
                    </td>
                  </tr>
                ) : (
                  assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>{assignment.assignmentNo}</td>
                      <td>
                        <span className={statusClass(assignment.status)}>
                          {assignment.status || '-'}
                        </span>
                      </td>
                      <td>{assignment.assignedTo || '-'}</td>
                      <td>
                        {assignment.stockItem?.itemCode || '-'}
                        <br />
                        <span className="muted">{assignment.stockItem?.itemName || ''}</span>
                      </td>
                      <td>{assignment.qrTag?.tagCode || '-'}</td>
                      <td>
                        {assignment.location?.locationCode || '-'}
                        <br />
                        <span className="muted">{assignment.location?.locationName || ''}</span>
                      </td>
                      <td>{assignment.department || '-'}</td>
                      <td>{assignment.site || '-'}</td>
                      <td>{assignment.assignedBy || '-'}</td>
                      <td>{formatDate(assignment.assignedAt)}</td>
                      <td>{formatDate(assignment.returnedAt)}</td>
                      <td>
                        {assignment.status === 'ACTIVE' ? (
                          <button
                            className="btn-secondary"
                            type="button"
                            onClick={() => handleReturn(assignment)}
                          >
                            Return
                          </button>
                        ) : (
                          <span className="muted">Closed</span>
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
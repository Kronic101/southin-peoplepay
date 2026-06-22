'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { exportToCsv } from '@/lib/csv-export';
import {
  approveAssetMovement,
  createAssetMovement,
  getAssetLocations,
  getAssetMovementApprovalHistory,
  getAssetMovements,
  getAssetStockItems,
  postAssetMovement,
  rejectAssetMovement,
  StockItemRecord,
  StockLocationRecord,
  StockMovementRecord,
} from '@/lib/assets-api';

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

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (
    status === 'POSTED' ||
    status === 'APPROVED' ||
    status === 'LINKED' ||
    status === 'NOT_REQUIRED' ||
    status === 'COMPLETE'
  ) {
    return 'status-pill success';
  }

  if (
    status === 'REJECTED' ||
    status === 'MISSING' ||
    status === 'MISSING_LEDGER' ||
    status === 'FAILED'
  ) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

function badgeClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED' || status === 'POSTED' || status === 'COMPLETE') {
    return 'badge success';
  }

  if (status === 'REJECTED' || status === 'FAILED') {
    return 'badge danger';
  }

  return 'badge warning';
}

function displayLocation(location?: StockLocationRecord | null) {
  if (!location) return '-';

  return location.locationCode || location.locationName || '-';
}

function getMovementValue(movement: any) {
  return (movement.lines || []).reduce((total: number, line: any) => {
    const providedTotal = asNumber(line.totalCost);

    if (providedTotal > 0) {
      return total + providedTotal;
    }

    return total + asNumber(line.quantity) * asNumber(line.unitCost);
  }, 0);
}

function normaliseMovementResult(result: any): StockMovementRecord {
  return result?.movement || result;
}

function getMovementLineCount(movement: any) {
  return movement.lines?.length || 0;
}

function isSubmitted(movement: any) {
  return String(movement.status || '').toUpperCase() === 'SUBMITTED';
}

function isApproved(movement: any) {
  return String(movement.status || '').toUpperCase() === 'APPROVED';
}

function isPosted(movement: any) {
  return String(movement.status || '').toUpperCase() === 'POSTED';
}

function movementRequiresDirector(movement: any) {
  const movementType = String(movement.movementType || '').toUpperCase();
  const movementValue = getMovementValue(movement);

  return movementValue >= 50000 || ['LOSS', 'DAMAGE', 'WRITE_OFF'].includes(movementType);
}

function hasApproval(history: any[] | undefined, level: string) {
  return (history || []).some((entry) => {
    return (
      String(entry.approvalLevel || '').toUpperCase() === level &&
      String(entry.decision || '').toUpperCase() === 'APPROVED'
    );
  });
}

function getNextApprovalStage(movement: any, history: any[] | undefined) {
  if (!isSubmitted(movement)) return null;

  const lineManagerDone = hasApproval(history, 'LINE_MANAGER');
  const hodDone = hasApproval(history, 'HOD');
  const directorDone = hasApproval(history, 'DIRECTOR');

  if (!lineManagerDone) {
    return {
      level: 'LINE_MANAGER',
      role: 'Line Manager',
      label: 'Approve Line Manager',
    };
  }

  if (!hodDone) {
    return {
      level: 'HOD',
      role: 'HOD',
      label: 'Approve HOD',
    };
  }

  if (movementRequiresDirector(movement) && !directorDone) {
    return {
      level: 'DIRECTOR',
      role: 'Director',
      label: 'Approve Director',
    };
  }

  return null;
}

export default function AssetMovementsPage() {
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [items, setItems] = useState<StockItemRecord[]>([]);
  const [locations, setLocations] = useState<StockLocationRecord[]>([]);
  const [form, setForm] = useState<MovementForm>(defaultForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState('');
  const [approvingId, setApprovingId] = useState('');
  const [rejectingId, setRejectingId] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [expandedApprovalMovementId, setExpandedApprovalMovementId] = useState('');
  const [approvalHistory, setApprovalHistory] = useState<Record<string, any[]>>({});
  const [approvalLoadingId, setApprovalLoadingId] = useState('');

  async function loadApprovalHistory(movementId: string) {
    setApprovalLoadingId(movementId);

    try {
      const history = await getAssetMovementApprovalHistory(movementId);

      setApprovalHistory((current) => ({
        ...current,
        [movementId]: Array.isArray(history) ? history : [],
      }));

      return Array.isArray(history) ? history : [];
    } catch (err: any) {
      setError(err?.message || 'Unable to load approval history.');
      return [];
    } finally {
      setApprovalLoadingId('');
    }
  }

  async function preloadApprovalHistory(movementData: StockMovementRecord[]) {
    const targetMovements = movementData.filter((movement: any) => {
      const status = String(movement.status || '').toUpperCase();

      return ['SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED'].includes(status);
    });

    const entries = await Promise.all(
      targetMovements.map(async (movement: any) => {
        try {
          const history = await getAssetMovementApprovalHistory(movement.id);

          return [movement.id, Array.isArray(history) ? history : []] as const;
        } catch {
          return [movement.id, []] as const;
        }
      }),
    );

    setApprovalHistory((current) => ({
      ...current,
      ...Object.fromEntries(entries),
    }));
  }

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

      await preloadApprovalHistory(safeMovements);
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

  function handleExportCsv() {
    const rows = movements.map((movement: any) => ({
      movementNo: movement.movementNo || '',
      type: movement.movementType || '',
      status: movement.status || '',
      ledgerStatus: movement.ledgerStatus || '',
      financeStatus: movement.financeStatus || '',
      financeExpenseNo: movement.financeExpenseNo || '',
      fromLocation: movement.fromLocation?.locationCode || '',
      toLocation: movement.toLocation?.locationCode || '',
      requestedBy: movement.requestedBy || '',
      department: movement.department || '',
      site: movement.site || '',
      projectCode: movement.projectCode || '',
      reason: movement.reason || '',
      lines: getMovementLineCount(movement),
      value: getMovementValue(movement),
      approvedBy: movement.approvedBy || '',
      approvedAt: movement.approvedAt || '',
      postedBy: movement.postedBy || '',
      postedAt: movement.postedAt || '',
    }));

    exportToCsv('southin-stock-movements.csv', rows);
  }

  async function handleCreateMovement(event: React.FormEvent) {
    event.preventDefault();

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
      setMessage(`Stores requisition ${created.movementNo} has been submitted successfully.`);

      setForm((current) => ({
        ...defaultForm,
        stockItemId: current.stockItemId,
      }));

      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to create movement.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprovalLevel(movement: any, approvalLevel: string, approverRole: string) {
    setError('');
    setMessage('');
    setApprovingId(`${movement.id}-${approvalLevel}`);

    try {
      const result = await (approveAssetMovement as any)(movement.id, {
        approvalLevel,
        approvedBy: 'Asset Manager',
        approverRole,
        comments: `${approverRole} approval granted.`,
      });

      const updatedMovement = normaliseMovementResult(result);

      setMovements((current) =>
        current.map((item) => (item.id === movement.id ? updatedMovement : item)),
      );

      setMessage(`${approverRole} approval recorded for ${movement.movementNo}.`);

      await loadApprovalHistory(movement.id);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || `Failed to approve as ${approverRole}.`);
    } finally {
      setApprovingId('');
    }
  }

  async function handleRejectMovement(movement: any) {
    setError('');
    setMessage('');
    setRejectingId(movement.id);

    try {
      const result = await (rejectAssetMovement as any)(movement.id, {
        approvalLevel: 'REJECTION',
        rejectedBy: 'Asset Manager',
        approverRole: 'Finance Manager',
        comments: 'Movement rejected from approval workflow.',
      });

      const updatedMovement = normaliseMovementResult(result);

      setMovements((current) =>
        current.map((item) => (item.id === movement.id ? updatedMovement : item)),
      );

      setMessage(`Movement ${movement.movementNo} has been rejected.`);

      await loadApprovalHistory(movement.id);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject movement.');
    } finally {
      setRejectingId('');
    }
  }

  async function handlePostMovement(movement: any) {
    setError('');
    setMessage('');
    setPostingId(movement.id);

    try {
      const result = await (postAssetMovement as any)(movement.id, {
        postedBy: 'Asset Manager',
      });

      const updatedMovement = normaliseMovementResult(result);

      setMovements((current) =>
        current.map((item) => (item.id === movement.id ? updatedMovement : item)),
      );

      setMessage(`Movement ${updatedMovement.movementNo || movement.movementNo} posted.`);
      await loadPage();
    } catch (err: any) {
      setError(err?.message || 'Failed to post movement.');
    } finally {
      setPostingId('');
    }
  }

  async function toggleApprovalHistory(movement: any) {
    if (expandedApprovalMovementId === movement.id) {
      setExpandedApprovalMovementId('');
      return;
    }

    setExpandedApprovalMovementId(movement.id);

    if (!approvalHistory[movement.id]) {
      await loadApprovalHistory(movement.id);
    }
  }

  return (
    <AppShell>
      <section className="page-stack">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stock Movement Control</h1>
            <p className="muted">
              Create, approve and post stock receipts, issues, transfers, returns, damages, losses
              and write-offs. Posted movements update balances, stock ledger and finance records
              where required.
            </p>
          </div>

          <button className="btn-secondary" type="button" onClick={loadPage}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

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

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Create Stores Requisition / Movement Request</h2>
              <p className="muted">
                High-value issues and write-offs follow line manager, HOD and director approval
                before posting.
              </p>
            </div>
          </div>

          <form className="form-grid" onSubmit={handleCreateMovement}>
            <label>
              Movement Type
              <select
                value={form.movementType}
                onChange={(event) => updateForm('movementType', event.target.value)}
              >
                <option value="ISSUE">Issue</option>
                <option value="RECEIPT">Receipt</option>
                <option value="TRANSFER">Transfer</option>
                <option value="RETURN">Return</option>
                <option value="DAMAGE">Damage</option>
                <option value="LOSS">Loss</option>
                <option value="WRITE_OFF">Write-off</option>
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
                type="number"
                min="0"
                step="0.01"
                value={form.quantity}
                onChange={(event) => updateForm('quantity', event.target.value)}
              />
            </label>

            <label>
              Unit Cost / Value
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(event) => updateForm('unitCost', event.target.value)}
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

            <label>
              Reason
              <textarea
                value={form.reason}
                onChange={(event) => updateForm('reason', event.target.value)}
                placeholder="Reason for stock issue, transfer, return, loss, damage or write-off."
              />
            </label>

            <div className="form-actions full-span">
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="page-header compact">
            <div>
              <h2>Movement Register</h2>
              <p className="muted">
                Approval, ledger and finance status are shown together for audit control.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={handleExportCsv}>
              Export CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
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
                  <th>Requisition</th>
                  <th>History</th>
                </tr>
              </thead>

              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={17}>
                      {loading ? 'Loading movements...' : 'No stock movements found.'}
                    </td>
                  </tr>
                ) : (
                  movements.map((movement: any) => {
                    const history = approvalHistory[movement.id] || [];
                    const nextStage = getNextApprovalStage(movement, history);
                    const canPost = isApproved(movement);
                    const posted = isPosted(movement);

                    return (
                      <Fragment key={movement.id}>
                        <tr>
                          <td>{movement.movementNo || '-'}</td>

                          <td>{cleanStatus(movement.movementType)}</td>

                          <td>
                            <span className={statusClass(movement.status)}>
                              {cleanStatus(movement.status)}
                            </span>
                          </td>

                          <td>
                            <span className={statusClass(movement.ledgerStatus)}>
                              {cleanStatus(movement.ledgerStatus)}
                            </span>
                          </td>

                          <td>
                            <span className={statusClass(movement.financeStatus || 'PENDING')}>
                              {cleanStatus(movement.financeStatus || 'PENDING')}
                            </span>
                          </td>

                          <td>
                            {movement.financeExpenseNo ||
                              movement.financeExpense?.expenseNo ||
                              movement.financeExpenseId ||
                              '-'}
                          </td>

                          <td>{displayLocation(movement.fromLocation)}</td>
                          <td>{displayLocation(movement.toLocation)}</td>
                          <td>{movement.requestedBy || '-'}</td>
                          <td>{movement.site || '-'}</td>
                          <td>{movement.reason || '-'}</td>
                          <td>{getMovementLineCount(movement)}</td>
                          <td>{money(getMovementValue(movement))}</td>

                          <td>
                            <div className="table-actions">
                              {nextStage ? (
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  disabled={approvingId === `${movement.id}-${nextStage.level}`}
                                  onClick={() =>
                                    handleApprovalLevel(
                                      movement,
                                      nextStage.level,
                                      nextStage.role,
                                    )
                                  }
                                >
                                  {approvingId === `${movement.id}-${nextStage.level}`
                                    ? 'Approving...'
                                    : nextStage.label}
                                </button>
                              ) : null}

                              {isSubmitted(movement) ? (
                                <button
                                  className="btn-secondary danger"
                                  type="button"
                                  disabled={rejectingId === movement.id}
                                  onClick={() => handleRejectMovement(movement)}
                                >
                                  {rejectingId === movement.id ? 'Rejecting...' : 'Reject'}
                                </button>
                              ) : null}

                              {canPost ? (
                                <button
                                  className="btn-secondary"
                                  type="button"
                                  disabled={postingId === movement.id}
                                  onClick={() => handlePostMovement(movement)}
                                >
                                  {postingId === movement.id ? 'Posting...' : 'Post'}
                                </button>
                              ) : null}

                              {posted ? <span className="badge success">Complete</span> : null}
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

                          <td>
                            <Link
                              className="btn-secondary"
                              href={`/assets/movements/${movement.id}/requisition`}
                            >
                              Requisition
                            </Link>
                          </td>

                          <td>
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => toggleApprovalHistory(movement)}
                            >
                              {expandedApprovalMovementId === movement.id
                                ? 'Hide History'
                                : 'History'}
                            </button>
                          </td>
                        </tr>

                        {expandedApprovalMovementId === movement.id ? (
                          <tr>
                            <td colSpan={17}>
                              <div className="soft-card">
                                <div className="page-header compact">
                                  <div>
                                    <h3>Approval History</h3>
                                    <p className="muted">
                                      Full approval audit trail for {movement.movementNo}.
                                    </p>
                                  </div>

                                  <button
                                    className="btn-secondary"
                                    type="button"
                                    onClick={() => loadApprovalHistory(movement.id)}
                                  >
                                    {approvalLoadingId === movement.id
                                      ? 'Loading...'
                                      : 'Refresh History'}
                                  </button>
                                </div>

                                <div className="table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Level</th>
                                        <th>Decision</th>
                                        <th>Approver</th>
                                        <th>Role</th>
                                        <th>Comments</th>
                                        <th>Date</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {approvalLoadingId === movement.id ? (
                                        <tr>
                                          <td colSpan={6}>Loading approval history...</td>
                                        </tr>
                                      ) : !approvalHistory[movement.id]?.length ? (
                                        <tr>
                                          <td colSpan={6}>No approval history found.</td>
                                        </tr>
                                      ) : (
                                        approvalHistory[movement.id].map((entry: any) => (
                                          <tr key={entry.id}>
                                            <td>
                                              <span className="badge">
                                                {entry.approvalLevel || '-'}
                                              </span>
                                            </td>

                                            <td>
                                              <span className={badgeClass(entry.decision)}>
                                                {entry.decision || '-'}
                                              </span>
                                            </td>

                                            <td>{entry.approverName || '-'}</td>
                                            <td>{entry.approverRole || '-'}</td>
                                            <td>{entry.comments || '-'}</td>
                                            <td>{formatDateTime(entry.createdAt)}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
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
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { getAssetMovements, postAssetMovement } from '@/lib/assets-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function apiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed: ${path}`);
  }

  return data as T;
}

async function getApprovalWorkflows(): Promise<any[]> {
  const data: any = await apiJson('/approvals/workflows');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.workflows)) return data.workflows;
  return [];
}

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
  if (['APPROVED', 'POSTED', 'COMPLETE', 'LINKED', 'NOT_REQUIRED'].includes(status)) return 'status-pill success';
  if (['REJECTED', 'FAILED', 'APPROVER_NOT_CONFIGURED', 'MISSING'].includes(status)) return 'status-pill danger';
  return 'status-pill warning';
}

function getPayload(record?: any) {
  if (!record?.payload) return {};
  if (typeof record.payload === 'string') {
    try { return JSON.parse(record.payload); } catch { return {}; }
  }
  return record.payload;
}

function getHistory(record?: any) {
  const payload = getPayload(record);
  return Array.isArray(payload.history) ? payload.history : [];
}

function currentApprover(record?: any) {
  return (
    record?.currentApproverEmail ||
    record?.assignedToEmail ||
    record?.approverEmail ||
    getPayload(record)?.resolvedApprover?.approver?.email ||
    getPayload(record)?.resolvedApprover?.originalApprover?.email ||
    '-'
  );
}

function currentStep(record?: any) {
  const payload = getPayload(record);
  return payload?.nextStep?.label || payload?.firstStep?.label || record?.currentStepRole || `Step ${record?.currentStep || '-'}`;
}

function locationName(location?: any) {
  if (!location) return '-';
  return location.locationCode || location.locationName || '-';
}

function movementValue(movement: any) {
  return (movement?.lines || []).reduce((sum: number, line: any) => {
    const total = asNumber(line.totalCost);
    return sum + (total > 0 ? total : asNumber(line.quantity) * asNumber(line.unitCost));
  }, 0);
}

function normaliseMovementResult(result: any) {
  return result?.movement || result;
}

export default function AssetMovementDetailPage() {
  const params = useParams<{ id: string }>();
  const movementId = params?.id;

  const [movement, setMovement] = useState<any>(null);
  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    if (!movementId) return;

    setLoading(true);
    setError('');

    try {
      const movements = await getAssetMovements();
      const found = (Array.isArray(movements) ? movements : []).find((item: any) => item.id === movementId) || null;
      setMovement(found);

      const approvalRequestId =
        found?.approvalRequestId ??
        found?.approvalWorkflowId ??
        null;

      if (approvalRequestId) {
        const workflows = await getApprovalWorkflows();
        setApproval(workflows.find((item: any) => item.id === approvalRequestId) || null);
      } else {
        setApproval(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load asset movement.');
      setMovement(null);
      setApproval(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [movementId]);

  const isApproved = String(movement?.status || '').toUpperCase() === 'APPROVED';
  const isPosted = String(movement?.status || '').toUpperCase() === 'POSTED';
  const history = getHistory(approval);

  const summary = useMemo(() => {
    return {
      value: movementValue(movement),
      lines: movement?.lines?.length || 0,
    };
  }, [movement]);

  async function handlePost() {
    if (!movement) return;

    setPosting(true);
    setMessage('');
    setError('');

    try {
      const result = await (postAssetMovement as any)(movement.id, { postedBy: 'Asset Manager' });
      const updated = normaliseMovementResult(result);
      setMessage(`${updated.movementNo || movement.movementNo} posted successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to post movement.');
    } finally {
      setPosting(false);
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>{movement?.movementNo || 'Asset Movement'}</h1>
            <p className="muted">View movement details, approval status, ledger status and finance linkage.</p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/assets/movements">Back to Movements</Link>
            {movement?.approvalRequestId ? <Link className="btn-secondary" href="/approvals/inbox">Open Approval Inbox</Link> : null}
            {isApproved ? <button className="btn" type="button" disabled={posting} onClick={handlePost}>{posting ? 'Posting...' : 'Post Movement'}</button> : null}
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {!movement && !loading ? <div className="finance-card">Movement not found.</div> : null}

        {movement ? (
          <>
            <div className="finance-summary-grid">
              <div className="finance-summary-card"><span>Status</span><strong>{cleanStatus(movement.status)}</strong></div>
              <div className="finance-summary-card"><span>Approval Status</span><strong>{cleanStatus(approval?.status || movement.status)}</strong></div>
              <div className="finance-summary-card"><span>Current Step</span><strong>{isPosted ? 'Posted' : isApproved ? 'Approved' : currentStep(approval)}</strong></div>
              <div className="finance-summary-card"><span>Current Approver</span><strong>{isPosted || isApproved ? '-' : currentApprover(approval)}</strong></div>
              <div className="finance-summary-card"><span>Ledger</span><strong>{cleanStatus(movement.ledgerStatus)}</strong></div>
              <div className="finance-summary-card"><span>Finance</span><strong>{cleanStatus(movement.financeStatus || 'PENDING')}</strong></div>
              <div className="finance-summary-card"><span>Lines</span><strong>{summary.lines}</strong></div>
              <div className="finance-summary-card"><span>Total Value</span><strong>{money(summary.value)}</strong></div>
            </div>

            {isPosted ? <div className="alert success">This movement has been posted to the stock ledger.</div> : null}
            {isApproved && !isPosted ? <div className="alert success">This movement is approved and ready to post.</div> : null}
            {!isApproved && !isPosted ? <div className="alert warning">This movement is waiting for approval. Use the Approval Inbox to approve or reject.</div> : null}

            <div className="finance-card">
              <h2>Movement Details</h2>
              <div className="mini-detail-grid">
                <div><span>Movement Type</span><strong>{cleanStatus(movement.movementType)}</strong></div>
                <div><span>Approval Request</span><strong>{movement.approvalRequestId || '-'}</strong></div>
                <div><span>From Location</span><strong>{locationName(movement.fromLocation)}</strong></div>
                <div><span>To Location</span><strong>{locationName(movement.toLocation)}</strong></div>
                <div><span>Requested By</span><strong>{movement.requestedBy || '-'}</strong></div>
                <div><span>Requester Email</span><strong>{movement.requestedByEmail || '-'}</strong></div>
                <div><span>Department</span><strong>{movement.department || '-'}</strong></div>
                <div><span>Site</span><strong>{movement.site || '-'}</strong></div>
                <div><span>Branch</span><strong>{movement.branch || '-'}</strong></div>
                <div><span>Created</span><strong>{formatDate(movement.createdAt)}</strong></div>
              </div>
              <p className="muted" style={{ marginTop: '1rem' }}>{movement.reason || 'No reason supplied.'}</p>
            </div>

            <div className="finance-card">
              <h2>Movement Lines</h2>
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr><th>Item Code</th><th>Item</th><th>Quantity</th><th>Unit Cost</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {!movement.lines?.length ? (
                      <tr><td colSpan={5}>No movement lines found.</td></tr>
                    ) : (
                      movement.lines.map((line: any) => (
                        <tr key={line.id}>
                          <td>{line.stockItem?.itemCode || line.itemCode || '-'}</td>
                          <td>{line.stockItem?.itemName || line.itemName || '-'}</td>
                          <td>{asNumber(line.quantity)}</td>
                          <td>{money(line.unitCost)}</td>
                          <td>{money(asNumber(line.totalCost) || asNumber(line.quantity) * asNumber(line.unitCost))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="finance-card">
              <h2>Approval History</h2>
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr><th>Step</th><th>Action</th><th>Actioned By</th><th>Comments</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {!history.length ? (
                      <tr><td colSpan={5}>No approval history found.</td></tr>
                    ) : (
                      history.map((item: any, index: number) => (
                        <tr key={`${item.actionedAt}-${index}`}>
                          <td>{item.stepSequence || index + 1}</td>
                          <td>{cleanStatus(item.action)}</td>
                          <td><strong>{item.actionedBy || '-'}</strong><br /><span className="muted">{item.actionedByEmail || '-'}</span></td>
                          <td>{item.comments || '-'}</td>
                          <td>{formatDate(item.actionedAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

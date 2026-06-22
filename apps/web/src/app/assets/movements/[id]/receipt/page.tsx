'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  getAssetMovement,
  getAssetMovementApprovalHistory,
} from '@/lib/assets-api';

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
  if (Number.isNaN(date.getTime())) return '-';

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
    return 'badge success';
  }

  if (status === 'REJECTED' || status === 'MISSING' || status === 'FAILED') {
    return 'badge danger';
  }

  return 'badge warning';
}

function getLineTotal(line: any) {
  const providedTotal = asNumber(line.totalCost);
  if (providedTotal > 0) return providedTotal;

  return asNumber(line.quantity) * asNumber(line.unitCost);
}

export default function StockMovementReceiptPage() {
  const params = useParams<{ id: string }>();
  const movementId = params?.id;

  const [movement, setMovement] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReceipt() {
    if (!movementId) return;

    setLoading(true);
    setError('');

    try {
      const [movementData, historyData] = await Promise.all([
        getAssetMovement(movementId),
        getAssetMovementApprovalHistory(movementId),
      ]);

      setMovement(movementData);
      setApprovalHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load movement receipt.');
      setMovement(null);
      setApprovalHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReceipt();
  }, [movementId]);

  const lines = movement?.lines || [];

  const movementTotal = useMemo(() => {
    return lines.reduce((sum: number, line: any) => sum + getLineTotal(line), 0);
  }, [lines]);

  const financeRef =
    movement?.financeExpenseNo ||
    movement?.financeExpense?.expenseNo ||
    movement?.financeExpenseId ||
    'Not required';

  return (
    <AppShell>
      <section className="page-stack print-page">
        <div className="finance-card finance-hero-card no-print">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stock Movement Receipt</h1>
            <p className="muted">
              Printable movement voucher for stores, custody, audit, finance and filing.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/assets/movements">
              Back to Movements
            </Link>

            <button className="btn" type="button" onClick={() => window.print()}>
              Print Receipt
            </button>
          </div>
        </div>

        {error ? <div className="alert error no-print">{error}</div> : null}
        {loading ? <div className="card no-print">Loading receipt...</div> : null}

        {!loading && !movement ? (
          <div className="alert error">Movement receipt could not be loaded.</div>
        ) : null}

        {!loading && movement ? (
          <div className="card receipt-card">
            <div className="receipt-header">
              <div>
                <p className="eyebrow">Southin Operations Hub</p>
                <h1>Stock Movement Voucher</h1>
                <p className="muted">Asset, Stores & Scaffold Management</p>
              </div>

              <div className="receipt-meta">
                <span>Movement No.</span>
                <strong>{movement.movementNo || '-'}</strong>
                <span>{cleanStatus(movement.movementType)}</span>
                <span className={statusClass(movement.status)}>
                  {cleanStatus(movement.status)}
                </span>
              </div>
            </div>

            <div className="metric-grid">
              <div className="metric-card">
                <span>Ledger Status</span>
                <strong>{cleanStatus(movement.ledgerStatus)}</strong>
              </div>

              <div className="metric-card">
                <span>Finance Status</span>
                <strong>{cleanStatus(movement.financeStatus || 'NOT_REQUIRED')}</strong>
              </div>

              <div className="metric-card">
                <span>Finance Ref</span>
                <strong>{financeRef}</strong>
              </div>

              <div className="metric-card">
                <span>Movement Value</span>
                <strong>{money(movementTotal)}</strong>
              </div>

              <div className="metric-card">
                <span>Ledger Entries</span>
                <strong>{movement.ledgerEntryCount || 0}</strong>
              </div>
            </div>

            <div className="card soft-card">
              <h2>Movement Control Details</h2>

              <div className="metric-grid">
                <div className="metric-card">
                  <span>Requested By</span>
                  <strong>{movement.requestedBy || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Requester Email</span>
                  <strong>{movement.requestedByEmail || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Approved By</span>
                  <strong>{movement.approvedBy || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Posted By</span>
                  <strong>{movement.postedBy || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Department</span>
                  <strong>{movement.department || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Site</span>
                  <strong>{movement.site || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Branch</span>
                  <strong>{movement.branch || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Project Code</span>
                  <strong>{movement.projectCode || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Reference Type</span>
                  <strong>{movement.referenceType || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Reference No.</span>
                  <strong>{movement.referenceNo || movement.referenceId || '-'}</strong>
                </div>

                <div className="metric-card">
                  <span>Submitted</span>
                  <strong>{formatDateTime(movement.submittedAt || movement.createdAt)}</strong>
                </div>

                <div className="metric-card">
                  <span>Approved</span>
                  <strong>{formatDateTime(movement.approvedAt)}</strong>
                </div>

                <div className="metric-card">
                  <span>Posted</span>
                  <strong>{formatDateTime(movement.postedAt)}</strong>
                </div>
              </div>
            </div>

            <div className="card soft-card">
              <h2>Movement Lines</h2>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item Code</th>
                      <th>Item Name</th>
                      <th>Qty</th>
                      <th>Unit Cost</th>
                      <th>Total</th>
                      <th>QR/RFID</th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No movement line items found.</td>
                      </tr>
                    ) : (
                      lines.map((line: any, index: number) => (
                        <tr key={line.id || index}>
                          <td>{line.stockItem?.itemCode || '-'}</td>
                          <td>{line.stockItem?.itemName || '-'}</td>
                          <td>{asNumber(line.quantity)}</td>
                          <td>{money(line.unitCost)}</td>
                          <td>{money(getLineTotal(line))}</td>
                          <td>{line.qrTag?.tagCode || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card soft-card">
              <h2>Approval History</h2>

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
                    {approvalHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No approval history found.</td>
                      </tr>
                    ) : (
                      approvalHistory.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span className="badge">{entry.approvalLevel || '-'}</span>
                          </td>
                          <td>
                            <span className={statusClass(entry.decision)}>
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

            <div className="requisition-footer">
              <div>
                <span>Reason:</span>
                <strong>{movement.reason || '-'}</strong>
              </div>

              <div>
                <span>From:</span>
                <strong>{movement.fromLocation?.locationCode || '-'}</strong>
                <span>To:</span>
                <strong>{movement.toLocation?.locationCode || '-'}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
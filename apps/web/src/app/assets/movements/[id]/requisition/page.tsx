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

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

function formatMoney(value: unknown) {
  const amount = asNumber(value);

  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
}

function approvalBadgeClass(decision?: string | null) {
  const value = String(decision || '').toUpperCase();

  if (value === 'APPROVED') return 'badge success';
  if (value === 'REJECTED') return 'badge danger';

  return 'badge warning';
}

export default function StoresRequisitionPage() {
  const params = useParams<{ id: string }>();
  const movementId = params?.id;

  const [movement, setMovement] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadMovement() {
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
      setError(err?.message || 'Unable to load stores requisition.');
      setMovement(null);
      setApprovalHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovement();
  }, [movementId]);

  const lines = movement?.lines || [];

  const totalValue = useMemo(() => {
    return lines.reduce((sum: number, line: any) => {
      const quantity = asNumber(line.quantity);
      const unitCost = asNumber(line.unitCost);
      const totalCost = asNumber(line.totalCost || quantity * unitCost);

      return sum + totalCost;
    }, 0);
  }, [lines]);

  return (
    <AppShell>
      <section className="page-stack">
        <div className="finance-card finance-hero-card no-print">
          <div>
            <p className="eyebrow">Asset Management</p>
            <h1>Stores Requisition Form</h1>
            <p className="muted">
              Printable requisition generated from the approved stores movement request.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/assets/movements">
              Back to Movements
            </Link>

            <button className="btn" type="button" onClick={() => window.print()}>
              Print Requisition
            </button>
          </div>
        </div>

        {error ? <div className="alert error no-print">{error}</div> : null}
        {loading ? <div className="card no-print">Loading requisition...</div> : null}

        {!loading && movement ? (
          <div className="stores-requisition-sheet">
            <div className="requisition-top">
              <div>
                <p className="requisition-company">SOUTHIN OPERATIONS HUB</p>
                <h1>STORES REQUISITION FORM</h1>
              </div>

              <div className="requisition-number-box">
                <div>
                  <span>Date:</span>
                  <strong>{formatDate(movement.submittedAt || movement.createdAt)}</strong>
                </div>

                <div>
                  <span>No:</span>
                  <strong>{movement.movementNo || '-'}</strong>
                </div>

                <div>
                  <span>Status:</span>
                  <strong>{movement.status || '-'}</strong>
                </div>
              </div>
            </div>

            <table className="requisition-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Description</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No requisition line items found.</td>
                  </tr>
                ) : (
                  lines.map((line: any, index: number) => {
                    const quantity = asNumber(line.quantity);
                    const unitCost = asNumber(line.unitCost);
                    const totalCost = asNumber(line.totalCost || quantity * unitCost);

                    return (
                      <tr key={line.id || index}>
                        <td>{line.stockItem?.itemCode || '-'}</td>
                        <td>{quantity}</td>
                        <td>
                          <strong>{line.stockItem?.itemName || '-'}</strong>
                          {line.notes ? <small>{line.notes}</small> : null}
                        </td>
                        <td>{formatMoney(unitCost)}</td>
                        <td>{formatMoney(totalCost)}</td>
                      </tr>
                    );
                  })
                )}

                {Array.from({ length: Math.max(0, 8 - lines.length) }).map((_, index) => (
                  <tr key={`blank-${index}`} className="blank-row">
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}

                <tr className="requisition-total-row">
                  <td colSpan={4}>Total Requisition Value</td>
                  <td>{formatMoney(totalValue)}</td>
                </tr>
              </tbody>
            </table>

            <div className="requisition-section-title">TO BE COMPLETED INTERNALLY</div>

            <div className="requisition-info-grid">
              <div className="requisition-info-line">
                <span>Project Name:</span>
                <strong>{movement.projectCode || movement.site || '-'}</strong>
              </div>

              <div className="requisition-info-line">
                <span>Cost Centre:</span>
                <strong>{movement.department || '-'}</strong>
              </div>
            </div>

            <div className="signature-grid">
              <div className="signature-cell">
                <span>Stores Officer:</span>
                <strong>{movement.postedBy || ''}</strong>
                <em>Signature:</em>
              </div>

              <div className="signature-cell">
                <span>Project Manager:</span>
                <strong></strong>
                <em>Signature:</em>
              </div>

              <div className="signature-cell">
                <span>HOD:</span>
                <strong>{movement.approvedBy || ''}</strong>
                <em>Signature:</em>
              </div>

              <div className="signature-cell">
                <span>Director:</span>
                <strong></strong>
                <em>Signature:</em>
              </div>
            </div>

            <div className="requisition-section-title">APPROVAL HISTORY</div>

            <table className="requisition-table">
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
                      <td>{entry.approvalLevel || '-'}</td>
                      <td>
                        <span className={approvalBadgeClass(entry.decision)}>
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

            <div className="requisition-section-title">TO BE COMPLETED WHEN PICKED UP</div>

            <div className="pickup-grid">
              <div className="signature-cell">
                <span>Picked Up By:</span>
                <strong></strong>
                <em>Signature:</em>
              </div>

              <div className="signature-cell">
                <span>Date:</span>
                <strong></strong>
              </div>

              <div className="signature-cell">
                <span>Security:</span>
                <strong></strong>
                <em>Signature:</em>
              </div>

              <div className="signature-cell">
                <span>Date:</span>
                <strong></strong>
              </div>
            </div>

            <div className="requisition-footer">
              <div>
                <span>Requested By:</span>
                <strong>{movement.requestedBy || '-'}</strong>
              </div>

              <div>
                <span>Reason:</span>
                <strong>{movement.reason || '-'}</strong>
              </div>

              <div>
                <span>Movement Type:</span>
                <strong>{movement.movementType || '-'}</strong>
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
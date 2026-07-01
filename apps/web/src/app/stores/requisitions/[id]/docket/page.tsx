'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  ApprovalWorkflowRecord,
  getApprovalWorkflows,
} from '@/lib/approvals-api';
import {
  StoresRequisitionRecord,
  getStoresRequisition,
} from '@/lib/stores-api';

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

function getPayload(record?: ApprovalWorkflowRecord | null) {
  if (!record?.payload) return {};

  if (typeof record.payload === 'string') {
    try {
      return JSON.parse(record.payload);
    } catch {
      return {};
    }
  }

  return record.payload;
}

function getHistory(record?: ApprovalWorkflowRecord | null) {
  const payload = getPayload(record);
  return Array.isArray(payload.history) ? payload.history : [];
}

function getApprovedDate(record?: StoresRequisitionRecord | null, approval?: ApprovalWorkflowRecord | null) {
  if (record?.approvedAt) return record.approvedAt;

  const history = getHistory(approval);
  const lastApproval = [...history].reverse().find((item: any) => item.action === 'APPROVED');

  return lastApproval?.actionedAt || record?.updatedAt || record?.submittedAt || record?.createdAt;
}

function getFinalApprover(record?: StoresRequisitionRecord | null, approval?: ApprovalWorkflowRecord | null) {
  if (record?.approvedBy) return record.approvedBy;

  const history = getHistory(approval);
  const lastApproval = [...history].reverse().find((item: any) => item.action === 'APPROVED');

  return lastApproval?.actionedBy || lastApproval?.actionedByEmail || '-';
}

export default function StoresDeliveryDocketPage() {
  const params = useParams<{ id: string }>();
  const requisitionId = params?.id;

  const [record, setRecord] = useState<StoresRequisitionRecord | null>(null);
  const [approval, setApproval] = useState<ApprovalWorkflowRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    if (!requisitionId) return;

    setLoading(true);
    setError('');

    try {
      const requisition = await getStoresRequisition(requisitionId);
      setRecord(requisition);

      if (requisition.approvalRequestId) {
        const workflows = await getApprovalWorkflows();
        const matched = workflows.find((item) => item.id === requisition.approvalRequestId) || null;
        setApproval(matched);
      } else {
        setApproval(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load delivery docket.');
      setRecord(null);
      setApproval(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [requisitionId]);

  const totalValue = useMemo(() => {
    return (record?.lines || []).reduce((sum, line) => sum + asNumber(line.totalCost), 0);
  }, [record]);

  const history = getHistory(approval);
  const isApproved = record?.status === 'APPROVED' || approval?.status === 'APPROVED';

  return (
    <main className="employee-portal-page docket-page">
      <section className="employee-portal-shell docket-shell">
        <nav className="employee-portal-nav no-print">
          <div>
            <strong>Southin Operations Hub</strong>
            <span>Stores Issue / Delivery Docket</span>
          </div>

          <div className="employee-portal-nav-links">
            <Link href={`/stores/requisitions/${requisitionId}`}>Back to Requisition</Link>
            <Link href="/stores/requisitions">Stores Requisitions</Link>
            <button type="button" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        </nav>

        {loading ? <div className="notice">Loading delivery docket...</div> : null}

        {error ? (
          <div className="notice danger">
            {error}
            <div style={{ marginTop: 12 }}>
              <Link className="btn-secondary" href="/stores/requisitions">
                Return to Stores Requisitions
              </Link>
            </div>
          </div>
        ) : null}

        {record ? (
          <section className="docket-document">
            <div className="docket-header">
              <div>
                <p className="eyebrow">Southin Operations Hub</p>
                <h1>Stores Issue / Delivery Docket</h1>
                <p>
                  This docket confirms that the listed stores items were approved for issue and
                  handed over to the requester or authorised receiver.
                </p>
              </div>

              <div className="docket-status-box">
                <span>Status</span>
                <strong>{isApproved ? 'APPROVED FOR ISSUE' : record.status}</strong>
                <small>{record.requisitionNo}</small>
              </div>
            </div>

            {!isApproved ? (
              <div className="notice danger no-print" style={{ marginBottom: '1rem' }}>
                This requisition is not fully approved yet. Print the docket only after final
                approval.
              </div>
            ) : null}

            <div className="docket-grid">
              <div>
                <span>Requisition No.</span>
                <strong>{record.requisitionNo}</strong>
              </div>

              <div>
                <span>Approval Request No.</span>
                <strong>{record.approvalRequestId || '-'}</strong>
              </div>

              <div>
                <span>Requester</span>
                <strong>{record.requestedBy || '-'}</strong>
              </div>

              <div>
                <span>Requester Email</span>
                <strong>{record.requestedByEmail || '-'}</strong>
              </div>

              <div>
                <span>Department</span>
                <strong>{record.department || '-'}</strong>
              </div>

              <div>
                <span>Site</span>
                <strong>{record.site || '-'}</strong>
              </div>

              <div>
                <span>Branch</span>
                <strong>{record.branch || '-'}</strong>
              </div>

              <div>
                <span>Date Approved</span>
                <strong>{formatDate(getApprovedDate(record, approval))}</strong>
              </div>

              <div>
                <span>Final Approved By</span>
                <strong>{getFinalApprover(record, approval)}</strong>
              </div>

              <div>
                <span>Total Value</span>
                <strong>{money(totalValue || record.totalValue)}</strong>
              </div>
            </div>

            <section className="docket-section">
              <h2>Items Approved for Issue</h2>

              <table className="docket-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Code</th>
                    <th>Item Description</th>
                    <th>Qty Requested</th>
                    <th>Qty Issued</th>
                    <th>UOM</th>
                    <th>Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {!(record.lines || []).length ? (
                    <tr>
                      <td colSpan={7}>No line items found.</td>
                    </tr>
                  ) : (
                    (record.lines || []).map((line, index) => (
                      <tr key={line.id}>
                        <td>{index + 1}</td>
                        <td>{line.itemCode || '-'}</td>
                        <td>
                          <strong>{line.itemName}</strong>
                          <br />
                          <span>{line.description || '-'}</span>
                        </td>
                        <td>{asNumber(line.quantity)}</td>
                        <td className="manual-cell">&nbsp;</td>
                        <td>{line.unitOfMeasure}</td>
                        <td>{line.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="docket-section">
              <h2>Approval Trail</h2>

              <table className="docket-table">
                <thead>
                  <tr>
                    <th>Step</th>
                    <th>Action</th>
                    <th>Actioned By</th>
                    <th>Comments</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {!history.length ? (
                    <tr>
                      <td colSpan={5}>No approval history found.</td>
                    </tr>
                  ) : (
                    history.map((item: any, index: number) => (
                      <tr key={`${item.actionedAt}-${index}`}>
                        <td>{item.stepSequence || index + 1}</td>
                        <td>{item.action}</td>
                        <td>
                          <strong>{item.actionedBy || '-'}</strong>
                          <br />
                          <span>{item.actionedByEmail || '-'}</span>
                        </td>
                        <td>{item.comments || '-'}</td>
                        <td>{formatDate(item.actionedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            <section className="docket-section signature-section">
              <h2>Issue Confirmation</h2>

              <div className="signature-grid">
                <div>
                  <span>Issued By</span>
                  <strong>&nbsp;</strong>
                </div>

                <div>
                  <span>Issued Date</span>
                  <strong>&nbsp;</strong>
                </div>

                <div>
                  <span>Received By</span>
                  <strong>&nbsp;</strong>
                </div>

                <div>
                  <span>Receiver Employee No.</span>
                  <strong>&nbsp;</strong>
                </div>

                <div>
                  <span>Receiver Signature</span>
                  <strong>&nbsp;</strong>
                </div>

                <div>
                  <span>Stores Signature</span>
                  <strong>&nbsp;</strong>
                </div>
              </div>

              <div className="comments-box">
                <span>Comments / Variance Notes</span>
              </div>
            </section>

            <footer className="docket-footer">
              <span>Generated from Southin Operations Hub</span>
              <span>Printed: {formatDate(new Date().toISOString())}</span>
            </footer>
          </section>
        ) : null}
      </section>

      <style jsx global>{`
        .docket-shell {
          max-width: 1120px;
        }

        .docket-document {
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
        }

        .docket-header {
          display: flex;
          justify-content: space-between;
          gap: 2rem;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .docket-header h1 {
          margin: 0;
          color: #020617;
          font-size: 2rem;
        }

        .docket-header p {
          margin: 0.5rem 0 0;
          color: #475569;
        }

        .docket-status-box {
          min-width: 230px;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 1rem;
          text-align: right;
        }

        .docket-status-box span,
        .docket-grid span,
        .signature-grid span,
        .comments-box span {
          display: block;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .docket-status-box strong {
          display: block;
          color: #15803d;
          font-size: 1rem;
          margin-top: 0.35rem;
        }

        .docket-status-box small {
          display: block;
          margin-top: 0.35rem;
          color: #0f172a;
          font-weight: 800;
        }

        .docket-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .docket-grid div,
        .signature-grid div,
        .comments-box {
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0.85rem;
          min-height: 64px;
        }

        .docket-grid strong {
          display: block;
          margin-top: 0.35rem;
          color: #020617;
        }

        .docket-section {
          margin-top: 1.5rem;
        }

        .docket-section h2 {
          margin: 0 0 0.75rem;
          color: #020617;
          font-size: 1.1rem;
        }

        .docket-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #cbd5e1;
          overflow: hidden;
          border-radius: 0.75rem;
        }

        .docket-table th,
        .docket-table td {
          border: 1px solid #cbd5e1;
          padding: 0.65rem;
          text-align: left;
          vertical-align: top;
          font-size: 0.86rem;
        }

        .docket-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .manual-cell {
          min-width: 100px;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .signature-grid strong {
          display: block;
          min-height: 38px;
          border-bottom: 1px solid #0f172a;
        }

        .comments-box {
          margin-top: 1rem;
          min-height: 90px;
        }

        .docket-footer {
          display: flex;
          justify-content: space-between;
          color: #64748b;
          border-top: 1px solid #cbd5e1;
          margin-top: 1.5rem;
          padding-top: 1rem;
          font-size: 0.8rem;
        }

        @media print {
          body {
            background: white !important;
          }

          .no-print,
          .employee-portal-nav {
            display: none !important;
          }

          .employee-portal-page {
            background: white !important;
            padding: 0 !important;
          }

          .employee-portal-shell,
          .docket-shell {
            max-width: none !important;
            width: 100% !important;
            padding: 0 !important;
          }

          .docket-document {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </main>
  );
}
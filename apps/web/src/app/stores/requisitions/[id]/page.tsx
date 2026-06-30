'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalWorkflowRecord,
  approveApprovalWorkflow,
  getApprovalWorkflows,
  rejectApprovalWorkflow,
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

function getWorkflowStatus(record?: ApprovalWorkflowRecord | null) {
  if (!record) return '-';
  const payload = getPayload(record);
  return payload.workflowStatus || record.status;
}

function getCurrentStepLabel(record?: ApprovalWorkflowRecord | null) {
  if (!record) return '-';

  const payload = getPayload(record);

  return (
    payload?.nextStep?.label ||
    payload?.firstStep?.label ||
    (record as any).currentStepRole ||
    `Step ${record.currentStep || 1}`
  );
}

function getCurrentRole(record?: ApprovalWorkflowRecord | null) {
  if (!record) return '-';

  const payload = getPayload(record);

  return (
    (record as any).currentStepRole ||
    (record as any).currentApprovalRole ||
    payload?.nextStep?.role ||
    payload?.firstStep?.role ||
    '-'
  );
}

function getCurrentApprover(record?: ApprovalWorkflowRecord | null) {
  if (!record) return '-';

  return (
    (record as any).currentApproverEmail ||
    (record as any).assignedToEmail ||
    (record as any).approverEmail ||
    getPayload(record)?.resolvedApprover?.approver?.email ||
    getPayload(record)?.resolvedApprover?.originalApprover?.email ||
    '-'
  );
}

function getHistory(record?: ApprovalWorkflowRecord | null) {
  const payload = getPayload(record);
  return Array.isArray(payload.history) ? payload.history : [];
}

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED') return 'status-pill success';
  if (status === 'REJECTED') return 'status-pill danger';
  if (status === 'APPROVER_NOT_CONFIGURED') return 'status-pill danger';

  return 'status-pill warning';
}

export default function StoresRequisitionDetailPage() {
  const params = useParams<{ id: string }>();
  const requisitionId = params?.id;

  const [record, setRecord] = useState<StoresRequisitionRecord | null>(null);
  const [approval, setApproval] = useState<ApprovalWorkflowRecord | null>(null);
  const [comments, setComments] = useState('');
  const [actioning, setActioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
      setError(err?.message || 'Unable to load stores requisition.');
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

  async function handleApprove() {
    if (!approval) return;

    setActioning(true);
    setMessage('');
    setError('');

    try {
      const approverEmail = getCurrentApprover(approval);

      const result = await approveApprovalWorkflow(approval.id, {
        approvedBy: approverEmail,
        approvedByEmail: approverEmail,
        actionedBy: approverEmail,
        actionedByEmail: approverEmail,
        comments: comments || 'Approved from stores requisition page.',
      });

      setMessage(`Approval completed. Status: ${result.status}`);
      setComments('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to approve requisition.');
    } finally {
      setActioning(false);
    }
  }

  async function handleReject() {
    if (!approval) return;

    setActioning(true);
    setMessage('');
    setError('');

    try {
      const approverEmail = getCurrentApprover(approval);

      const result = await rejectApprovalWorkflow(approval.id, {
        rejectedBy: approverEmail,
        rejectedByEmail: approverEmail,
        actionedBy: approverEmail,
        actionedByEmail: approverEmail,
        comments: comments || 'Rejected from stores requisition page.',
        rejectionReason: comments || 'Rejected from stores requisition page.',
      });

      setMessage(`Requisition rejected. Status: ${result.status}`);
      setComments('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to reject requisition.');
    } finally {
      setActioning(false);
    }
  }

  return (
    <AppShell>
      <RequireStaffRole
        allowedRoles={[
          'ADMIN',
          'DIRECTOR',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
          'ASSET_MANAGER',
          'LINE_MANAGER',
          'SUPERVISOR',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Stores Management</p>
              <h1>{record?.requisitionNo || 'Stores Requisition'}</h1>
              <p className="muted">
                View requisition details, approval status, current approver and approval history.
              </p>
            </div>

            <div className="action-row">
              <Link className="btn-secondary" href="/stores/requisitions">
                Back to Requisitions
              </Link>

              <button className="btn-secondary" type="button" onClick={loadData}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          {!record && !loading ? (
            <div className="finance-card">Stores requisition could not be loaded.</div>
          ) : null}

          {record ? (
            <>
              <div className="summary-grid">
                <div className="leave-summary-card">
                  <span>Status</span>
                  <strong>{record.status}</strong>
                </div>

                <div className="leave-summary-card">
                  <span>Workflow Status</span>
                  <strong>{getWorkflowStatus(approval)}</strong>
                </div>

                <div className="leave-summary-card">
                  <span>Current Step</span>
                  <strong>{getCurrentStepLabel(approval)}</strong>
                </div>

                <div className="leave-summary-card">
                  <span>Current Role</span>
                  <strong>{getCurrentRole(approval)}</strong>
                </div>

                <div className="leave-summary-card">
                  <span>Current Approver</span>
                  <strong>{getCurrentApprover(approval)}</strong>
                </div>

                <div className="leave-summary-card">
                  <span>Total Value</span>
                  <strong>{money(totalValue || record.totalValue)}</strong>
                </div>
              </div>

              <div className="finance-card">
                <h2>Requisition Details</h2>

                <div className="mini-detail-grid">
                  <div>
                    <span>Requested By</span>
                    <strong>{record.requestedBy || '-'}</strong>
                  </div>

                  <div>
                    <span>Email</span>
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
                    <span>Submitted</span>
                    <strong>{formatDate(record.submittedAt || record.createdAt)}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <span className={statusClass(record.status)}>{record.status}</span>
                </div>

                <p className="muted" style={{ marginTop: '1rem' }}>
                  {record.reason || record.description || 'No reason supplied.'}
                </p>
              </div>

              <div className="finance-card">
                <h2>Line Items</h2>

                <div className="employee-table-wrap">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>UOM</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                        <th>Notes</th>
                      </tr>
                    </thead>

                    <tbody>
                      {!(record.lines || []).length ? (
                        <tr>
                          <td colSpan={7}>No line items found.</td>
                        </tr>
                      ) : (
                        (record.lines || []).map((line) => (
                          <tr key={line.id}>
                            <td>{line.itemCode || '-'}</td>
                            <td>
                              <strong>{line.itemName}</strong>
                              <br />
                              <span className="muted">{line.description || '-'}</span>
                            </td>
                            <td>{asNumber(line.quantity)}</td>
                            <td>{line.unitOfMeasure}</td>
                            <td>{money(line.unitCost)}</td>
                            <td>{money(line.totalCost)}</td>
                            <td>{line.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {approval ? (
                <div className="finance-card">
                  <h2>Approval Action</h2>

                  <div className="mini-detail-grid">
                    <div>
                      <span>Approval Request</span>
                      <strong>{approval.id}</strong>
                    </div>

                    <div>
                      <span>Current Step</span>
                      <strong>{getCurrentStepLabel(approval)}</strong>
                    </div>

                    <div>
                      <span>Current Role</span>
                      <strong>{getCurrentRole(approval)}</strong>
                    </div>

                    <div>
                      <span>Current Approver</span>
                      <strong>{getCurrentApprover(approval)}</strong>
                    </div>
                  </div>

                  <label style={{ display: 'block', marginTop: '1rem' }}>
                    Comments
                    <textarea
                      value={comments}
                      onChange={(event) => setComments(event.target.value)}
                      placeholder="Add approval or rejection comments."
                    />
                  </label>

                  <div className="action-row" style={{ marginTop: '1rem' }}>
                    <button
                      className="btn"
                      type="button"
                      disabled={actioning || approval.status === 'APPROVED' || approval.status === 'REJECTED'}
                      onClick={handleApprove}
                    >
                      {actioning ? 'Processing...' : 'Approve'}
                    </button>

                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={actioning || approval.status === 'APPROVED' || approval.status === 'REJECTED'}
                      onClick={handleReject}
                    >
                      Reject
                    </button>

                    <Link className="btn-secondary" href="/approvals/inbox">
                      Open Inbox
                    </Link>
                  </div>

                  <h3 style={{ marginTop: '1.5rem' }}>Approval History</h3>

                  {!getHistory(approval).length ? (
                    <p className="muted">No approval actions recorded yet.</p>
                  ) : (
                    <div className="employee-table-wrap">
                      <table className="employee-table">
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
                          {getHistory(approval).map((item: any, index: number) => (
                            <tr key={`${item.actionedAt}-${index}`}>
                              <td>{item.stepSequence}</td>
                              <td>{item.action}</td>
                              <td>
                                <strong>{item.actionedBy}</strong>
                                <br />
                                <span className="muted">{item.actionedByEmail}</span>
                              </td>
                              <td>{item.comments || '-'}</td>
                              <td>{formatDate(item.actionedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="alert warning">
                  This requisition does not have an approval request linked.
                </div>
              )}
            </>
          ) : null}
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalWorkflowRecord,
  approveApprovalWorkflow,
  getApprovalInbox,
  rejectApprovalWorkflow,
} from '@/lib/approvals-api';

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

function formatAmount(value?: string | number | null) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount) || amount === 0) return '-';

  return `K ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPayload(record: ApprovalWorkflowRecord) {
  if (!record.payload) return {};

  if (typeof record.payload === 'string') {
    try {
      return JSON.parse(record.payload);
    } catch {
      return {};
    }
  }

  return record.payload;
}

function getWorkflowStatus(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  return payload.workflowStatus || record.status;
}

function getCurrentStepLabel(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  const nextStep = payload.nextStep;
  const firstStep = payload.firstStep;

  if (nextStep?.label) return nextStep.label;
  if (firstStep?.label && Number(record.currentStep || 1) === Number(firstStep.sequence || 1)) {
    return firstStep.label;
  }

  return (record as any).currentStepRole || `Step ${record.currentStep || 1}`;
}

function getCurrentRole(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);

  return (
    (record as any).currentStepRole ||
    (record as any).currentApprovalRole ||
    payload?.nextStep?.role ||
    payload?.firstStep?.role ||
    '-'
  );
}

function getCurrentApprover(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  const resolved = payload.resolvedApprover;

  return (
    (record as any).currentApproverEmail ||
    (record as any).assignedToEmail ||
    (record as any).approverEmail ||
    resolved?.approver?.email ||
    resolved?.originalApprover?.email ||
    '-'
  );
}

function getHistory(record: ApprovalWorkflowRecord) {
  const payload = getPayload(record);
  return Array.isArray(payload.history) ? payload.history : [];
}

export default function ApprovalInboxPage() {
  const [records, setRecords] = useState<ApprovalWorkflowRecord[]>([]);
  const [approverEmail, setApproverEmail] = useState('');
  const [selected, setSelected] = useState<ApprovalWorkflowRecord | null>(null);
  const [comments, setComments] = useState('');
  const [actioning, setActioning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData(email = approverEmail) {
    setLoading(true);
    setError('');

    try {
      const data = await getApprovalInbox(email.trim() || undefined);
      setRecords(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load approval inbox.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    return {
      total: records.length,
      inReview: records.filter((item) => item.status === 'IN_REVIEW').length,
      submitted: records.filter((item) => item.status === 'SUBMITTED').length,
      approved: records.filter((item) => item.status === 'APPROVED').length,
      rejected: records.filter((item) => item.status === 'REJECTED').length,
    };
  }, [records]);

  async function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadData();
  }

  async function handleApprove(record: ApprovalWorkflowRecord) {
    setActioning(true);
    setMessage('');
    setError('');

    try {
      const email = approverEmail.trim() || getCurrentApprover(record);
      const result = await approveApprovalWorkflow(record.id, {
        approvedBy: email,
        approvedByEmail: email,
        actionedBy: email,
        actionedByEmail: email,
        comments: comments || 'Approved from approval inbox.',
      });

      setMessage(`Approval action completed. Status: ${result.status}`);
      setComments('');
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to approve request.');
    } finally {
      setActioning(false);
    }
  }

  async function handleReject(record: ApprovalWorkflowRecord) {
    setActioning(true);
    setMessage('');
    setError('');

    try {
      const email = approverEmail.trim() || getCurrentApprover(record);
      const result = await rejectApprovalWorkflow(record.id, {
        rejectedBy: email,
        rejectedByEmail: email,
        actionedBy: email,
        actionedByEmail: email,
        comments: comments || 'Rejected from approval inbox.',
        rejectionReason: comments || 'Rejected from approval inbox.',
      });

      setMessage(`Request rejected. Status: ${result.status}`);
      setComments('');
      setSelected(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to reject request.');
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
          'FINANCE_MANAGER',
          'HR_MANAGER',
          'LINE_MANAGER',
          'SUPERVISOR',
          'ASSET_MANAGER',
          'FLEET_MANAGER',
          'FLEET_DISPATCH_OFFICER',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Approval Workflow</p>
              <h1>Approval Inbox</h1>
              <p className="muted">
                Review pending approvals for Stores, Assets, Fleet, Finance, Procurement and HR workflows.
              </p>
            </div>

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={() => loadData()}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div className="summary-grid">
            <div className="finance-summary-card">
              <span>Total</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>In Review</span>
              <strong>{stats.inReview}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Submitted</span>
              <strong>{stats.submitted}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approved</span>
              <strong>{stats.approved}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Rejected</span>
              <strong>{stats.rejected}</strong>
            </div>
          </div>

          <div className="finance-card">
            <h2>Filter Inbox</h2>

            <form className="form-grid" onSubmit={handleFilter}>
              <label>
                Approver Email
                <input
                  value={approverEmail}
                  onChange={(event) => setApproverEmail(event.target.value)}
                  placeholder="site.manager@southincon.com"
                />
              </label>

              <div className="form-actions">
                <button className="btn" type="submit">
                  Load Inbox
                </button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setApproverEmail('');
                    loadData('');
                  }}
                >
                  Show All
                </button>
              </div>
            </form>
          </div>

          <div className="finance-card">
            <h2>Pending / Recent Requests</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Workflow</th>
                    <th>Requester</th>
                    <th>Current Step</th>
                    <th>Approver</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!records.length ? (
                    <tr>
                      <td colSpan={8}>No approval requests found.</td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.requestReference || record.id.slice(0, 8)}</strong>
                          <br />
                          <span className="muted">{formatDate(record.submittedAt || record.createdAt)}</span>
                        </td>

                        <td>
                          <strong>{record.module}</strong>
                          <br />
                          <span className="muted">{record.workflowType}</span>
                        </td>

                        <td>
                          <strong>{record.requesterName || '-'}</strong>
                          <br />
                          <span className="muted">{record.requesterDepartment || record.requesterSite || '-'}</span>
                        </td>

                        <td>
                          <strong>{getCurrentStepLabel(record)}</strong>
                          <br />
                          <span className="muted">{getCurrentRole(record)}</span>
                        </td>

                        <td>{getCurrentApprover(record)}</td>
                        <td>{formatAmount(record.amount)}</td>

                        <td>
                          <span
                            className={
                              record.status === 'APPROVED'
                                ? 'status-pill success'
                                : record.status === 'REJECTED'
                                  ? 'status-pill danger'
                                  : 'status-pill warning'
                            }
                          >
                            {getWorkflowStatus(record)}
                          </span>
                        </td>

                        <td>
                          <div className="action-row">
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => {
                                setSelected(record);
                                setComments('');
                              }}
                            >
                              Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="finance-card">
              <h2>Review Request</h2>

              <div className="mini-detail-grid">
                <div>
                  <span>Reference</span>
                  <strong>{selected.requestReference || selected.id}</strong>
                </div>
                <div>
                  <span>Title</span>
                  <strong>{selected.requestTitle}</strong>
                </div>
                <div>
                  <span>Current Step</span>
                  <strong>{getCurrentStepLabel(selected)}</strong>
                </div>
                <div>
                  <span>Current Approver</span>
                  <strong>{getCurrentApprover(selected)}</strong>
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
                <button className="btn" type="button" disabled={actioning} onClick={() => handleApprove(selected)}>
                  {actioning ? 'Processing...' : 'Approve'}
                </button>

                <button
                  className="btn-secondary"
                  type="button"
                  disabled={actioning}
                  onClick={() => handleReject(selected)}
                >
                  Reject
                </button>

                <button className="btn-secondary" type="button" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              <h3 style={{ marginTop: '1.5rem' }}>Approval History</h3>

              {!getHistory(selected).length ? (
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
                      {getHistory(selected).map((item: any, index: number) => (
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
          ) : null}
        </section>
      </RequireStaffRole>
    </AppShell>
  );
}
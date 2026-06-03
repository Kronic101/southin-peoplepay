'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  directorApprovePayrollRun,
  financeReviewPayrollRun,
  generatePayslipsForRun,
  hrReviewPayrollRun,
  lockPayrollRun,
  submitPayrollRunToDirector,
  submitPayrollRunToFinance,
  submitPayrollRunToHr,
} from '@/lib/api';

type Props = {
  run: any;
};

type PendingAction = {
  title: string;
  defaultComment: string;
  action: (comments: string) => Promise<unknown>;
  successMessage: string;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

export function PayrollWorkflowPanel({ run }: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [comments, setComments] = useState('');

  async function runWorkflowAction(action: () => Promise<unknown>, successMessage: string) {
    setMessage('');
    setSaving(true);

    try {
      await action();
      setMessage(successMessage);
      setPendingAction(null);
      setComments('');
      router.refresh();
    } catch {
      setMessage('Workflow action failed. Confirm the payroll status and check the API terminal.');
    } finally {
      setSaving(false);
    }
  }

  function openWorkflowModal(action: PendingAction) {
    setPendingAction(action);
    setComments(action.defaultComment);
    setMessage('');
  }

  async function submitModalAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pendingAction) return;

    await runWorkflowAction(
      () => pendingAction.action(comments.trim() || pendingAction.defaultComment),
      pendingAction.successMessage,
    );
  }

  const status = run.status;

  return (
    <section className="workflow-panel">
      <div className="workflow-header">
        <div>
          <h3>Payroll Review Workflow</h3>
          <p className="muted">
            Current status: <strong>{statusLabel(status)}</strong>
          </p>
        </div>

        <div className="workflow-actions">
          {(status === 'OPEN' || status === 'PROCESSING') && (
            <button
              className="btn"
              disabled={saving}
              onClick={() =>
                openWorkflowModal({
                  title: 'Submit Payroll to HR',
                  defaultComment: 'Payroll prepared and submitted for HR review.',
                  successMessage: 'Payroll submitted to HR review.',
                  action: (workflowComments) =>
                    submitPayrollRunToHr(run.id, {
                      actorId: 'payroll-officer-dev',
                      comments: workflowComments,
                    }),
                })
              }
              type="button"
            >
              Submit to HR
            </button>
          )}

          {status === 'SUBMITTED_HR_REVIEW' && (
            <>
              <button
                className="btn"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'HR Approve Payroll',
                    defaultComment: 'HR has checked employee records, attendance and changes.',
                    successMessage: 'HR review approved.',
                    action: (workflowComments) =>
                      hrReviewPayrollRun(run.id, {
                        actorId: 'hr-manager-dev',
                        approved: true,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                HR Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'HR Reject Payroll',
                    defaultComment: 'Rejected by HR. Payroll requires correction.',
                    successMessage: 'Payroll rejected by HR.',
                    action: (workflowComments) =>
                      hrReviewPayrollRun(run.id, {
                        actorId: 'hr-manager-dev',
                        approved: false,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                HR Reject
              </button>
            </>
          )}

          {status === 'HR_REVIEWED' && (
            <button
              className="btn"
              disabled={saving}
              onClick={() =>
                openWorkflowModal({
                  title: 'Submit Payroll to Finance',
                  defaultComment: 'Submitted to Finance for deduction and total validation.',
                  successMessage: 'Payroll submitted to Finance review.',
                  action: (workflowComments) =>
                    submitPayrollRunToFinance(run.id, {
                      actorId: 'hr-manager-dev',
                      comments: workflowComments,
                    }),
                })
              }
              type="button"
            >
              Submit to Finance
            </button>
          )}

          {status === 'SUBMITTED_FINANCE_REVIEW' && (
            <>
              <button
                className="btn"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'Finance Approve Payroll',
                    defaultComment: 'Finance has validated totals, deductions and bank payment preparation.',
                    successMessage: 'Finance review approved.',
                    action: (workflowComments) =>
                      financeReviewPayrollRun(run.id, {
                        actorId: 'finance-manager-dev',
                        approved: true,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                Finance Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'Finance Reject Payroll',
                    defaultComment: 'Rejected by Finance. Payroll requires correction.',
                    successMessage: 'Payroll rejected by Finance.',
                    action: (workflowComments) =>
                      financeReviewPayrollRun(run.id, {
                        actorId: 'finance-manager-dev',
                        approved: false,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                Finance Reject
              </button>
            </>
          )}

          {status === 'FINANCE_REVIEWED' && (
            <button
              className="btn"
              disabled={saving}
              onClick={() =>
                openWorkflowModal({
                  title: 'Submit Payroll to Director',
                  defaultComment: 'Submitted to Director for final approval.',
                  successMessage: 'Payroll submitted to Director.',
                  action: (workflowComments) =>
                    submitPayrollRunToDirector(run.id, {
                      actorId: 'finance-manager-dev',
                      comments: workflowComments,
                    }),
                })
              }
              type="button"
            >
              Submit to Director
            </button>
          )}

          {status === 'SUBMITTED_DIRECTOR_APPROVAL' && (
            <>
              <button
                className="btn"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'Director Approve Payroll',
                    defaultComment: 'Director approved payroll.',
                    successMessage: 'Director approved payroll.',
                    action: (workflowComments) =>
                      directorApprovePayrollRun(run.id, {
                        actorId: 'director-dev',
                        approved: true,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                Director Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'Director Reject Payroll',
                    defaultComment: 'Rejected by Director. Payroll requires correction.',
                    successMessage: 'Payroll rejected by Director.',
                    action: (workflowComments) =>
                      directorApprovePayrollRun(run.id, {
                        actorId: 'director-dev',
                        approved: false,
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                Director Reject
              </button>
            </>
          )}

          {status === 'DIRECTOR_APPROVED' && (
            <button
              className="btn"
              disabled={saving}
              onClick={() =>
                openWorkflowModal({
                  title: 'Lock Payroll',
                  defaultComment: 'Payroll locked after Director approval.',
                  successMessage: 'Payroll locked successfully.',
                  action: (workflowComments) =>
                    lockPayrollRun(run.id, {
                      actorId: 'payroll-officer-dev',
                      comments: workflowComments,
                    }),
                })
              }
              type="button"
            >
              Lock Payroll
            </button>
          )}

          {status === 'LOCKED' && (
            <>
              <span className="status-pill locked">Payroll Locked</span>

              <button
                className="btn"
                disabled={saving}
                onClick={() =>
                  openWorkflowModal({
                    title: 'Generate Payslips',
                    defaultComment: 'Payslips generated after payroll lock.',
                    successMessage: 'Payslip generation completed.',
                    action: (workflowComments) =>
                      generatePayslipsForRun(run.id, {
                        actorId: 'payroll-officer-dev',
                        comments: workflowComments,
                      }),
                  })
                }
                type="button"
              >
                Generate Payslips
              </button>
            </>
          )}

          {status === 'REJECTED' && <span className="status-pill rejected">Payroll Rejected</span>}
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="workflow-grid">
        <div className="workflow-step">
          <span className="workflow-label">Prepared By</span>
          <strong>{run.preparedBy || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Submitted At</span>
          <strong>{formatDateTime(run.submittedAt)}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">HR Reviewed By</span>
          <strong>{run.hrReviewedBy || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Finance Reviewed By</span>
          <strong>{run.financeReviewedBy || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Director Approved By</span>
          <strong>{run.directorApprovedBy || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Locked At</span>
          <strong>{formatDateTime(run.lockedAt)}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <h3>Approval Timeline</h3>

        <table>
          <thead>
            <tr>
              <th>Stage</th>
              <th>Role</th>
              <th>Approver</th>
              <th>Status</th>
              <th>Comments</th>
              <th>Approved At</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {!run.approvals || run.approvals.length === 0 ? (
              <tr>
                <td colSpan={7}>No approval records yet.</td>
              </tr>
            ) : (
              run.approvals.map((approval: any) => (
                <tr key={approval.id}>
                  <td>{statusLabel(approval.approvalStage)}</td>
                  <td>{statusLabel(approval.approverRole)}</td>
                  <td>{approval.approverId || '-'}</td>
                  <td>{approval.status}</td>
                  <td>{approval.comments || '-'}</td>
                  <td>{formatDateTime(approval.approvedAt)}</td>
                  <td>{formatDateTime(approval.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pendingAction && (
        <div className="modal-backdrop" role="presentation">
          <div className="workflow-modal" role="dialog" aria-modal="true" aria-labelledby="workflow-modal-title">
            <div className="modal-header">
              <div>
                <h3 id="workflow-modal-title">{pendingAction.title}</h3>
                <p className="muted">Review or amend the workflow comments before submitting.</p>
              </div>

              <button
                className="modal-close"
                disabled={saving}
                onClick={() => {
                  setPendingAction(null);
                  setComments('');
                }}
                type="button"
              >
                ×
              </button>
            </div>

            <form onSubmit={submitModalAction}>
              <label>
                Comments
                <textarea
                  autoFocus
                  rows={5}
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  className="btn-secondary"
                  disabled={saving}
                  onClick={() => {
                    setPendingAction(null);
                    setComments('');
                  }}
                  type="button"
                >
                  Cancel
                </button>

                <button className="btn" disabled={saving} type="submit">
                  {saving ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
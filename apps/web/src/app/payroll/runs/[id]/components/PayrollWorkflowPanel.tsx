'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  directorApprovePayrollRun,
  financeReviewPayrollRun,
  hrReviewPayrollRun,
  lockPayrollRun,
  submitPayrollRunToDirector,
  submitPayrollRunToFinance,
  submitPayrollRunToHr,
} from '@/lib/api';

type Props = {
  run: any;
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

  async function runWorkflowAction(action: () => Promise<unknown>, successMessage: string) {
    setMessage('');
    setSaving(true);

    try {
      await action();
      setMessage(successMessage);
      router.refresh();
    } catch {
      setMessage('Workflow action failed. Confirm the payroll status and check the API terminal.');
    } finally {
      setSaving(false);
    }
  }

  function getComment(defaultComment: string) {
    return window.prompt('Comments', defaultComment) || defaultComment;
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
                runWorkflowAction(
                  () =>
                    submitPayrollRunToHr(run.id, {
                      actorId: 'payroll-officer-dev',
                      comments: getComment('Payroll prepared and submitted for HR review.'),
                    }),
                  'Payroll submitted to HR review.',
                )
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
                  runWorkflowAction(
                    () =>
                      hrReviewPayrollRun(run.id, {
                        actorId: 'hr-manager-dev',
                        approved: true,
                        comments: getComment('HR has checked employee records, attendance and changes.'),
                      }),
                    'HR review approved.',
                  )
                }
                type="button"
              >
                HR Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  runWorkflowAction(
                    () =>
                      hrReviewPayrollRun(run.id, {
                        actorId: 'hr-manager-dev',
                        approved: false,
                        comments: getComment('Rejected by HR. Payroll requires correction.'),
                      }),
                    'Payroll rejected by HR.',
                  )
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
                runWorkflowAction(
                  () =>
                    submitPayrollRunToFinance(run.id, {
                      actorId: 'hr-manager-dev',
                      comments: getComment('Submitted to Finance for deduction and total validation.'),
                    }),
                  'Payroll submitted to Finance review.',
                )
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
                  runWorkflowAction(
                    () =>
                      financeReviewPayrollRun(run.id, {
                        actorId: 'finance-manager-dev',
                        approved: true,
                        comments: getComment('Finance has validated totals, deductions and bank payment preparation.'),
                      }),
                    'Finance review approved.',
                  )
                }
                type="button"
              >
                Finance Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  runWorkflowAction(
                    () =>
                      financeReviewPayrollRun(run.id, {
                        actorId: 'finance-manager-dev',
                        approved: false,
                        comments: getComment('Rejected by Finance. Payroll requires correction.'),
                      }),
                    'Payroll rejected by Finance.',
                  )
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
                runWorkflowAction(
                  () =>
                    submitPayrollRunToDirector(run.id, {
                      actorId: 'finance-manager-dev',
                      comments: getComment('Submitted to Director for final approval.'),
                    }),
                  'Payroll submitted to Director.',
                )
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
                  runWorkflowAction(
                    () =>
                      directorApprovePayrollRun(run.id, {
                        actorId: 'director-dev',
                        approved: true,
                        comments: getComment('Director approved payroll.'),
                      }),
                    'Director approved payroll.',
                  )
                }
                type="button"
              >
                Director Approve
              </button>

              <button
                className="btn-secondary"
                disabled={saving}
                onClick={() =>
                  runWorkflowAction(
                    () =>
                      directorApprovePayrollRun(run.id, {
                        actorId: 'director-dev',
                        approved: false,
                        comments: getComment('Rejected by Director. Payroll requires correction.'),
                      }),
                    'Payroll rejected by Director.',
                  )
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
                runWorkflowAction(
                  () =>
                    lockPayrollRun(run.id, {
                      actorId: 'payroll-officer-dev',
                      comments: getComment('Payroll locked after Director approval.'),
                    }),
                  'Payroll locked successfully.',
                )
              }
              type="button"
            >
              Lock Payroll
            </button>
          )}

          {status === 'LOCKED' && <span className="status-pill locked">Payroll Locked</span>}

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
    </section>
  );
}
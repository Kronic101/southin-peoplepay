'use client';

import { useEffect, useState } from 'react';
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
import { DevRole, getDevRole } from '@/lib/dev-role';
import {
  canAccessDirectorAction,
  canAccessFinanceAction,
  canAccessHrAction,
  canAccessPayrollOfficerAction,
} from '@/lib/rbac-ui';

type Props = {
  payrollRun: any;
};

function normalize(value?: string | null) {
  return String(value || '').toUpperCase();
}

function hasApproval(run: any, stage: string) {
  const approvals = run?.approvals || run?.approvalRecords || [];
  return approvals.some(
    (approval: any) =>
      normalize(approval.stage) === stage &&
      ['APPROVED', 'COMPLETED'].includes(normalize(approval.status)),
  );
}

function hasPendingStage(run: any, stage: string) {
  const approvals = run?.approvals || run?.approvalRecords || [];
  return approvals.some(
    (approval: any) =>
      normalize(approval.stage) === stage && normalize(approval.status) === 'PENDING',
  );
}

function runIsLocked(run: any) {
  return normalize(run?.status) === 'LOCKED';
}

function payslipsGenerated(run: any) {
  const employees = run?.employees || [];
  if (employees.length === 0) return false;

  return employees.every((line: any) => {
    const payslipStatus = normalize(line?.payslipStatus || line?.payslip?.status);
    return Boolean(line?.payslip || line?.payslipId || payslipStatus === 'GENERATED');
  });
}

export function PayrollRunWorkflowActions({ payrollRun }: Props) {
  const router = useRouter();

  const [role, setRole] = useState<DevRole>('ADMIN');
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const locked = runIsLocked(payrollRun);
  const hrApproved = hasApproval(payrollRun, 'HR_REVIEW');
  const financeApproved = hasApproval(payrollRun, 'FINANCE_REVIEW');
  const directorApproved = hasApproval(payrollRun, 'DIRECTOR_APPROVAL');
  const hrPending = hasPendingStage(payrollRun, 'HR_REVIEW');
  const financePending = hasPendingStage(payrollRun, 'FINANCE_REVIEW');
  const directorPending = hasPendingStage(payrollRun, 'DIRECTOR_APPROVAL');
  const generated = payslipsGenerated(payrollRun);

  const payrollOfficer = canAccessPayrollOfficerAction(role);
  const hrManager = canAccessHrAction(role);
  const financeManager = canAccessFinanceAction(role);
  const director = canAccessDirectorAction(role);

  useEffect(() => {
    setRole(getDevRole());

    const onRoleChanged = (event: Event) => {
      const customEvent = event as CustomEvent<DevRole>;
      setRole(customEvent.detail);
      setMessage('');
      setError('');
    };

    window.addEventListener('southin-dev-role-changed', onRoleChanged);

    return () => {
      window.removeEventListener('southin-dev-role-changed', onRoleChanged);
    };
  }, []);

  async function runAction(actionName: string, action: () => Promise<any>) {
    setLoadingAction(actionName);
    setMessage('');
    setError('');

    try {
      const result = await action();
      setMessage(result?.message || `${actionName} completed successfully.`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || `${actionName} failed.`);
    } finally {
      setLoadingAction('');
    }
  }

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <div className="page-header">
        <div>
          <h3>Payroll Review Workflow</h3>
          <p className="muted">
            Current status: <strong>{payrollRun?.status || '-'}</strong>. Actions are shown based on
            the selected role and workflow state.
          </p>
        </div>

        <div className="action-row">
          {payrollOfficer && !locked && !hrPending && !hrApproved && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Submit to HR'}
              onClick={() => runAction('Submit to HR', () => submitPayrollRunToHr(payrollRun.id))}
            >
              {loadingAction === 'Submit to HR' ? 'Submitting...' : 'Submit to HR'}
            </button>
          )}

          {hrManager && hrPending && !hrApproved && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'HR Review'}
              onClick={() =>
                runAction('HR Review', () =>
                  hrReviewPayrollRun(payrollRun.id, {
                    approved: true,
                    comments: 'HR has checked employee records, attendance and changes.',
                  }),
                )
              }
            >
              {loadingAction === 'HR Review' ? 'Approving...' : 'Approve HR Review'}
            </button>
          )}

          {payrollOfficer && hrApproved && !financePending && !financeApproved && !locked && (
            <button
              className="btn-secondary"
              type="button"
              disabled={loadingAction === 'Submit to Finance'}
              onClick={() =>
                runAction('Submit to Finance', () => submitPayrollRunToFinance(payrollRun.id))
              }
            >
              {loadingAction === 'Submit to Finance'
                ? 'Submitting...'
                : 'Submit to Finance'}
            </button>
          )}

          {financeManager && financePending && !financeApproved && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Finance Review'}
              onClick={() =>
                runAction('Finance Review', () =>
                  financeReviewPayrollRun(payrollRun.id, {
                    approved: true,
                    comments: 'Finance has validated totals, deductions and payment preparation.',
                  }),
                )
              }
            >
              {loadingAction === 'Finance Review' ? 'Approving...' : 'Approve Finance Review'}
            </button>
          )}

          {payrollOfficer && financeApproved && !directorPending && !directorApproved && !locked && (
            <button
              className="btn-secondary"
              type="button"
              disabled={loadingAction === 'Submit to Director'}
              onClick={() =>
                runAction('Submit to Director', () => submitPayrollRunToDirector(payrollRun.id))
              }
            >
              {loadingAction === 'Submit to Director'
                ? 'Submitting...'
                : 'Submit to Director'}
            </button>
          )}

          {director && directorPending && !directorApproved && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Director Approval'}
              onClick={() =>
                runAction('Director Approval', () =>
                  directorApprovePayrollRun(payrollRun.id, {
                    approved: true,
                    comments: 'Director approved payroll.',
                  }),
                )
              }
            >
              {loadingAction === 'Director Approval'
                ? 'Approving...'
                : 'Approve Payroll'}
            </button>
          )}

          {director && directorApproved && !locked && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Lock Payroll'}
              onClick={() => runAction('Lock Payroll', () => lockPayrollRun(payrollRun.id))}
            >
              {loadingAction === 'Lock Payroll' ? 'Locking...' : 'Lock Payroll'}
            </button>
          )}

          {payrollOfficer && locked && !generated && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Generate Payslips'}
              onClick={() =>
                runAction('Generate Payslips', () => generatePayslipsForRun(payrollRun.id))
              }
            >
              {loadingAction === 'Generate Payslips'
                ? 'Generating...'
                : 'Generate Payslips'}
            </button>
          )}
        </div>
      </div>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice danger">{error}</div>}

      {locked && generated && (
        <div className="notice success">
          Payroll is locked and payslips have been generated. Workflow actions are now locked for
          audit control.
        </div>
      )}

      {!payrollOfficer && !hrManager && !financeManager && !director && (
        <div className="notice">
          Your selected role does not have payroll workflow permissions.
        </div>
      )}

      {role === 'HR_MANAGER' && !hrPending && !hrApproved && (
        <div className="notice">HR action will become available after Payroll submits the run.</div>
      )}

      {role === 'FINANCE_MANAGER' && !financePending && !financeApproved && (
        <div className="notice">
          Finance action will become available after HR approval and Payroll submission to Finance.
        </div>
      )}

      {role === 'DIRECTOR' && !directorPending && !directorApproved && !locked && (
        <div className="notice">
          Director action will become available after Finance approval and Payroll submission to
          Director.
        </div>
      )}
    </section>
  );
}
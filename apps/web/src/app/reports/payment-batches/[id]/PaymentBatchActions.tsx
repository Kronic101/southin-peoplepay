'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePaymentBatch,
  preparePaymentBatch,
  recheckPaymentBatchPayslips,
  validatePaymentBatchBankDetails,
} from '@/lib/api';
import { DevRole, getDevRole } from '@/lib/dev-role';

function isFinanceRole(role: DevRole) {
  return role === 'FINANCE_MANAGER' || role === 'ADMIN';
}

function isDirectorRole(role: DevRole) {
  return role === 'DIRECTOR' || role === 'ADMIN';
}

function isApproved(status?: string | null) {
  return ['APPROVED', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(String(status || '').toUpperCase());
}

function isPrepared(status?: string | null) {
  return String(status || '').toUpperCase() === 'PREPARED';
}

function isBlocked(status?: string | null) {
  return String(status || '').toUpperCase().includes('BLOCKED');
}

function isDraft(status?: string | null) {
  return String(status || '').toUpperCase() === 'DRAFT';
}

export function PaymentBatchActions({ batch }: { batch: any }) {
  const router = useRouter();

  const [role, setRole] = useState<DevRole>('ADMIN');
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const batchStatus = String(batch?.status || '').toUpperCase();

  const batchApproved = isApproved(batchStatus);
  const batchPrepared = isPrepared(batchStatus);
  const batchBlocked = isBlocked(batchStatus);
  const batchDraft = isDraft(batchStatus);

  const canFinanceAct = isFinanceRole(role) && !batchApproved;
  const canDirectorApprove = isDirectorRole(role) && batchPrepared && !batchApproved;

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
    <section style={{ marginTop: '1rem' }}>
      <div className="page-header">
        <div>
          <h3>Finance Payment Batch Actions</h3>
          <p className="muted">
            These actions are controlled workflow steps. They do not create a live bank transfer.
          </p>
        </div>

        <div className="action-row">
          {canFinanceAct && (
            <>
              <button
                className="btn-secondary"
                type="button"
                disabled={loadingAction === 'Recheck Payslips'}
                onClick={() =>
                  runAction('Recheck Payslips', () => recheckPaymentBatchPayslips(batch.id))
                }
              >
                {loadingAction === 'Recheck Payslips' ? 'Rechecking...' : 'Recheck Payslips'}
              </button>

              <button
                className="btn-secondary"
                type="button"
                disabled={loadingAction === 'Validate Bank Details'}
                onClick={() =>
                  runAction('Validate Bank Details', () => validatePaymentBatchBankDetails(batch.id))
                }
              >
                {loadingAction === 'Validate Bank Details'
                  ? 'Validating...'
                  : 'Validate Bank Details'}
              </button>
            </>
          )}

          {canFinanceAct && (batchDraft || batchBlocked) && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Prepare Batch' || batchBlocked}
              onClick={() => runAction('Prepare Batch', () => preparePaymentBatch(batch.id))}
              title={batchBlocked ? 'Resolve blocked items before preparing batch.' : undefined}
            >
              {loadingAction === 'Prepare Batch' ? 'Preparing...' : 'Prepare Batch'}
            </button>
          )}

          {canDirectorApprove && (
            <button
              className="btn"
              type="button"
              disabled={loadingAction === 'Approve Batch'}
              onClick={() => runAction('Approve Batch', () => approvePaymentBatch(batch.id))}
            >
              {loadingAction === 'Approve Batch' ? 'Approving...' : 'Approve Batch'}
            </button>
          )}
        </div>
      </div>

      {batchApproved && (
        <div className="notice success">
          This payment batch has been approved for manual payment processing. Further workflow
          actions are locked for audit control.
        </div>
      )}

      {!batchApproved && !isFinanceRole(role) && !isDirectorRole(role) && (
        <div className="notice">
          Your selected role does not have payment batch workflow permissions.
        </div>
      )}

      {!batchApproved && isDirectorRole(role) && !batchPrepared && (
        <div className="notice">
          Director approval is only available after Finance prepares the payment batch.
        </div>
      )}

      {!batchApproved && isFinanceRole(role) && batchPrepared && (
        <div className="notice">
          Finance preparation is complete. The batch is waiting for Director approval.
        </div>
      )}

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice danger">{error}</div>}

      {batchBlocked && !batchApproved && (
        <div className="notice">
          This batch is blocked because one or more payslips are missing. Generate payslips from the
          locked payroll run, then click <strong>Recheck Payslips</strong> to refresh this payment
          batch.
        </div>
      )}
    </section>
  );
}
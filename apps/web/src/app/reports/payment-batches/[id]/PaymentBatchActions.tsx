'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePaymentBatch,
  preparePaymentBatch,
  recheckPaymentBatchPayslips,
  validatePaymentBatchBankDetails,
} from '@/lib/api';

export function PaymentBatchActions({ batch }: { batch: any }) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

          <button
            className="btn"
            type="button"
            disabled={loadingAction === 'Prepare Batch'}
            onClick={() => runAction('Prepare Batch', () => preparePaymentBatch(batch.id))}
          >
            {loadingAction === 'Prepare Batch' ? 'Preparing...' : 'Prepare Batch'}
          </button>

          <button
            className="btn"
            type="button"
            disabled={loadingAction === 'Approve Batch'}
            onClick={() => runAction('Approve Batch', () => approvePaymentBatch(batch.id))}
          >
            {loadingAction === 'Approve Batch' ? 'Approving...' : 'Approve Batch'}
          </button>
        </div>
      </div>

      {message && <div className="notice success">{message}</div>}
      {error && <div className="notice danger">{error}</div>}

      {String(batch.status || '').includes('BLOCKED') && (
        <div className="notice">
          This batch is blocked because one or more payslips are missing. Generate payslips from the
          locked payroll run, then click <strong>Recheck Payslips</strong> to refresh this payment
          batch.
        </div>
      )}
    </section>
  );
}
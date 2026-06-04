'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approvePaymentBatch,
  preparePaymentBatch,
  validatePaymentBatchBankDetails,
} from '@/lib/api';

type Props = {
  batch: any;
};

export function PaymentBatchActions({ batch }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState('');

  async function handleValidateBankDetails() {
    setMessage('');
    setLoadingAction('validate');

    try {
      const items = (batch.items || []).map((item: any) => ({
        id: item.id,
        bankName: item.bankName || 'Manual Bank Validation Pending',
        bankBranch: item.bankBranch || 'Finance To Confirm',
        bankAccountNumber: item.bankAccountNumber || 'TO-BE-VALIDATED',
        bankDetailsStatus: 'VALIDATED',
        validationNotes:
          item.validationNotes || 'Bank details marked as validated in development placeholder mode.',
      }));

      await validatePaymentBatchBankDetails(batch.id, { items });

      setMessage('Bank details validation updated in placeholder mode.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to validate bank details.');
    } finally {
      setLoadingAction('');
    }
  }

  async function handlePrepareBatch() {
    setMessage('');
    setLoadingAction('prepare');

    try {
      await preparePaymentBatch(batch.id, {
        preparedBy: 'finance-manager-dev',
        evidenceNotes:
          'Payment batch prepared by Finance. No real bank file generated in this phase.',
      });

      setMessage('Payment batch prepared successfully.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to prepare payment batch.');
    } finally {
      setLoadingAction('');
    }
  }

  async function handleApproveBatch() {
    setMessage('');
    setLoadingAction('approve');

    try {
      await approvePaymentBatch(batch.id, {
        approvedBy: 'director-dev',
        evidenceNotes:
          'Payment batch approved for manual payment processing. Bank evidence must be stored separately.',
      });

      setMessage('Payment batch approved for manual processing.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to approve payment batch.');
    } finally {
      setLoadingAction('');
    }
  }

  const isApproved = batch.status === 'APPROVED';
  const canPrepare = !isApproved;
  const canApprove = batch.status === 'PREPARED';

  return (
    <div className="table-wrap">
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
            disabled={loadingAction === 'validate' || isApproved}
            onClick={handleValidateBankDetails}
          >
            {loadingAction === 'validate' ? 'Validating...' : 'Validate Bank Details'}
          </button>

          <button
            className="btn"
            type="button"
            disabled={loadingAction === 'prepare' || !canPrepare}
            onClick={handlePrepareBatch}
          >
            {loadingAction === 'prepare' ? 'Preparing...' : 'Prepare Batch'}
          </button>

          <button
            className="btn"
            type="button"
            disabled={loadingAction === 'approve' || !canApprove}
            onClick={handleApproveBatch}
          >
            {loadingAction === 'approve' ? 'Approving...' : 'Approve Batch'}
          </button>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      {batch.status === 'BLOCKED_PAYSLIPS_MISSING' && (
        <div className="notice">
          This batch is blocked because payslips are missing. Generate payslips from the locked
          payroll run, then create a new payment batch or update this workflow later to re-check
          payslip status.
        </div>
      )}
    </div>
  );
}
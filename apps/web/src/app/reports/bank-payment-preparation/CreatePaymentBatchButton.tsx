'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPaymentBatchFromPayrollRun } from '@/lib/api';

type Props = {
  payrollRunId?: string | null;
  defaultBatchName?: string;
  existingBatchId?: string | null;
};

export function CreatePaymentBatchButton({
  payrollRunId,
  defaultBatchName,
  existingBatchId,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateBatch() {
    setMessage('');

    if (existingBatchId) {
      router.push(`/reports/payment-batches/${existingBatchId}`);
      return;
    }

    if (!payrollRunId) {
      setMessage('No locked payroll run is available for payment batch creation.');
      return;
    }

    setLoading(true);

    try {
      const result = await createPaymentBatchFromPayrollRun(payrollRunId, {
        batchName: defaultBatchName || 'Payment Batch',
        preparedBy: 'finance-manager-dev',
      });

      const batchId = result?.batch?.id;

      if (!batchId) {
        setMessage('Payment batch was created, but no batch ID was returned.');
        router.refresh();
        return;
      }

      router.push(`/reports/payment-batches/${batchId}`);
    } catch (error: any) {
      const rawMessage = error?.message || 'Failed to create payment batch.';

      if (rawMessage.includes('already exists')) {
        setMessage(
          'A payment batch already exists for this payroll run. Open Payment Batches to continue.',
        );
      } else {
        setMessage(rawMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" type="button" disabled={loading} onClick={handleCreateBatch}>
        {loading
          ? 'Creating Batch...'
          : existingBatchId
            ? 'Open Existing Payment Batch'
            : 'Create Payment Batch'}
      </button>

      {message && <div className="notice">{message}</div>}
    </div>
  );
}
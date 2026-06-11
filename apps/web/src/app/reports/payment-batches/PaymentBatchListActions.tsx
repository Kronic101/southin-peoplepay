'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { recheckPaymentBatchPayslips } from '@/lib/api';

type Props = {
  batchId: string;
};

export function PaymentBatchListActions({ batchId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleRecheck() {
    setMessage('');
    setLoading(true);

    try {
      const result = await recheckPaymentBatchPayslips(batchId);

      setMessage(result?.message || 'Payment batch rechecked.');
      router.refresh();
    } catch (error: any) {
      setMessage(error?.message || 'Failed to recheck payment batch.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="action-row">
        <Link className="btn-secondary" href={`/reports/payment-batches/${batchId}`}>
          Open Batch
        </Link>

        <button className="btn" type="button" disabled={loading} onClick={handleRecheck}>
          {loading ? 'Rechecking...' : 'Recheck Payslips'}
        </button>
      </div>

      {message && <div className="notice compact-notice">{message}</div>}
    </div>
  );
}
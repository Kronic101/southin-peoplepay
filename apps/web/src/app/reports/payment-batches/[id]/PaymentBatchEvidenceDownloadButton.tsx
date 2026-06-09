'use client';

import { useState } from 'react';
import { downloadPaymentBatchEvidenceCsv } from '@/lib/api';

export function PaymentBatchEvidenceDownloadButton({ batchId }: { batchId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleDownload() {
    setLoading(true);
    setMessage('');

    try {
      await downloadPaymentBatchEvidenceCsv(batchId);
      setMessage('Evidence CSV downloaded.');
    } catch (error: any) {
      setMessage(error?.message || 'Failed to download evidence CSV.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" type="button" onClick={handleDownload} disabled={loading}>
        {loading ? 'Downloading...' : 'Download Evidence CSV'}
      </button>

      {message && (
        <div className="notice" style={{ marginTop: '0.5rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}
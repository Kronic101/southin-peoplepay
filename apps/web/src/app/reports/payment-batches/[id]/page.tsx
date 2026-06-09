import Link from 'next/link';
import { getPaymentBatch } from '@/lib/api';
import { PaymentBatchActions } from './PaymentBatchActions';
import { PaymentBatchEvidenceDownloadButton } from './PaymentBatchEvidenceDownloadButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  if (
    [
      'APPROVED',
      'PREPARED',
      'DRAFT',
      'READY_FOR_PAYMENT',
      'APPROVED_FOR_MANUAL_PAYMENT',
      'VALIDATED',
    ].includes(status)
  ) {
    return 'status-pill locked';
  }

  if (
    [
      'BLOCKED_PAYSLIPS_MISSING',
      'BLOCKED_PAYSLIP_MISSING',
      'PENDING',
      'PENDING_VALIDATION',
      'TO_VALIDATE',
    ].includes(status)
  ) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default async function PaymentBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getPaymentBatch(id);
  const items = batch?.items || [];

  const readyItems = items.filter((item: any) =>
    ['READY_FOR_PAYMENT', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(item.paymentStatus),
  );

  const blockedItems = items.filter((item: any) =>
    ['BLOCKED_PAYSLIP_MISSING', 'PENDING', 'PENDING_VALIDATION'].includes(item.paymentStatus),
  );

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Payment Batch Details</h1>
          <p className="muted">
            Finance validation record for payment batch preparation and manual payment approval.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/reports/payment-batches">
            Payment Batches
          </Link>

          <Link className="btn-secondary" href="/reports/bank-payment-preparation">
            Payment Prep
          </Link>

          <Link className="btn" href="/reports/finance-evidence">
            Finance Evidence
          </Link>

          <Link className="btn-secondary" href={`/reports/payment-batches/${id}/evidence`}>
            View Evidence
          </Link>

          <PaymentBatchEvidenceDownloadButton batchId={id} />
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Batch Name</span>
          <strong>{batch.batchName}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payroll Run</span>
          <strong>{batch.payrollRun?.runName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Period</span>
          <strong>{batch.payrollRun?.payrollPeriod?.periodName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{batch.status}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Employees</span>
          <strong>{batch.totalEmployees}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Total Net Pay</span>
          <strong>{money(batch.totalNetPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Ready Items</span>
          <strong>{readyItems.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked / Pending Items</span>
          <strong>{blockedItems.length}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Prepared By</span>
          <strong>{batch.preparedBy || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Prepared At</span>
          <strong>{formatDateTime(batch.preparedAt)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved By</span>
          <strong>{batch.approvedBy || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved At</span>
          <strong>{formatDateTime(batch.approvedAt)}</strong>
        </div>
      </div>

      <div className="notice">
        {batch.evidenceNotes ||
          'This payment batch is a controlled finance workflow record. No real bank payment has been triggered.'}
      </div>

      <PaymentBatchActions batch={batch} />

      <div className="table-wrap">
        <h3>Payment Batch Items</h3>

        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Net Pay</th>
              <th>Account Name</th>
              <th>Bank Name</th>
              <th>Branch</th>
              <th>Account</th>
              <th>Bank Status</th>
              <th>Payment Status</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={11}>No payment batch items found.</td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.employeeNumber}</td>
                  <td>{item.employeeName}</td>
                  <td>{item.department || '-'}</td>
                  <td>{money(item.netPay)}</td>
                  <td>{item.bankAccountName || '-'}</td>
                  <td>{item.bankName || '-'}</td>
                  <td>{item.bankBranch || '-'}</td>
                  <td>{item.bankAccountNumber || '-'}</td>
                  <td>
                    <span className={statusClass(item.bankDetailsStatus)}>
                      {item.bankDetailsStatus || 'PENDING_VALIDATION'}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(item.paymentStatus)}>{item.paymentStatus}</span>
                  </td>
                  <td>{item.validationNotes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <details>
        <summary>Raw Payment Batch JSON</summary>
        <pre className="json-preview">{JSON.stringify(batch, null, 2)}</pre>
      </details>

      <div className="notice">
        Final production workflow should replace placeholder bank fields with verified employee bank
        account data and formal Finance approval controls.
      </div>
    </section>
  );
}
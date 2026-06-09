import Link from 'next/link';
import { getPaymentBatches } from '@/lib/api';
import { PaymentBatchListActions } from './PaymentBatchListActions';

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

  if (['APPROVED', 'PREPARED', 'DRAFT'].includes(status)) {
    return 'status-pill locked';
  }

  if (['BLOCKED_PAYSLIPS_MISSING', 'PENDING', 'MANUAL_STEP'].includes(status)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default async function PaymentBatchesPage() {
  const data = await getPaymentBatches();
  const batches = data?.batches || [];

  const approvedCount = batches.filter((batch: any) => batch.status === 'APPROVED').length;
  const preparedCount = batches.filter((batch: any) => batch.status === 'PREPARED').length;
  const blockedCount = batches.filter((batch: any) =>
    String(batch.status || '').includes('BLOCKED'),
  ).length;

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Payment Batches</h1>
          <p className="muted">
            Finance-controlled payment batches prepared from locked payroll runs. This area does not
            trigger real bank transfers.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/reports">
            Reports Centre
          </Link>

          <Link className="btn-secondary" href="/reports/bank-payment-preparation">
            Payment Prep
          </Link>

          <Link className="btn" href="/reports/finance-evidence">
            Finance Evidence
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Payment Batches</span>
          <strong>{data?.totalReturned ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved</span>
          <strong>{approvedCount}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Prepared</span>
          <strong>{preparedCount}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked</span>
          <strong>{blockedCount}</strong>
        </div>
      </div>

      <div className="notice">
        Payment batches are generated from locked payroll runs. If payslips are missing, the batch is
        blocked until payslip generation is completed.
      </div>

      <div className="table-wrap">
        <h3>Recent Payment Batches</h3>

        <table>
          <thead>
            <tr>
              <th>Batch Name</th>
              <th>Payroll Run</th>
              <th>Period</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Total Net Pay</th>
              <th>Prepared By</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {batches.length === 0 ? (
              <tr>
                <td colSpan={9}>No payment batches have been created yet.</td>
              </tr>
            ) : (
              batches.map((batch: any) => (
                <tr key={batch.id}>
                  <td>{batch.batchName}</td>
                  <td>{batch.payrollRun?.runName || '-'}</td>
                  <td>{batch.payrollRun?.payrollPeriod?.periodName || '-'}</td>
                  <td>
                    <span className={statusClass(batch.status)}>{batch.status}</span>
                  </td>
                  <td>{batch.totalEmployees}</td>
                  <td>{money(batch.totalNetPay)}</td>
                  <td>{batch.preparedBy || '-'}</td>
                  <td>{formatDateTime(batch.createdAt)}</td>
                  <td>
                    <PaymentBatchListActions batchId={batch.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="notice">
        Next, open a batch to validate bank details, prepare the payment batch, and approve it for
        manual payment processing.
      </div>
    </section>
  );
}
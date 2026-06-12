import Link from 'next/link';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { getPaymentBatch, getPaymentBatchEvidenceCsvUrl } from '@/lib/api';
import { PaymentBatchActions } from './PaymentBatchActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function isReadyPaymentStatus(status?: string | null) {
  return ['READY_FOR_PAYMENT', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(String(status || ''));
}

function isBlockedPaymentStatus(status?: string | null) {
  return ['BLOCKED_PAYSLIP_MISSING', 'PENDING', 'PENDING_VALIDATION'].includes(
    String(status || ''),
  );
}

/**
 * Finance payment batch detail page.
 * --------------------------------------------------------------------
 * This page gives Finance a controlled view of payment batch readiness,
 * bank validation, payslip generation, evidence export, and approval lock.
 * No real bank payment is triggered from this page.
 */
export default async function PaymentBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await getPaymentBatch(id);

  const items = batch?.items || [];
  const readyItems = items.filter((item: any) => isReadyPaymentStatus(item.paymentStatus));
  const blockedItems = items.filter((item: any) => isBlockedPaymentStatus(item.paymentStatus));
  const isApproved = batch?.status === 'APPROVED';

  return (
    <ReportPageFrame
      eyebrow="Finance Payment Batch"
      title="Payment Batch Details"
      description="Finance validation record for payment batch preparation, manual payment approval, and audit evidence."
      actions={[
        { label: 'Reports Centre', href: '/reports' },
        { label: 'Payment Batches', href: '/reports/payment-batches' },
        { label: 'Payment Prep', href: '/reports/bank-payment-preparation' },
        { label: 'Finance Evidence', href: '/reports/finance-evidence', variant: 'primary' },
      ]}
    >
      <div className="report-header-actions">
        <Link className="btn-secondary" href={`/reports/payment-batches/${id}/evidence`}>
          View Evidence
        </Link>

        <a className="btn" href={getPaymentBatchEvidenceCsvUrl(id)}>
          Download Evidence CSV
        </a>
      </div>

      <div className="report-kpi-grid">
        <div className="summary-card">
          <span className="summary-label">Batch Name</span>
          <strong>{batch?.batchName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payroll Run</span>
          <strong>{batch?.payrollRun?.runName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Period</span>
          <strong>{batch?.payrollRun?.payrollPeriod?.periodName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{batch?.status || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employees</span>
          <strong>{batch?.totalEmployees ?? items.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Total Net Pay</span>
          <strong>{money(batch?.totalNetPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Ready Items</span>
          <strong>{readyItems.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked / Pending</span>
          <strong>{blockedItems.length}</strong>
        </div>
      </div>

      <div className="report-two-column">
        <section className="report-section">
          <h3>Preparation and Approval</h3>

          <div className="report-record-grid">
            <div className="summary-card">
              <span className="summary-label">Prepared By</span>
              <strong>{batch?.preparedBy || '-'}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Prepared At</span>
              <strong>{formatDateTime(batch?.preparedAt)}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Approved By</span>
              <strong>{batch?.approvedBy || '-'}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Approved At</span>
              <strong>{formatDateTime(batch?.approvedAt)}</strong>
            </div>
          </div>

          <Notice>
            {batch?.evidenceNotes ||
              'This payment batch is a controlled Finance workflow record. No real bank payment has been triggered.'}
          </Notice>
        </section>

        <section className="report-section">
          <h3>Finance Payment Batch Actions</h3>
          <p className="muted">
            These actions are controlled workflow steps. They do not create a live bank transfer.
          </p>

          {isApproved ? (
            <Notice>
              This payment batch has been approved for manual payment processing. Further workflow
              actions are locked for audit control.
            </Notice>
          ) : (
            <PaymentBatchActions batch={batch} />
          )}
        </section>
      </div>

      <section className="report-section">
        <h3>Payment Batch Items</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Net Pay</th>
                <th>Bank</th>
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
                  <td colSpan={10}>No payment batch items found.</td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id}>
                    <td>{item.employeeNumber || '-'}</td>
                    <td>{item.employeeName || '-'}</td>
                    <td>{item.department || '-'}</td>
                    <td>{money(item.netPay)}</td>
                    <td>{item.bankName || '-'}</td>
                    <td>{item.bankBranch || '-'}</td>
                    <td>{item.bankAccountNumber || '-'}</td>
                    <td>
                      <StatusPill status={item.bankDetailsStatus || 'PENDING_VALIDATION'} />
                    </td>
                    <td>
                      <StatusPill status={item.paymentStatus || '-'} />
                    </td>
                    <td>{item.validationNotes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details>
        <summary>Raw Payment Batch JSON</summary>
        <pre className="json-preview">{JSON.stringify(batch, null, 2)}</pre>
      </details>

      <Notice>
        Final production workflow should replace placeholder banking steps with approved
        integrations, formal Finance controls, and restricted evidence storage.
      </Notice>
    </ReportPageFrame>
  );
}
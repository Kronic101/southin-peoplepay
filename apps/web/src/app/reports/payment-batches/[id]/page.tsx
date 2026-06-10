import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { getPaymentBatch, getPaymentBatchEvidenceCsvUrl } from '@/lib/api';
import { PaymentBatchActions } from './PaymentBatchActions';

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

function isReadyPaymentStatus(status?: string | null) {
  return ['READY_FOR_PAYMENT', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(String(status || ''));
}

function isBlockedPaymentStatus(status?: string | null) {
  return ['BLOCKED_PAYSLIP_MISSING', 'PENDING', 'PENDING_VALIDATION'].includes(
    String(status || ''),
  );
}

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
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Finance Payment Batch"
          title="Payment Batch Details"
          description="Finance validation record for payment batch preparation and manual payment approval."
          actions={
            <>
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

              <a className="btn" href={getPaymentBatchEvidenceCsvUrl(id)}>
                Download Evidence CSV
              </a>
            </>
          }
        />

        <SummaryGrid
          items={[
            {
              label: 'Batch Name',
              value: batch?.batchName || '-',
            },
            {
              label: 'Payroll Run',
              value: batch?.payrollRun?.runName || '-',
            },
            {
              label: 'Period',
              value: batch?.payrollRun?.payrollPeriod?.periodName || '-',
            },
            {
              label: 'Status',
              value: batch?.status || '-',
            },
            {
              label: 'Total Employees',
              value: batch?.totalEmployees ?? items.length,
            },
            {
              label: 'Total Net Pay',
              value: money(batch?.totalNetPay),
            },
            {
              label: 'Ready Items',
              value: readyItems.length,
            },
            {
              label: 'Blocked / Pending Items',
              value: blockedItems.length,
            },
            {
              label: 'Prepared By',
              value: batch?.preparedBy || '-',
            },
            {
              label: 'Prepared At',
              value: formatDateTime(batch?.preparedAt),
            },
            {
              label: 'Approved By',
              value: batch?.approvedBy || '-',
            },
            {
              label: 'Approved At',
              value: formatDateTime(batch?.approvedAt),
            },
          ]}
        />

        <Notice>
          {batch?.evidenceNotes ||
            'This payment batch is a controlled finance workflow record. No real bank payment has been triggered.'}
        </Notice>

        <div className="workflow-panel">
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
        </div>

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
                    <td>{item.employeeNumber || '-'}</td>
                    <td>{item.employeeName || '-'}</td>
                    <td>{item.department || '-'}</td>
                    <td>{money(item.netPay)}</td>
                    <td>{item.bankAccountName || '-'}</td>
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

        <details>
          <summary>Raw Payment Batch JSON</summary>
          <pre className="json-preview">{JSON.stringify(batch, null, 2)}</pre>
        </details>

        <Notice>
          Final production workflow should replace placeholder banking steps with approved
          integrations, formal Finance controls, and restricted evidence storage.
        </Notice>
      </section>
    </AppShell>
  );
}
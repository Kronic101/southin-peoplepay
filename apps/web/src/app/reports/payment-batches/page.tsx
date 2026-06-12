import Link from 'next/link';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { getPaymentBatches } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Payment Batches List Page
 * ------------------------------------------------------------
 * Purpose:
 * Shows Finance-controlled payment batches created from locked payroll runs.
 *
 * Important:
 * This is the LIST page only.
 * Batch workflow actions belong inside:
 * /reports/payment-batches/[id]/page.tsx
 */
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

export default async function PaymentBatchesPage() {
  const data = await getPaymentBatches();
  const batches = data?.batches || [];

  const approved = batches.filter((batch: any) => batch.status === 'APPROVED');
  const prepared = batches.filter((batch: any) => batch.status === 'PREPARED');
  const blocked = batches.filter((batch: any) =>
    ['BLOCKED', 'PENDING_VALIDATION', 'DRAFT'].includes(String(batch.status || '')),
  );

  return (
    
      <ReportPageFrame
        eyebrow="Finance Payment Control"
        title="Payment Batches"
        description="Finance-controlled payment batches prepared from locked payroll runs. These records do not trigger real bank transfers."
        actions={
          <>
            <Link className="btn-secondary" href="/finance/dashboard">
              Finance Dashboard
            </Link>

            <Link className="btn-secondary" href="/reports/bank-payment-preparation">
              Payment Prep
            </Link>

            <Link className="btn" href="/finance/approval-evidence">
              Finance Evidence
            </Link>
          </>
        }
      >
        <SummaryGrid
          items={[
            {
              label: 'Total Payment Batches',
              value: batches.length,
            },
            {
              label: 'Approved',
              value: approved.length,
            },
            {
              label: 'Prepared',
              value: prepared.length,
            },
            {
              label: 'Blocked / Draft',
              value: blocked.length,
            },
          ]}
        />

        <Notice>
          Payment batches are generated from locked payroll runs. If payslips are missing, the batch
          is blocked until payslip generation is completed.
        </Notice>

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
                  <td colSpan={9}>No payment batches found.</td>
                </tr>
              ) : (
                batches.map((batch: any) => (
                  <tr key={batch.id}>
                    <td>{batch.batchName || '-'}</td>
                    <td>{batch.payrollRun?.runName || '-'}</td>
                    <td>{batch.payrollRun?.payrollPeriod?.periodName || '-'}</td>
                    <td>
                      <StatusPill status={batch.status || '-'} />
                    </td>
                    <td>{batch.totalEmployees ?? batch.items?.length ?? 0}</td>
                    <td>{money(batch.totalNetPay)}</td>
                    <td>{batch.preparedBy || '-'}</td>
                    <td>{formatDateTime(batch.createdAt)}</td>
                    <td>
                      <Link className="btn-secondary" href={`/reports/payment-batches/${batch.id}`}>
                        Open Batch
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Notice>
          Next step: open a batch to validate bank details, recheck payslips, approve for manual
          payment processing, and generate finance evidence.
        </Notice>
      </ReportPageFrame>
    
  );
}
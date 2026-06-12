import Link from 'next/link';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  getBankPaymentPreparation,
  getPayrollAuditCsvUrl,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Bank Payment Preparation
 * ------------------------------------------------------------
 * Purpose:
 * Finance-controlled readiness page before manual bank payment.
 *
 * Important:
 * This page does not perform a live bank transfer.
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

export default async function BankPaymentPreparationPage() {
  const data = await getBankPaymentPreparation();

  const payrollRun = data?.payrollRun || {};
  const batch = data?.paymentBatch || data?.batch || {};
  const items = data?.items || batch?.items || [];
  const readiness = data?.readiness || [];
  const evidenceChecklist = data?.evidenceChecklist || [];
  const financeControls = data?.financeControls || [];

  const readyPayments = items.filter((item: any) =>
    ['READY_FOR_PAYMENT', 'APPROVED_FOR_MANUAL_PAYMENT'].includes(String(item.paymentStatus || '')),
  );

  const blockedPayments = items.filter((item: any) =>
    ['BLOCKED_PAYSLIP_MISSING', 'PENDING_VALIDATION', 'PENDING'].includes(
      String(item.paymentStatus || ''),
    ),
  );

  return (
    
      <ReportPageFrame
        eyebrow="Finance Payment Preparation"
        title="Bank Payment Preparation"
        description="Finance-controlled salary payment preparation area for locked payroll runs. This phase prepares evidence only and does not trigger real bank transfers."
        actions={
          <>
            <Link className="btn-secondary" href="/reports">
              Reports Centre
            </Link>

            <Link className="btn-secondary" href="/reports/payment-batches">
              Payment Batches
            </Link>

            <Link className="btn-secondary" href="/finance/approval-evidence">
              Finance Evidence
            </Link>

            <a className="btn" href={getPayrollAuditCsvUrl(payrollRun?.id)}>
              Download Payroll Audit CSV
            </a>
          </>
        }
      >
        <SummaryGrid
          items={[
            {
              label: 'Payroll Run',
              value: payrollRun?.runName || '-',
            },
            {
              label: 'Period',
              value: payrollRun?.payrollPeriod?.periodName || payrollRun?.periodName || '-',
            },
            {
              label: 'Run Status',
              value: payrollRun?.status || '-',
            },
            {
              label: 'Locked At',
              value: formatDateTime(payrollRun?.lockedAt),
            },
            {
              label: 'Total Net Pay',
              value: money(batch?.totalNetPay || payrollRun?.totalNetPay),
            },
            {
              label: 'Employees in Batch',
              value: batch?.totalEmployees ?? items.length,
            },
            {
              label: 'Ready Payments',
              value: readyPayments.length,
            },
            {
              label: 'Blocked Payments',
              value: blockedPayments.length,
            },
          ]}
        />

        <Notice>
          No real bank payment file is generated in this phase. Finance must confirm bank details,
          payroll approval, payslip generation, and payment evidence before any live bank integration
          is enabled.
        </Notice>

        <div className="table-wrap">
          <h3>Payment Batch Readiness</h3>

          <table>
            <thead>
              <tr>
                <th>Control</th>
                <th>Required Before Payment</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {readiness.length === 0 ? (
                <>
                  <tr>
                    <td>Payroll locked</td>
                    <td>Payroll must be locked after Director approval.</td>
                    <td>
                      <StatusPill status={payrollRun?.status === 'LOCKED' ? 'READY' : 'TO_CONFIRM'} />
                    </td>
                  </tr>
                  <tr>
                    <td>Payslips generated</td>
                    <td>Each payable employee should have a generated payslip.</td>
                    <td>
                      <StatusPill status={items.length > 0 ? 'READY' : 'TO_CONFIRM'} />
                    </td>
                  </tr>
                  <tr>
                    <td>Finance audit evidence</td>
                    <td>Payroll audit CSV and approval evidence must be available.</td>
                    <td>
                      <StatusPill status="TO_CONFIRM" />
                    </td>
                  </tr>
                  <tr>
                    <td>Bank account validation</td>
                    <td>Employee bank details must be validated by Finance.</td>
                    <td>
                      <StatusPill status="MANUAL_STEP" />
                    </td>
                  </tr>
                </>
              ) : (
                readiness.map((item: any) => (
                  <tr key={item.control || item.name}>
                    <td>{item.control || item.name || '-'}</td>
                    <td>{item.requiredBeforePayment || item.description || '-'}</td>
                    <td>
                      <StatusPill status={item.status || '-'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Prepared Payment Batch</h3>

          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Net Pay</th>
                <th>Payslip</th>
                <th>Payment Status</th>
                <th>Bank Details</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7}>No prepared payment batch items found.</td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id || item.employeeNumber}>
                    <td>{item.employeeNumber || '-'}</td>
                    <td>{item.employeeName || item.name || '-'}</td>
                    <td>{item.department || '-'}</td>
                    <td>{money(item.netPay)}</td>
                    <td>
                      <StatusPill status={item.payslipGenerated ? 'GENERATED' : 'MISSING'} />
                    </td>
                    <td>
                      <StatusPill status={item.paymentStatus || '-'} />
                    </td>
                    <td>
                      <StatusPill status={item.bankDetailsStatus || 'TO_VALIDATE'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Finance Payment Evidence Checklist</h3>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Evidence Required</th>
                <th>Storage Location</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {evidenceChecklist.length === 0 ? (
                <>
                  <tr>
                    <td>1</td>
                    <td>Payroll audit CSV</td>
                    <td>Finance → Payroll Audit Reports</td>
                    <td>
                      <StatusPill status="TO_UPLOAD" />
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Approval evidence JSON</td>
                    <td>Finance → Payroll Audit Reports</td>
                    <td>
                      <StatusPill status="TO_UPLOAD" />
                    </td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Payment/bank preparation evidence</td>
                    <td>Finance restricted document library</td>
                    <td>
                      <StatusPill status="MANUAL_STEP" />
                    </td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>Director/payment sign-off evidence</td>
                    <td>Finance restricted document library</td>
                    <td>
                      <StatusPill status="MANUAL_STEP" />
                    </td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>Bank confirmation/proof of payment</td>
                    <td>Finance restricted document library</td>
                    <td>
                      <StatusPill status="MANUAL_STEP" />
                    </td>
                  </tr>
                </>
              ) : (
                evidenceChecklist.map((item: any, index: number) => (
                  <tr key={item.evidenceRequired || index}>
                    <td>{index + 1}</td>
                    <td>{item.evidenceRequired || item.name || '-'}</td>
                    <td>{item.storageLocation || '-'}</td>
                    <td>
                      <StatusPill status={item.status || '-'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Finance Controls from SharePoint Payload</h3>

          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Control</th>
              </tr>
            </thead>

            <tbody>
              {financeControls.length === 0 ? (
                <tr>
                  <td>1</td>
                  <td>
                    Confirm payroll totals match approved Finance review, payslips were generated,
                    statutory deductions were approved, and payment batch was authorised.
                  </td>
                </tr>
              ) : (
                financeControls.map((control: string, index: number) => (
                  <tr key={control}>
                    <td>{index + 1}</td>
                    <td>{control}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <details>
          <summary>Payment Batch Placeholder JSON</summary>
          <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
        </details>

        <Notice>
          Next build phase will allow Finance to attach evidence files, publish approved evidence to
          SharePoint, and link final payment confirmation back to the payment batch.
        </Notice>
      </ReportPageFrame>
    
  );
}
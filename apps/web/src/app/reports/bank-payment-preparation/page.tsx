import Link from 'next/link';
import {
  getFinanceAuditPayload,
  getPaymentBatches,
  getPayrollAudit,
  getPayrollAuditCsvUrl,
} from '@/lib/api';
import { CreatePaymentBatchButton } from './CreatePaymentBatchButton';

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

  if (['LOCKED', 'APPROVED', 'GENERATED', 'READY', 'PREPARED'].includes(status)) {
    return 'status-pill locked';
  }

  if (['OPEN', 'DRAFT', 'PENDING', 'TO_CONFIRM', 'MANUAL_STEP'].includes(status)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default async function BankPaymentPreparationPage() {
  const audit = await getPayrollAudit();
  const runId = audit?.run?.id || null;

  const [financePayload, paymentBatchData] = await Promise.all([
    getFinanceAuditPayload(runId || undefined),
    getPaymentBatches(),
  ]);

  const run = audit?.run || {};
  const totals = audit?.totals || {};
  const employees = audit?.employees || [];
  const financeControls = financePayload?.financeControls || [];
  const paymentBatches = paymentBatchData?.batches || [];

  const existingBatch = runId
    ? paymentBatches.find((batch: any) => batch.payrollRunId === runId)
    : null;

  const paymentRows = employees.map((employee: any) => ({
    lineId: employee.lineId,
    employeeNumber: employee.employeeNumber,
    employeeName: employee.employeeName,
    department: employee.department,
    netPay: employee.netPay,
    payslipGenerated: employee.payslipGenerated,
    paymentStatus: employee.payslipGenerated
      ? 'READY_FOR_PAYMENT_PREPARATION'
      : 'PAYSLIP_MISSING',
  }));

  const readyPayments = paymentRows.filter(
    (row: any) => row.paymentStatus === 'READY_FOR_PAYMENT_PREPARATION',
  );

  const blockedPayments = paymentRows.filter(
    (row: any) => row.paymentStatus !== 'READY_FOR_PAYMENT_PREPARATION',
  );

  const defaultBatchName =
    run?.periodName && run?.runName
      ? `${run.periodName} - ${run.runName} - Payment Batch`
      : 'Payment Batch';

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Bank Payment Preparation</h1>
          <p className="muted">
            Finance-controlled salary payment preparation area for locked payroll runs. This phase
            prepares evidence only and does not trigger real bank transfers.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/reports">
            Reports Centre
          </Link>

          <Link className="btn-secondary" href="/reports/payment-batches">
            Payment Batches
          </Link>

          <Link className="btn-secondary" href="/reports/finance-evidence">
            Finance Evidence
          </Link>

          <a className="btn" href={getPayrollAuditCsvUrl(runId || undefined)}>
            Download Payroll Audit CSV
          </a>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Payroll Run</span>
          <strong>{run.runName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Period</span>
          <strong>{run.periodName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Run Status</span>
          <strong>{run.status || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Locked At</span>
          <strong>{formatDateTime(run.lockedAt)}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Net Pay</span>
          <strong>{money(totals.netPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employees in Payment Batch</span>
          <strong>{paymentRows.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Ready Payments</span>
          <strong>{readyPayments.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked Payments</span>
          <strong>{blockedPayments.length}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <div className="page-header">
          <div>
            <h3>Payment Batch Creation</h3>
            <p className="muted">
              Create or open the Finance payment batch for this locked payroll run.
            </p>
          </div>

          <div className="action-row">
            <CreatePaymentBatchButton
              payrollRunId={runId}
              defaultBatchName={defaultBatchName}
              existingBatchId={existingBatch?.id || null}
            />
          </div>
        </div>

        {existingBatch ? (
          <div className="notice">
            Existing payment batch found:{' '}
            <strong>{existingBatch.batchName}</strong> · Status:{' '}
            <strong>{existingBatch.status}</strong>
          </div>
        ) : (
          <div className="notice">
            No payment batch has been created yet for this payroll run. Finance can create it from
            this page.
          </div>
        )}
      </div>

      <div className="notice">
        No real bank payment file is generated in this phase. Finance must confirm bank details,
        payroll approval, payslip generation, and payment evidence before any live bank integration is
        enabled.
      </div>

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
            <tr>
              <td>Payroll locked</td>
              <td>Payroll must be locked after Director approval.</td>
              <td>
                <span className={statusClass(run.status === 'LOCKED' ? 'READY' : 'PENDING')}>
                  {run.status === 'LOCKED' ? 'READY' : 'PENDING'}
                </span>
              </td>
            </tr>

            <tr>
              <td>Payslips generated</td>
              <td>Each payable employee should have a generated payslip.</td>
              <td>
                <span className={statusClass(blockedPayments.length === 0 ? 'READY' : 'PENDING')}>
                  {blockedPayments.length === 0 ? 'READY' : 'PENDING'}
                </span>
              </td>
            </tr>

            <tr>
              <td>Finance audit evidence</td>
              <td>Payroll audit CSV and approval evidence must be available.</td>
              <td>
                <span className="status-pill warning">TO_CONFIRM</span>
              </td>
            </tr>

            <tr>
              <td>Bank account validation</td>
              <td>Employee bank details must be validated by Finance.</td>
              <td>
                <span className="status-pill warning">MANUAL_STEP</span>
              </td>
            </tr>

            <tr>
              <td>Payment authorization</td>
              <td>Payment file must be approved by authorized Finance/Director signatories.</td>
              <td>
                <span className="status-pill warning">MANUAL_STEP</span>
              </td>
            </tr>
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
            {paymentRows.length === 0 ? (
              <tr>
                <td colSpan={7}>No employees found in the selected payroll audit.</td>
              </tr>
            ) : (
              paymentRows.map((row: any) => (
                <tr key={row.lineId}>
                  <td>{row.employeeNumber}</td>
                  <td>{row.employeeName}</td>
                  <td>{row.department}</td>
                  <td>{money(row.netPay)}</td>
                  <td>
                    <span
                      className={
                        row.payslipGenerated ? 'status-pill locked' : 'status-pill warning'
                      }
                    >
                      {row.payslipGenerated ? 'GENERATED' : 'MISSING'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        row.paymentStatus === 'READY_FOR_PAYMENT_PREPARATION'
                          ? 'status-pill locked'
                          : 'status-pill warning'
                      }
                    >
                      {row.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill warning">TO_VALIDATE</span>
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
            <tr>
              <td>1</td>
              <td>Payroll audit CSV</td>
              <td>Finance → Payroll Audit Reports</td>
              <td>
                <span className="status-pill warning">TO_UPLOAD</span>
              </td>
            </tr>

            <tr>
              <td>2</td>
              <td>Approval evidence JSON</td>
              <td>Finance → Payroll Audit Reports</td>
              <td>
                <span className="status-pill warning">TO_UPLOAD</span>
              </td>
            </tr>

            <tr>
              <td>3</td>
              <td>Payment/bank preparation evidence</td>
              <td>Finance restricted document library</td>
              <td>
                <span className="status-pill warning">MANUAL_STEP</span>
              </td>
            </tr>

            <tr>
              <td>4</td>
              <td>Director/payment sign-off evidence</td>
              <td>Finance restricted document library</td>
              <td>
                <span className="status-pill warning">MANUAL_STEP</span>
              </td>
            </tr>

            <tr>
              <td>5</td>
              <td>Bank confirmation/proof of payment</td>
              <td>Finance restricted document library</td>
              <td>
                <span className="status-pill warning">MANUAL_STEP</span>
              </td>
            </tr>
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
                <td colSpan={2}>No finance controls returned.</td>
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
        <pre className="json-preview">
          {JSON.stringify(
            {
              generatedAt: new Date().toISOString(),
              phase: 'BANK_PAYMENT_PREPARATION_PLACEHOLDER',
              existingBatchId: existingBatch?.id || null,
              payrollRun: {
                id: run.id,
                runName: run.runName,
                periodName: run.periodName,
                status: run.status,
                lockedAt: run.lockedAt,
              },
              totals: {
                employeeCount: paymentRows.length,
                readyPayments: readyPayments.length,
                blockedPayments: blockedPayments.length,
                netPay: Number(totals.netPay || 0),
              },
              paymentRows,
              warning:
                'This is a placeholder only. No real bank file or bank transfer has been generated.',
            },
            null,
            2,
          )}
        </pre>
      </details>

      <div className="notice">
        Next build phase will allow Finance to refresh blocked batches after payslips are generated,
        then validate bank details and prepare the batch.
      </div>
    </section>
  );
}
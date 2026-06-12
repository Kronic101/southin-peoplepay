import Link from 'next/link';
import { Notice } from '@/components/ui/Notice';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { getPayrollAudit, getPayrollAuditCsvUrl } from '@/lib/api';

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

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

/**
 * Payroll audit reports page.
 * --------------------------------------------------------------------
 * This report is used by Payroll, Finance, HR, and Directors to confirm
 * payroll values, approval steps, payslip generation, and audit readiness.
 */
export default async function PayrollAuditReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ runId?: string }>;
}) {
  const params = await searchParams;
  const runId = params?.runId;

  const audit = await getPayrollAudit(runId);

  if (!audit.run) {
    return (
      <ReportPageFrame
        eyebrow="Payroll Audit"
        title="Payroll Audit Reports"
        description="Audit trail for payroll runs, approvals, payroll lines, deductions, and payslip generation."
        actions={[
          { label: 'Reports Centre', href: '/reports' },
          { label: 'Payroll', href: '/payroll' },
          { label: 'Executive Dashboard', href: '/executive/dashboard', variant: 'primary' },
        ]}
      >
        <Notice>No payroll runs found.</Notice>
      </ReportPageFrame>
    );
  }

  return (
    <ReportPageFrame
      eyebrow="Payroll Audit"
      title="Payroll Audit Reports"
      description="Audit trail for payroll runs, approvals, payroll lines, deductions, and payslip generation."
      actions={[
        { label: 'Reports Centre', href: '/reports' },
        { label: 'Payroll', href: '/payroll' },
        { label: 'Finance Dashboard', href: '/finance/dashboard' },
        { label: 'Executive Dashboard', href: '/executive/dashboard', variant: 'primary' },
      ]}
    >
      <div className="report-header-actions">
        <a className="btn-secondary" href={getPayrollAuditCsvUrl(audit.run.id)}>
          Export This Run CSV
        </a>

        <a className="btn" href={getPayrollAuditCsvUrl()}>
          Export Latest CSV
        </a>
      </div>

      <div className="report-kpi-grid">
        <div className="summary-card">
          <span className="summary-label">Payroll Run</span>
          <strong>{audit.run.runName}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Period</span>
          <strong>{audit.run.periodName}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Run Type</span>
          <strong>{audit.run.runType}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{audit.run.status}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Gross Pay</span>
          <strong>{money(audit.totals.grossPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Deductions</span>
          <strong>{money(audit.totals.totalDeductions)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Net Pay</span>
          <strong>{money(audit.totals.netPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employer Cost</span>
          <strong>{money(audit.totals.employerCost)}</strong>
        </div>
      </div>

      <section className="report-section">
        <h3>Payroll Run Control Details</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <tbody>
              <tr>
                <th>Run ID</th>
                <td>{audit.run.id}</td>
              </tr>
              <tr>
                <th>Period Start</th>
                <td>{formatDate(audit.run.periodStart)}</td>
              </tr>
              <tr>
                <th>Period End</th>
                <td>{formatDate(audit.run.periodEnd)}</td>
              </tr>
              <tr>
                <th>Pay Date</th>
                <td>{formatDate(audit.run.payDate)}</td>
              </tr>
              <tr>
                <th>Prepared By</th>
                <td>{audit.run.preparedBy || '-'}</td>
              </tr>
              <tr>
                <th>Submitted At</th>
                <td>{formatDateTime(audit.run.submittedAt)}</td>
              </tr>
              <tr>
                <th>HR Reviewed By</th>
                <td>{audit.run.hrReviewedBy || '-'}</td>
              </tr>
              <tr>
                <th>Finance Reviewed By</th>
                <td>{audit.run.financeReviewedBy || '-'}</td>
              </tr>
              <tr>
                <th>Director Approved By</th>
                <td>{audit.run.directorApprovedBy || '-'}</td>
              </tr>
              <tr>
                <th>Locked At</th>
                <td>{formatDateTime(audit.run.lockedAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <h3>Payroll Employees Audit</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Site</th>
                <th>Employment Type</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Employer Cost</th>
                <th>Payslip</th>
              </tr>
            </thead>

            <tbody>
              {audit.employees.length === 0 ? (
                <tr>
                  <td colSpan={11}>No payroll employees found for this run.</td>
                </tr>
              ) : (
                audit.employees.map((line: any) => (
                  <tr key={line.lineId}>
                    <td>{line.employeeNumber}</td>
                    <td>{line.employeeName}</td>
                    <td>{line.department}</td>
                    <td>{line.jobTitle}</td>
                    <td>{line.site}</td>
                    <td>{line.employmentType}</td>
                    <td>{money(line.grossPay)}</td>
                    <td>{money(line.totalDeductions)}</td>
                    <td>{money(line.netPay)}</td>
                    <td>{money(line.employerCost)}</td>
                    <td>
                      <span className={line.payslipGenerated ? 'status-pill locked' : 'status-pill warning'}>
                        {line.payslipGenerated ? 'Generated' : 'Missing'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <h3>Approval Timeline</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Role</th>
                <th>Approver</th>
                <th>Status</th>
                <th>Comments</th>
                <th>Approved At</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {audit.approvals.length === 0 ? (
                <tr>
                  <td colSpan={7}>No approval records found.</td>
                </tr>
              ) : (
                audit.approvals.map((approval: any, index: number) => (
                  <tr key={`${approval.stage}-${approval.status}-${index}`}>
                    <td>{approval.stage}</td>
                    <td>{approval.role}</td>
                    <td>{approval.approverId || '-'}</td>
                    <td>
                      <span className={approval.status === 'APPROVED' ? 'status-pill locked' : 'status-pill warning'}>
                        {approval.status}
                      </span>
                    </td>
                    <td>{approval.comments || '-'}</td>
                    <td>{formatDateTime(approval.approvedAt)}</td>
                    <td>{formatDateTime(approval.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Notice>
        Audit reports should be retained for HR, Finance, Director approval evidence, statutory
        inspection, and payroll dispute resolution. The CSV export can later be copied into the
        SharePoint Finance document library.
      </Notice>
    </ReportPageFrame>
  );
}
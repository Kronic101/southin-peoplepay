import { Notice } from '@/components/ui/Notice';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { getFinanceAuditPayload, getPayrollAudit, getPayrollAuditCsvUrl } from '@/lib/api';

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

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  const value = String(status).toUpperCase();

  if (['LOCKED', 'APPROVED', 'GENERATED', 'READY'].includes(value)) {
    return 'status-pill locked';
  }

  if (['OPEN', 'DRAFT', 'PENDING', 'DISABLED_DEV_MODE'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

/**
 * Finance audit evidence package.
 * --------------------------------------------------------------------
 * This page groups payroll audit files, approval evidence, statutory
 * evidence, and SharePoint-ready Finance package records.
 */
export default async function FinanceEvidencePage() {
  const audit = await getPayrollAudit();
  const runId = audit?.run?.id;

  const financePayload = await getFinanceAuditPayload(runId);

  const run = audit?.run || {};
  const totals = audit?.totals || {};
  const employees = audit?.employees || [];
  const approvals = audit?.approvals || [];
  const recommendedFiles = financePayload?.recommendedFiles || [];
  const financeControls = financePayload?.financeControls || [];

  return (
    <ReportPageFrame
      eyebrow="Finance Evidence"
      title="Finance Audit Evidence Package"
      description="Finance-controlled evidence pack for locked payroll runs, audit CSV exports, approval records, statutory evidence, and payslip generation checks."
      actions={[
        { label: 'Reports Centre', href: '/reports' },
        { label: 'Finance Dashboard', href: '/finance/dashboard' },
        { label: 'SharePoint Package', href: '/finance/sharepoint-package' },
        { label: 'Executive Dashboard', href: '/executive/dashboard', variant: 'primary' },
      ]}
    >
      <div className="report-header-actions">
        <a className="btn" href={getPayrollAuditCsvUrl(runId)}>
          Download Payroll Audit CSV
        </a>
      </div>

      <div className="report-kpi-grid">
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

        <div className="summary-card">
          <span className="summary-label">Gross Pay</span>
          <strong>{money(totals.grossPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Deductions</span>
          <strong>{money(totals.totalDeductions)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Net Pay</span>
          <strong>{money(totals.netPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employer Cost</span>
          <strong>{money(totals.employerCost)}</strong>
        </div>
      </div>

      <Notice>
        This evidence package should be stored under the Finance SharePoint site in the Payroll Audit
        Reports document library once Microsoft Graph publishing is enabled.
      </Notice>

      <div className="report-two-column">
        <section className="report-section">
          <h3>Recommended Finance Evidence Files</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Document Type</th>
                  <th>Source Endpoint</th>
                </tr>
              </thead>

              <tbody>
                {recommendedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No recommended evidence files returned.</td>
                  </tr>
                ) : (
                  recommendedFiles.map((file: any) => (
                    <tr key={file.fileName}>
                      <td>{file.fileName}</td>
                      <td>{file.documentType}</td>
                      <td>
                        <code>{file.sourceEndpoint}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-section">
          <h3>Finance Control Checklist</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Control</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {financeControls.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No finance controls returned.</td>
                  </tr>
                ) : (
                  financeControls.map((control: string, index: number) => (
                    <tr key={control}>
                      <td>{index + 1}</td>
                      <td>{control}</td>
                      <td>
                        <span className="status-pill warning">To Confirm</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="report-section">
        <h3>Payroll Employees Evidence</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Payslip</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8}>No employees found in audit package.</td>
                </tr>
              ) : (
                employees.map((employee: any) => (
                  <tr key={employee.lineId}>
                    <td>{employee.employeeNumber}</td>
                    <td>{employee.employeeName}</td>
                    <td>{employee.department}</td>
                    <td>{money(employee.grossPay)}</td>
                    <td>{money(employee.totalDeductions)}</td>
                    <td>{money(employee.netPay)}</td>
                    <td>
                      <span
                        className={
                          employee.payslipGenerated ? 'status-pill locked' : 'status-pill warning'
                        }
                      >
                        {employee.payslipGenerated ? 'Generated' : 'Missing'}
                      </span>
                    </td>
                    <td>{employee.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-section">
        <h3>Approval Evidence</h3>

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
              </tr>
            </thead>

            <tbody>
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6}>No approval records found.</td>
                </tr>
              ) : (
                approvals.map((approval: any) => (
                  <tr key={approval.id}>
                    <td>{approval.stage}</td>
                    <td>{approval.role}</td>
                    <td>{approval.approverId || '-'}</td>
                    <td>
                      <span className={statusClass(approval.status)}>{approval.status}</span>
                    </td>
                    <td>{approval.comments || '-'}</td>
                    <td>{formatDateTime(approval.approvedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details>
        <summary>Raw Finance SharePoint Payload</summary>
        <pre className="json-preview">{JSON.stringify(financePayload, null, 2)}</pre>
      </details>

      <Notice>
        This page is for Finance and Executive evidence only. It must not be exposed to the public
        SharePoint dashboard.
      </Notice>
    </ReportPageFrame>
  );
}
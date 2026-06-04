import Link from 'next/link';
import {
  getPayrollAudit,
  getPayrollAuditCsvUrl,
  getFinanceAuditPayload,
} from '@/lib/api';

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

  if (['LOCKED', 'APPROVED', 'GENERATED', 'READY'].includes(status)) {
    return 'status-pill locked';
  }

  if (['OPEN', 'DRAFT', 'PENDING', 'DISABLED_DEV_MODE'].includes(status)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

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
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Finance Audit Evidence Package</h1>
          <p className="muted">
            Finance-controlled evidence pack for locked payroll runs, audit CSV exports, approval
            records, statutory evidence, and payslip generation checks.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/reports">
            Reports Centre
          </Link>

          <Link className="btn-secondary" href="/executive/dashboard">
            Executive Dashboard
          </Link>

          <a className="btn" href={getPayrollAuditCsvUrl(runId)}>
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

      <div className="notice">
        This evidence package should be stored under the Finance SharePoint site in the Payroll Audit
        Reports document library once Microsoft Graph publishing is enabled.
      </div>

      <div className="table-wrap">
        <h3>Recommended Finance Evidence Files</h3>

        <table>
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

      <div className="table-wrap">
        <h3>Finance Control Checklist</h3>

        <table>
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

      <div className="table-wrap">
        <h3>Payroll Employees Evidence</h3>

        <table>
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

      <div className="table-wrap">
        <h3>Approval Evidence</h3>

        <table>
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

      <details>
        <summary>Raw Finance SharePoint Payload</summary>
        <pre className="json-preview">{JSON.stringify(financePayload, null, 2)}</pre>
      </details>

      <div className="notice">
        This page is for Finance and Executive evidence only. It must not be exposed to the public
        SharePoint dashboard.
      </div>
    </section>
  );
}
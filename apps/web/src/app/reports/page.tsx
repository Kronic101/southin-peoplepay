import Link from 'next/link';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { Notice } from '@/components/ui/Notice';
import {
  getExecutiveDashboard,
  getPayrollAudit,
  getSharePointExportLogs,
  getPayrollAuditCsvUrl,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return `K ${Number(value || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-ZM');
  } catch {
    return '-';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-ZM');
  } catch {
    return '-';
  }
}

function statusClass(status?: string | null) {
  const normalised = String(status || '').toUpperCase();

  if (['LOCKED', 'APPROVED', 'GENERATED', 'READY', 'POSTED', 'PUBLISHED'].includes(normalised)) {
    return 'status-pill success';
  }

  if (['OPEN', 'DRAFT', 'PENDING', 'SUBMITTED', 'DISABLED_DEV_MODE'].includes(normalised)) {
    return 'status-pill warning';
  }

  if (['REJECTED', 'FAILED', 'ERROR'].includes(normalised)) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

export default async function PayrollReportsCentrePage() {
  const [dashboard, audit, exportLogs] = await Promise.allSettled([
    getExecutiveDashboard(),
    getPayrollAudit(),
    getSharePointExportLogs(),
  ]);

  const dashboardData = dashboard.status === 'fulfilled' ? dashboard.value : {};
  const auditData = audit.status === 'fulfilled' ? audit.value : {};
  const exportLogData = exportLogs.status === 'fulfilled' ? exportLogs.value : {};

  const latestRun = auditData?.run || null;
  const totals = auditData?.totals || {};
  const employees = auditData?.employees || [];
  const approvals = auditData?.approvals || [];
  const logs = exportLogData?.logs || [];
  const periods = dashboardData?.payrollPeriods || [];

  const hasLoadError =
    dashboard.status === 'rejected' || audit.status === 'rejected' || exportLogs.status === 'rejected';

  return (
    <ReportPageFrame
      eyebrow="Payroll Reporting"
      title="Payroll Reports Centre"
      description="Central reporting area for payroll audit evidence, exports, approvals, payslip status, and SharePoint handover logs."
      actions={[
        { label: 'Executive Dashboard', href: '/executive/dashboard' },
        { label: 'Payroll', href: '/payroll' },
        { label: 'Payroll Audit', href: '/reports/payroll-audit' },
        { label: 'Readiness Gates', href: '/hr/payroll-readiness-gates', variant: 'primary' },
      ]}
    >
      {hasLoadError ? (
        <div className="error-banner">
          Some report data failed to load. Confirm the API is running and the report endpoints are mapped.
        </div>
      ) : null}

      <div className="metric-grid">
        <div className="metric-card">
          <span>Payroll Run</span>
          <strong>{latestRun?.runName || latestRun?.name || '-'}</strong>
        </div>

        <div className="metric-card">
          <span>Status</span>
          <strong>{latestRun?.status || '-'}</strong>
        </div>

        <div className="metric-card">
          <span>Gross Pay</span>
          <strong>{money(totals?.grossPay)}</strong>
        </div>

        <div className="metric-card">
          <span>Deductions</span>
          <strong>{money(totals?.deductions)}</strong>
        </div>

        <div className="metric-card">
          <span>Net Pay</span>
          <strong>{money(totals?.netPay)}</strong>
        </div>

        <div className="metric-card">
          <span>Employer Cost</span>
          <strong>{money(totals?.employerCost)}</strong>
        </div>
      </div>

      <Notice>
        Payroll audit CSV files should later be exported into the Finance site under the Payroll
        Audit Reports document library. Executive summaries should go to the Executive Leadership
        PeoplePay Executive Dashboard page only.
      </Notice>

      <section className="finance-card">
        <div className="page-header compact">
          <div>
            <h2>Payroll Run Control Details</h2>
            <p className="muted">Latest payroll run control and approval status.</p>
          </div>

          <a className="btn" href={getPayrollAuditCsvUrl(latestRun?.id)}>
            Export Latest Payroll Audit CSV
          </a>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <tbody>
              <tr>
                <th>Run ID</th>
                <td>{latestRun?.id || '-'}</td>
              </tr>
              <tr>
                <th>Run Name</th>
                <td>{latestRun?.runName || latestRun?.name || '-'}</td>
              </tr>
              <tr>
                <th>Period</th>
                <td>{latestRun?.periodName || latestRun?.period?.periodName || '-'}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span className={statusClass(latestRun?.status)}>{latestRun?.status || '-'}</span>
                </td>
              </tr>
              <tr>
                <th>Prepared By</th>
                <td>{latestRun?.preparedBy || '-'}</td>
              </tr>
              <tr>
                <th>Submitted At</th>
                <td>{formatDateTime(latestRun?.submittedAt)}</td>
              </tr>
              <tr>
                <th>Locked At</th>
                <td>{formatDateTime(latestRun?.lockedAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-card">
        <h2>Payroll Employees Audit</h2>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Site</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Payslip</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={9}>No employee payroll audit rows found.</td>
                </tr>
              ) : (
                employees.map((employee: any) => (
                  <tr key={employee.id || employee.employeeId || employee.employeeNumber}>
                    <td>{employee.employeeNumber || '-'}</td>
                    <td>{employee.name || employee.employeeName || '-'}</td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.jobTitle || '-'}</td>
                    <td>{employee.site || '-'}</td>
                    <td>{money(employee.grossPay)}</td>
                    <td>{money(employee.deductions)}</td>
                    <td>{money(employee.netPay)}</td>
                    <td>
                      <span className={statusClass(employee.payslipStatus)}>
                        {employee.payslipStatus || '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-card">
        <h2>Approval Audit</h2>

        <div className="table-wrap">
          <table className="data-table">
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
                    <td>{approval.stage || '-'}</td>
                    <td>{approval.role || '-'}</td>
                    <td>{approval.approverId || approval.approvedBy || '-'}</td>
                    <td>
                      <span className={statusClass(approval.status)}>{approval.status || '-'}</span>
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

      <section className="finance-card">
        <h2>Recent SharePoint Export Logs</h2>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Target Site</th>
                <th>Target Page / Library</th>
                <th>Payload</th>
                <th>Graph Status</th>
                <th>Requested By</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6}>No SharePoint export logs yet.</td>
                </tr>
              ) : (
                logs.slice(0, 10).map((log: any) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.targetSite || '-'}</td>
                    <td>{log.targetPage || log.targetLibrary || '-'}</td>
                    <td>{log.payloadType || '-'}</td>
                    <td>
                      <span className={statusClass(log.graphStatus)}>{log.graphStatus || '-'}</span>
                    </td>
                    <td>{log.requestedBy || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-card">
        <h2>Payroll Periods Summary</h2>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Start</th>
                <th>End</th>
                <th>Pay Date</th>
                <th>Status</th>
                <th>Runs</th>
              </tr>
            </thead>

            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll periods found.</td>
                </tr>
              ) : (
                periods.map((period: any) => (
                  <tr key={period.id}>
                    <td>{period.periodName}</td>
                    <td>{formatDate(period.startDate)}</td>
                    <td>{formatDate(period.endDate)}</td>
                    <td>{formatDate(period.payDate)}</td>
                    <td>
                      <span className={statusClass(period.status)}>{period.status}</span>
                    </td>
                    <td>{period.runCount ?? period.runs?.length ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </ReportPageFrame>
  );
}
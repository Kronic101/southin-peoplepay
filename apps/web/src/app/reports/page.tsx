import Link from 'next/link';
import {
  getExecutiveDashboard,
  getPayrollAudit,
  getPayrollAuditCsvUrl,
  getSharePointExportLogs,
} from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
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

export default async function PayrollReportsCentrePage() {
  const [dashboard, audit, exportLogs] = await Promise.all([
    getExecutiveDashboard(),
    getPayrollAudit(),
    getSharePointExportLogs(),
  ]);

  const latestRun = audit?.run || null;
  const totals = audit?.totals || {};
  const employees = audit?.employees || [];
  const approvals = audit?.approvals || [];
  const logs = exportLogs?.logs || [];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Payroll Reports Centre</h1>
          <p className="muted">
            Central reporting area for payroll audit evidence, exports, approvals, payslip status,
            and SharePoint handover logs.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/executive/dashboard">
            Executive Dashboard
          </Link>

          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            SharePoint Integration
          </Link>

          <a className="btn" href={getPayrollAuditCsvUrl(latestRun?.id)}>
            Export Latest Payroll Audit CSV
          </a>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Latest Audit Run</span>
          <strong>{latestRun?.runName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Run Status</span>
          <strong>{latestRun?.status || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employees in Audit</span>
          <strong>{totals.employeeCount || 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approval Records</span>
          <strong>{approvals.length}</strong>
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
        Reports are reliable only after payroll is submitted, HR reviewed, Finance reviewed, Director
        approved, locked, and payslips generated.
      </div>

      <div className="table-wrap">
        <h3>Available Payroll Reports</h3>

        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Purpose</th>
              <th>Access Level</th>
              <th>Output</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Payroll Audit Report</td>
              <td>Full payroll control evidence for latest locked payroll.</td>
              <td>Finance / Executive</td>
              <td>Web page</td>
              <td>
                <Link className="link-action" href="/reports/payroll-audit">
                  Open Report
                </Link>
              </td>
            </tr>

            <tr>
              <td>Payroll Audit CSV</td>
              <td>Exportable payroll audit data for Finance evidence library.</td>
              <td>Finance</td>
              <td>CSV</td>
              <td>
                <a className="link-action" href={getPayrollAuditCsvUrl(latestRun?.id)}>
                  Download CSV
                </a>
              </td>
            </tr>

            <tr>
              <td>Finance Evidence Package</td>
              <td>Finance-controlled payroll evidence package for audit storage.</td>
              <td>Finance / Executive</td>
              <td>Web / JSON / CSV</td>
              <td>
                <Link className="link-action" href="/reports/finance-evidence">
                  Open Evidence
                </Link>
              </td>
            </tr>

            <tr>
              <td>Executive Dashboard Feed</td>
              <td>Executive summary for headcount, totals, approvals, and payroll status.</td>
              <td>Executive</td>
              <td>Web / JSON</td>
              <td>
                <Link className="link-action" href="/executive/dashboard">
                  Open Dashboard
                </Link>
              </td>
            </tr>

            <tr>
              <td>Public Dashboard Safe Summary</td>
              <td>Non-confidential payroll processing summary for the public SharePoint dashboard.</td>
              <td>Public Dashboard / Admin</td>
              <td>Web / JSON</td>
              <td>
                <Link className="link-action" href="/reports/public-summary">
                  Open Summary
                </Link>
              </td>
            </tr>

            <tr>
              <td>SharePoint Export Logs</td>
              <td>Evidence of attempted SharePoint publish operations.</td>
              <td>Admin / Executive</td>
              <td>Web / JSON</td>
              <td>
                <Link className="link-action" href="/admin/sharepoint-integration">
                  Open Logs
                </Link>
              </td>
            </tr>

            <tr>
              <td>Graph Setup Guide</td>
              <td>Setup guide for Microsoft Graph, SharePoint site IDs, list IDs, and drive IDs.</td>
              <td>Admin</td>
              <td>Web</td>
              <td>
                <Link className="link-action" href="/admin/sharepoint-graph-setup">
                  Open Setup
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Latest Payroll Audit Details</h3>

        <table>
          <tbody>
            <tr>
              <th>Run Name</th>
              <td>{latestRun?.runName || '-'}</td>
            </tr>
            <tr>
              <th>Period</th>
              <td>{latestRun?.periodName || '-'}</td>
            </tr>
            <tr>
              <th>Run Type</th>
              <td>{latestRun?.runType || '-'}</td>
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
              <th>HR Reviewed By</th>
              <td>{latestRun?.hrReviewedBy || '-'}</td>
            </tr>
            <tr>
              <th>Finance Reviewed By</th>
              <td>{latestRun?.financeReviewedBy || '-'}</td>
            </tr>
            <tr>
              <th>Director Approved By</th>
              <td>{latestRun?.directorApprovedBy || '-'}</td>
            </tr>
            <tr>
              <th>Locked At</th>
              <td>{formatDateTime(latestRun?.lockedAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Payroll Employees Audit Summary</h3>

        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Employment Type</th>
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
                <td colSpan={9}>No payroll employees found in latest audit.</td>
              </tr>
            ) : (
              employees.map((employee: any) => (
                <tr key={employee.lineId}>
                  <td>{employee.employeeNumber}</td>
                  <td>{employee.employeeName}</td>
                  <td>{employee.department}</td>
                  <td>{employee.employmentType}</td>
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
        <h3>Approval Timeline</h3>

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

      <div className="table-wrap">
        <h3>Recent SharePoint Export Logs</h3>

        <table>
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
                  <td>{log.targetSite}</td>
                  <td>{log.targetPage || log.targetLibrary || '-'}</td>
                  <td>{log.payloadType || '-'}</td>
                  <td>
                    <span className={statusClass(log.graphStatus)}>{log.graphStatus}</span>
                  </td>
                  <td>{log.requestedBy || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Payroll Periods Summary</h3>

        <table>
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
            {(dashboard.payrollPeriods || []).map((period: any) => (
              <tr key={period.id}>
                <td>{period.periodName}</td>
                <td>{formatDate(period.startDate)}</td>
                <td>{formatDate(period.endDate)}</td>
                <td>{formatDate(period.payDate)}</td>
                <td>{period.status}</td>
                <td>{period.runCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notice">
        Finance audit CSV files should later be exported into the Finance site under the Payroll
        Audit Reports document library. Executive summaries should go to the Executive Leadership
        PeoplePay Executive Dashboard page only.
      </div>
    </section>
  );
}
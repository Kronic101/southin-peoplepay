import Link from 'next/link';
import { getExecutiveDashboard, getPayrollAuditCsvUrl } from '@/lib/api';

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function statusClass(status?: string) {
  if (status === 'LOCKED' || status === 'DIRECTOR_APPROVED') {
    return 'status-pill locked';
  }

  if (
    status === 'REJECTED' ||
    status === 'SUBMITTED_HR_REVIEW' ||
    status === 'SUBMITTED_FINANCE_REVIEW' ||
    status === 'SUBMITTED_DIRECTOR_APPROVAL'
  ) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default async function ExecutiveDashboardPage() {
  const dashboard = await getExecutiveDashboard();

  const latest = dashboard.latestLockedPayroll;
  const recentRuns = dashboard.recentPayrollRuns || [];
  const periods = dashboard.payrollPeriods || [];
  const notes = dashboard.complianceNotes || [];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p className="muted">
            Management view for headcount, payroll cost, statutory compliance, approvals, payslip readiness,
            SharePoint feed readiness, and audit reporting.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/reports/payroll-audit">
            Payroll Audit Report
          </Link>

          <a className="btn-secondary" href={getPayrollAuditCsvUrl()}>
            Export Latest Audit CSV
          </a>

          <Link className="btn" href="/payroll">
            Open Payroll
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Employees</span>
          <strong>{dashboard.summary.totalEmployees}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Active Employees</span>
          <strong>{dashboard.summary.activeEmployees}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Draft Employees</span>
          <strong>{dashboard.summary.draftEmployees}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payslips Generated</span>
          <strong>{dashboard.summary.totalPayslips}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Payroll Periods</span>
          <strong>{dashboard.summary.payrollPeriods}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payroll Runs</span>
          <strong>{dashboard.summary.payrollRuns}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Locked Payroll Runs</span>
          <strong>{dashboard.summary.lockedPayrollRuns}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Open Payroll Runs</span>
          <strong>{dashboard.summary.openPayrollRuns}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Latest Gross Pay</span>
          <strong>{money(dashboard.financials.latestGrossPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Latest Deductions</span>
          <strong>{money(dashboard.financials.latestDeductions)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Latest Net Pay</span>
          <strong>{money(dashboard.financials.latestNetPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Latest Employer Cost</span>
          <strong>{money(dashboard.financials.latestEmployerCost)}</strong>
        </div>
      </div>

      {latest ? (
        <div className="notice">
          Latest locked payroll: <strong>{latest.runName}</strong> · {latest.periodName} · Status:{' '}
          <strong>{latest.status}</strong> · Locked {formatDate(latest.lockedAt)} · Net Pay:{' '}
          <strong>{money(latest.totals?.netPay)}</strong>
        </div>
      ) : (
        <div className="notice">
          No locked payroll has been found yet. Executive figures will become more meaningful after payroll
          is approved, locked, and payslips are generated.
        </div>
      )}

      <div className="table-wrap">
        <h3>Recent Payroll Runs</h3>

        <table>
          <thead>
            <tr>
              <th>Run Name</th>
              <th>Period</th>
              <th>Type</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net</th>
              <th>Employer Cost</th>
              <th>Approvals</th>
              <th>Locked</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {recentRuns.length === 0 ? (
              <tr>
                <td colSpan={12}>No payroll runs found.</td>
              </tr>
            ) : (
              recentRuns.map((run: any) => (
                <tr key={run.id}>
                  <td>
                    <Link className="link-button" href={`/payroll/runs/${run.id}`}>
                      {run.runName}
                    </Link>
                  </td>
                  <td>{run.periodName}</td>
                  <td>{run.runType}</td>
                  <td>
                    <span className={statusClass(run.status)}>{run.status}</span>
                  </td>
                  <td>{run.employeeCount}</td>
                  <td>{money(run.grossPay)}</td>
                  <td>{money(run.totalDeductions)}</td>
                  <td>{money(run.netPay)}</td>
                  <td>{money(run.employerCost)}</td>
                  <td>{run.approvalCount}</td>
                  <td>{formatDate(run.lockedAt)}</td>
                  <td>
                    <div className="action-row">
                      <Link className="link-button" href={`/reports/payroll-audit?runId=${run.id}`}>
                        View Audit
                      </Link>

                      <a className="link-button" href={getPayrollAuditCsvUrl(run.id)}>
                        Export CSV
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Payroll Periods</h3>

        <table>
          <thead>
            <tr>
              <th>Period Name</th>
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
                    <span className="status-pill">{period.status}</span>
                  </td>
                  <td>{period.runCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>SharePoint Executive Page Feed</h3>

        <p className="muted">
          This controlled JSON endpoint is the clean handover point for the Executive Leadership SharePoint
          site, Power Automate, Power BI, or a future Microsoft Graph publishing job.
        </p>

        <div className="notice">
          <code>GET http://localhost:4000/api/executive/sharepoint-feed</code>
        </div>

        <table>
          <tbody>
            <tr>
              <th>Recommended SharePoint Site</th>
              <td>Executive Leadership</td>
            </tr>
            <tr>
              <th>Recommended Page</th>
              <td>PeoplePay Executive Dashboard</td>
            </tr>
            <tr>
              <th>Finance Evidence Location</th>
              <td>Finance site · Payroll Audit Reports document library</td>
            </tr>
            <tr>
              <th>HR Validation Location</th>
              <td>Human Resource site · Employee master and payroll readiness validation</td>
            </tr>
            <tr>
              <th>Public Dashboard Rule</th>
              <td>No salary, bank, NRC, PAYE, NAPSA, NHIMA, or payslip details should be published publicly.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Compliance Notes</h3>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Control Note</th>
            </tr>
          </thead>

          <tbody>
            {notes.length === 0 ? (
              <tr>
                <td colSpan={2}>No compliance notes configured.</td>
              </tr>
            ) : (
              notes.map((note: string, index: number) => (
                <tr key={note}>
                  <td>{index + 1}</td>
                  <td>{note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="notice">
        Payroll reports are reliable only after HR review, Finance review, Director approval, payroll lock,
        and payslip generation. The SharePoint automation should publish executive summaries only, while
        detailed payroll evidence remains restricted to Executive Leadership and Finance.
      </div>
    </section>
  );
}
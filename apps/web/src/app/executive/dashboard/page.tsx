import Link from 'next/link';
import { getExecutiveDashboard, getPayrollAuditCsvUrl } from '@/lib/api';

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export default async function ExecutiveDashboardPage() {
  const dashboard = await getExecutiveDashboard();

  const latest = dashboard.latestLockedPayroll;
  const recentRuns = dashboard.recentPayrollRuns || [];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Executive Dashboard</h1>
          <p className="muted">
            Management view for headcount, payroll cost, statutory compliance, approvals, and payslip readiness.
          </p>
        </div>

        <div className="action-row">
          <a className="btn-secondary" href={getPayrollAuditCsvUrl()}>
            Export Payroll Audit CSV
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
          <span className="summary-label">Payslips Generated</span>
          <strong>{dashboard.summary.totalPayslips}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Locked Payroll Runs</span>
          <strong>{dashboard.summary.lockedPayrollRuns}</strong>
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

      {latest && (
        <div className="notice">
          Latest locked payroll: <strong>{latest.runName}</strong> · {latest.periodName} · Locked{' '}
          {formatDate(latest.lockedAt)}
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
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {recentRuns.length === 0 ? (
              <tr>
                <td colSpan={10}>No payroll runs found.</td>
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
                    <span className={run.status === 'LOCKED' ? 'status-pill locked' : 'status-pill'}>
                      {run.status}
                    </span>
                  </td>
                  <td>{run.employeeCount}</td>
                  <td>{money(run.grossPay)}</td>
                  <td>{money(run.totalDeductions)}</td>
                  <td>{money(run.netPay)}</td>
                  <td>{money(run.employerCost)}</td>
                  <td>
                    <a className="link-button" href={getPayrollAuditCsvUrl(run.id)}>
                      Export CSV
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>SharePoint Executive Feed</h3>

        <p className="muted">
          Use this endpoint for a SharePoint page, Power Automate HTTP action, or a Power BI web feed during the next integration phase.
        </p>

        <div className="notice">
          <code>GET http://localhost:4000/api/executive/sharepoint-feed</code>
        </div>
      </div>

      <div className="notice">
        Payroll reports are only reliable after HR, Finance, and Director approval. Statutory rules must remain configurable and approved before live use.
      </div>
    </section>
  );
}
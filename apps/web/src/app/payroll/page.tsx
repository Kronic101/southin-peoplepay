import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPayrollPeriods, getPayrollReadyEmployees, getPayrollRuns } from '@/lib/api';

function formatDate(value?: string | null) {
  if (!value) return '-';

  const looksLikeIsoDate = /^\d{4}-\d{2}-\d{2}T/.test(value);

  if (looksLikeIsoDate) {
    return value.split('T')[0];
  }

  return value;
}

export default async function PayrollPage() {
  const [periods, readyEmployees, runs] = await Promise.all([
    getPayrollPeriods(),
    getPayrollReadyEmployees(),
    getPayrollRuns(),
  ]);

  const openPeriods = periods.filter((period: any) => period.status === 'OPEN');

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>Payroll</h1>
            <p className="muted">
              Payroll periods, payroll-ready employees, draft payroll runs, approvals, and payroll locks.
            </p>
          </div>

          <div className="actions">
            <Link className="btn-secondary" href="/payroll/periods/new">
              New Period
            </Link>

            <Link className="btn" href="/payroll/runs/new">
              New Payroll Run
            </Link>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Payroll periods</span>
            <strong>{periods.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Open periods</span>
            <strong>{openPeriods.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Payroll-ready employees</span>
            <strong>{readyEmployees.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Payroll runs</span>
            <strong>{runs.length}</strong>
          </div>
        </div>

        <div className="notice">
          Only employees marked as payroll-ready can be included in a new payroll run.
          HR and Finance must validate statutory details, approved bank account, contract, and approved conditions of service before payroll processing.
        </div>

        <div className="table-wrap">
          <h3>Payroll Periods</h3>

          <table>
            <thead>
              <tr>
                <th>Period Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Pay Date</th>
                <th>Status</th>
                <th>Runs</th>
              </tr>
            </thead>

            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll periods created yet.</td>
                </tr>
              ) : (
                periods.map((period: any) => (
                  <tr key={period.id}>
                    <td>{period.periodName}</td>
                    <td>{formatDate(period.startDate)}</td>
                    <td>{formatDate(period.endDate)}</td>
                    <td>{formatDate(period.payDate)}</td>
                    <td>
                      <span className={period.status === 'OPEN' ? 'status-pill ready' : 'status-pill not-ready'}>
                        {period.status}
                      </span>
                    </td>
                    <td>{period.runs?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Payroll-Ready Employees</h3>

          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Site</th>
                <th>Employment Type</th>
              </tr>
            </thead>

            <tbody>
              {readyEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll-ready employees available.</td>
                </tr>
              ) : (
                readyEmployees.map((employee: any) => (
                  <tr key={employee.id}>
                    <td>{employee.employeeNumber}</td>
                    <td>
                      <Link className="employee-link" href={`/employees/${employee.id}`}>
                        {employee.name}
                      </Link>
                    </td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.jobTitle || '-'}</td>
                    <td>{employee.site || '-'}</td>
                    <td>{employee.employmentType || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll runs created yet.</td>
                </tr>
              ) : (
                runs.map((run: any) => (
                  <tr key={run.id}>
                    <td>
                      <Link className="employee-link" href={`/payroll/runs/${run.id}`}>
                        {run.runName}
                      </Link>
                    </td>
                    <td>{run.payrollPeriod?.periodName || '-'}</td>
                    <td>{run.runType}</td>
                    <td>
                      <span className={run.status === 'OPEN' ? 'status-pill ready' : 'status-pill not-ready'}>
                        {run.status}
                      </span>
                    </td>
                    <td>{run.employees?.length || 0}</td>
                    <td>{formatDate(run.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
import Link from 'next/link';
import { Notice } from '@/components/ui/Notice';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { getPayrollReadinessGates } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  if (status === 'READY') {
    return 'status-pill locked';
  }

  if (status === 'BLOCKED') {
    return 'status-pill warning';
  }

  return 'status-pill';
}

function yesNo(value: boolean) {
  return value ? 'YES' : 'NO';
}

function formatReasons(reasons?: string[]) {
  if (!reasons || reasons.length === 0) {
    return 'Ready';
  }

  return reasons.join(' | ');
}

/**
 * Payroll readiness gates report.
 * --------------------------------------------------------------------
 * This report checks whether employees are ready for payroll processing
 * based on HR profile completion, contract status, bank validation, and
 * Finance readiness controls.
 */
export default async function PayrollReadinessPage() {
  const data = await getPayrollReadinessGates();
  const employees = data?.employees || [];
  const summary = data?.summary || {};

  const readyEmployees = employees.filter((employee: any) => employee.payrollReady);
  const blockedEmployees = employees.filter((employee: any) => !employee.payrollReady);

  return (
    <ReportPageFrame
      eyebrow="Payroll Readiness"
      title="Payroll Readiness Gates"
      description="HR and Finance control checks that determine whether employees can be included in payroll processing."
      actions={[
        { label: 'Reports Centre', href: '/reports' },
        { label: 'Payroll', href: '/payroll' },
        { label: 'HR Dashboard', href: '/hr/dashboard' },
        { label: 'Payment Prep', href: '/reports/bank-payment-preparation', variant: 'primary' },
      ]}
    >
      <div className="report-kpi-grid">
        <div className="summary-card">
          <span className="summary-label">Total Employees</span>
          <strong>{summary.totalEmployees ?? employees.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">HR Ready</span>
          <strong>{summary.hrReady ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Finance Ready</span>
          <strong>{summary.financeReady ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payroll Ready</span>
          <strong>{summary.payrollReady ?? readyEmployees.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked</span>
          <strong>{summary.blocked ?? blockedEmployees.length}</strong>
        </div>
      </div>

      <Notice>
        Strict payroll mode blocks payroll creation when any employee is not ready. Ready-only mode
        creates payroll for employees who have passed all HR and Finance gates.
      </Notice>

      <section className="report-section">
        <h3>Readiness Gate Results</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Status</th>
                <th>HR Gate</th>
                <th>Finance Gate</th>
                <th>Payroll Ready</th>
                <th>Blocking Reasons</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={9}>No employees found.</td>
                </tr>
              ) : (
                employees.map((employee: any) => (
                  <tr key={employee.employeeId}>
                    <td>{employee.employeeNumber}</td>
                    <td>{employee.name}</td>
                    <td>{employee.department || '-'}</td>
                    <td>{employee.employeeStatus || '-'}</td>
                    <td>
                      <span className={statusClass(employee.hrStatus)}>{employee.hrStatus}</span>
                    </td>
                    <td>
                      <span className={statusClass(employee.financeStatus)}>
                        {employee.financeStatus}
                      </span>
                    </td>
                    <td>{yesNo(Boolean(employee.payrollReady))}</td>
                    <td>{formatReasons(employee.blockingReasons)}</td>
                    <td>
                      <Link href={`/employees/${employee.employeeId}`}>Open Profile</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="report-two-column">
        <section className="report-section">
          <h3>Ready Employees</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Employee No.</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Employment Type</th>
                  <th>Bank Status</th>
                </tr>
              </thead>

              <tbody>
                {readyEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No employees are currently payroll-ready.</td>
                  </tr>
                ) : (
                  readyEmployees.map((employee: any) => (
                    <tr key={employee.employeeId}>
                      <td>{employee.employeeNumber}</td>
                      <td>{employee.name}</td>
                      <td>{employee.department || '-'}</td>
                      <td>{employee.employmentType || '-'}</td>
                      <td>{employee.bankDetailsStatus || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-section">
          <h3>Gate Rules</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>HR Rules</th>
                  <th>Finance Rules</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <ul>
                      {(data?.gates?.hr || []).map((rule: string) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </td>

                  <td>
                    <ul>
                      {(data?.gates?.finance || []).map((rule: string) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <details>
        <summary>Raw Payroll Readiness JSON</summary>
        <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </ReportPageFrame>
  );
}
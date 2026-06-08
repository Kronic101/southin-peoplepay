import Link from 'next/link';
import { getPayrollReadinessGates } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function Badge({ value }: { value: string }) {
  const isReady = value === 'READY' || value === 'APPROVED' || value === 'VALIDATED';

  return <span className={isReady ? 'badge success' : 'badge warning'}>{value}</span>;
}

function readableCheckName(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^has /i, 'Missing ')
    .replace(/^bank /i, 'Bank ')
    .replace(/^./, (char) => char.toUpperCase());
}

export default async function PayrollReadinessGatesPage() {
  const data = await getPayrollReadinessGates();
  const employees = data.employees || [];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>HR / Finance Payroll Readiness Gates</h1>
          <p className="muted">
            Employees must pass HR and Finance checks before they can be included in a payroll run.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/hr/payroll-readiness">
            Payroll Readiness
          </Link>

          <Link className="btn-secondary" href="/employees">
            Employees
          </Link>

          <Link className="btn" href="/payroll">
            Payroll
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Total Employees</span>
          <strong>{data.summary?.totalEmployees ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">HR Ready</span>
          <strong>{data.summary?.hrReady ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Finance Ready</span>
          <strong>{data.summary?.financeReady ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payroll Ready</span>
          <strong>{data.summary?.payrollReady ?? 0}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked</span>
          <strong>{data.summary?.blocked ?? 0}</strong>
        </div>
      </div>

      <div className="notice">
        Payroll runs should only include employees marked <strong>Payroll Ready</strong>. HR owns
        profile, contract, and conditions-of-service gates. Finance owns statutory and bank
        validation gates.
      </div>

      <h2>Readiness Gate Results</h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>HR Gate</th>
              <th>Finance Gate</th>
              <th>Payroll Ready</th>
              <th>Missing Items</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={9}>No employees found.</td>
              </tr>
            ) : (
              employees.map((employee: any) => {
                const missing = [...(employee.hrMissing || []), ...(employee.financeMissing || [])];

                return (
                  <tr key={employee.employeeId}>
                    <td>{employee.employeeNumber}</td>
                    <td>{employee.name}</td>
                    <td>{employee.department}</td>
                    <td>{employee.employmentType}</td>
                    <td>
                      <Badge value={employee.hrStatus} />
                    </td>
                    <td>
                      <Badge value={employee.financeStatus} />
                    </td>
                    <td>
                      <Badge value={employee.payrollReady ? 'READY' : 'BLOCKED'} />
                    </td>
                    <td>
                      {missing.length === 0 ? (
                        '-'
                      ) : (
                        <ul>
                          {missing.map((item: string) => (
                            <li key={item}>{readableCheckName(item)}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <Link href={`/employees/${employee.employeeId}`}>Open Employee</Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h2>Gate Ownership</h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Gate</th>
              <th>Owner</th>
              <th>Required Before Payroll</th>
            </tr>
          </thead>

          <tbody>
            {(data.gates?.hr || []).map((gate: string) => (
              <tr key={gate}>
                <td>HR Gate</td>
                <td>Human Resource</td>
                <td>{gate}</td>
              </tr>
            ))}

            {(data.gates?.finance || []).map((gate: string) => (
              <tr key={gate}>
                <td>Finance Gate</td>
                <td>Finance</td>
                <td>{gate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details>
        <summary>Raw Readiness JSON</summary>
        <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
      </details>
    </section>
  );
}
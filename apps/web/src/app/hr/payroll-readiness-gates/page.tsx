import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPayrollReadinessGates } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BadgeValue = string | boolean | null | undefined;

function Badge({ value }: { value: BadgeValue }) {
  const text =
    typeof value === 'boolean'
      ? value
        ? 'READY'
        : 'BLOCKED'
      : String(value || 'BLOCKED').toUpperCase();

  const isReady = ['READY', 'APPROVED', 'VALIDATED', 'ACTIVE', 'YES'].includes(text);

  return <span className={isReady ? 'status-pill ready' : 'status-pill warning'}>{text}</span>;
}

function readableCheckName(value: string) {
  return String(value || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^has /i, 'Missing ')
    .replace(/^bank /i, 'Bank ')
    .replace(/^./, (char) => char.toUpperCase());
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default async function PayrollReadinessGatesPage() {
  let data: any = {
    summary: {
      totalEmployees: 0,
      hrReady: 0,
      financeReady: 0,
      payrollReady: 0,
      blocked: 0,
    },
    employees: [],
    gates: {
      hr: [],
      finance: [],
    },
  };

  let errorMessage = '';

  try {
    const response = await getPayrollReadinessGates();

    data = {
      summary: {
        totalEmployees: Number(response?.summary?.totalEmployees ?? 0),
        hrReady: Number(response?.summary?.hrReady ?? 0),
        financeReady: Number(response?.summary?.financeReady ?? 0),
        payrollReady: Number(response?.summary?.payrollReady ?? 0),
        blocked: Number(response?.summary?.blocked ?? 0),
      },
      employees: safeArray(response?.employees),
      gates: {
        hr: safeArray<string>(response?.gates?.hr),
        finance: safeArray<string>(response?.gates?.finance),
      },
    };
  } catch (error: any) {
    errorMessage = error?.message || 'Unable to load payroll readiness gates.';
  }

  const employees = safeArray(data.employees);
  const hrGates = safeArray<string>(data.gates?.hr);
  const financeGates = safeArray<string>(data.gates?.finance);

  return (
    <AppShell>
      <section className="finance-live-page">
        <div className="page-stack">
          <div className="finance-live-card finance-hero-card">
            <div>
              <p className="eyebrow">Human Resources / Finance</p>
              <h1>Payroll Readiness Gates</h1>
              <p className="muted">
                Employees must pass HR and Finance checks before they can be included in a payroll
                run.
              </p>
            </div>

            <div className="action-row">
              <Link className="dark-button" href="/hr/payroll-readiness">
                Payroll Readiness
              </Link>

              <Link className="dark-button" href="/employees">
                Employees
              </Link>

              <Link className="primary-button" href="/payroll">
                Payroll
              </Link>
            </div>
          </div>

          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

          <div className="finance-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Total Employees</span>
              <strong>{data.summary.totalEmployees}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">HR Ready</span>
              <strong>{data.summary.hrReady}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Finance Ready</span>
              <strong>{data.summary.financeReady}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Payroll Ready</span>
              <strong>{data.summary.payrollReady}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Blocked</span>
              <strong>{data.summary.blocked}</strong>
            </div>
          </div>

          <div className="notice">
            Payroll runs should only include employees marked <strong>Payroll Ready</strong>. HR owns
            profile, contract, and conditions-of-service gates. Finance owns statutory and bank
            validation gates.
          </div>

          <div className="finance-live-card">
            <h2>Readiness Gate Results</h2>

            <div className="table-wrap">
              <table className="data-table">
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
                      const missing = [
                        ...safeArray<string>(employee?.hrMissing),
                        ...safeArray<string>(employee?.financeMissing),
                      ];

                      return (
                        <tr key={employee?.employeeId || employee?.employeeNumber}>
                          <td>{employee?.employeeNumber || '-'}</td>
                          <td>{employee?.name || '-'}</td>
                          <td>{employee?.department || '-'}</td>
                          <td>{employee?.employmentType || '-'}</td>
                          <td>
                            <Badge value={employee?.hrStatus} />
                          </td>
                          <td>
                            <Badge value={employee?.financeStatus} />
                          </td>
                          <td>
                            <Badge value={employee?.payrollReady ? 'READY' : 'BLOCKED'} />
                          </td>
                          <td>
                            {missing.length === 0 ? (
                              <span className="ready-text">Ready</span>
                            ) : (
                              <div className="missing-list">
                                {missing.map((item: string) => (
                                  <span key={item}>{readableCheckName(item)}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            {employee?.employeeId ? (
                              <Link
                                className="table-link"
                                href={`/employees/${employee.employeeId}`}
                              >
                                Open Employee
                              </Link>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="finance-live-card">
            <h2>Gate Ownership</h2>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gate</th>
                    <th>Owner</th>
                    <th>Required Before Payroll</th>
                  </tr>
                </thead>

                <tbody>
                  {hrGates.length === 0 && financeGates.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No gate ownership records configured yet.</td>
                    </tr>
                  ) : (
                    <>
                      {hrGates.map((gate: string) => (
                        <tr key={`hr-${gate}`}>
                          <td>HR Gate</td>
                          <td>Human Resources</td>
                          <td>{gate}</td>
                        </tr>
                      ))}

                      {financeGates.map((gate: string) => (
                        <tr key={`finance-${gate}`}>
                          <td>Finance Gate</td>
                          <td>Finance</td>
                          <td>{gate}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <details className="finance-live-card">
            <summary>Raw Readiness JSON</summary>
            <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
          </details>
        </div>
      </section>
    </AppShell>
  );
}
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPayrollReadiness } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const labelMap: Record<string, string> = {
  department: 'Department',
  jobTitle: 'Job title',
  site: 'Site',
  employmentType: 'Employment type',
  tpin: 'TPIN',
  napsaNumber: 'NAPSA number',
  nhimaNumber: 'NHIMA number',
  bankAccount: 'Bank account',
  approvedBankAccount: 'Approved bank account',
  contract: 'Contract',
  conditionOfService: 'Condition of service',
  approvedConditionOfService: 'Approved condition of service',
  portalAccess: 'Portal access',
};

const emptyReadiness = {
  summary: {
    totalEmployees: 0,
    payrollReady: 0,
    notReady: 0,
    readinessPercentage: 0,
  },
  rows: [],
};

export default async function PayrollReadinessPage() {
  let readiness: any = emptyReadiness;
  let errorMessage = '';

  try {
    const result = await getPayrollReadiness();
    readiness = {
      summary: {
        totalEmployees: Number(result?.summary?.totalEmployees ?? 0),
        payrollReady: Number(result?.summary?.payrollReady ?? 0),
        notReady: Number(result?.summary?.notReady ?? 0),
        readinessPercentage: Number(result?.summary?.readinessPercentage ?? 0),
      },
      rows: Array.isArray(result?.rows) ? result.rows : [],
    };
  } catch (error: any) {
    errorMessage = error?.message || 'Unable to load payroll readiness records.';
  }

  const rows = Array.isArray(readiness.rows) ? readiness.rows : [];

  return (
    <AppShell>
      <section className="finance-live-page">
        <div className="page-stack">
          <div className="finance-live-card finance-hero-card">
            <div>
              <p className="eyebrow">Human Resources</p>
              <h1>Payroll Readiness</h1>
              <p className="muted">
                HR and Finance validation view showing employees who are ready or not ready for
                payroll processing.
              </p>
            </div>

            <Link className="dark-button" href="/payroll">
              Payroll Dashboard
            </Link>
          </div>

          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

          <div className="finance-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Total employees</span>
              <strong>{readiness.summary.totalEmployees}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Payroll ready</span>
              <strong>{readiness.summary.payrollReady}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Not ready</span>
              <strong>{readiness.summary.notReady}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Readiness</span>
              <strong>{readiness.summary.readinessPercentage}%</strong>
            </div>
          </div>

          <div className="notice">
            Employees should not be included in live payroll until statutory details, approved bank
            account, contract, and approved conditions of service are validated by HR and Finance.
          </div>

          <div className="finance-live-card">
            <h2>Readiness Gate Results</h2>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee No.</th>
                    <th>Name</th>
                    <th>Employment Type</th>
                    <th>Status</th>
                    <th>Readiness</th>
                    <th>Missing Items</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No employees captured yet.</td>
                    </tr>
                  ) : (
                    rows.map((row: any) => {
                      const missingItems = Array.isArray(row?.missingItems)
                        ? row.missingItems
                        : [];

                      return (
                        <tr key={row.employeeId || row.employeeNumber}>
                          <td>{row.employeeNumber || '-'}</td>
                          <td>
                            {row.employeeId ? (
                              <Link className="employee-link" href={`/employees/${row.employeeId}`}>
                                {row.name || '-'}
                              </Link>
                            ) : (
                              row.name || '-'
                            )}
                          </td>
                          <td>{row.employmentType || '-'}</td>
                          <td>{row.status || '-'}</td>
                          <td>
                            <span
                              className={
                                row.payrollReady
                                  ? 'status-pill ready'
                                  : 'status-pill not-ready'
                              }
                            >
                              {Number(row.readinessPercentage ?? 0)}%
                            </span>
                          </td>
                          <td>
                            {missingItems.length === 0 ? (
                              <span className="ready-text">Ready</span>
                            ) : (
                              <div className="missing-list">
                                {missingItems.map((item: string) => (
                                  <span key={item}>{labelMap[item] || item}</span>
                                ))}
                              </div>
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
        </div>
      </section>
    </AppShell>
  );
}
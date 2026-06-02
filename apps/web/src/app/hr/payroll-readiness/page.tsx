import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPayrollReadiness } from '@/lib/api';

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

export default async function PayrollReadinessPage() {
  const readiness = await getPayrollReadiness();

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>Payroll Readiness</h1>
            <p className="muted">
              HR validation view showing employees who are ready or not ready for payroll processing.
            </p>
          </div>
        </div>

        <div className="summary-grid">
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

        <div className="table-wrap">
          <table>
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
              {readiness.rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No employees captured yet.</td>
                </tr>
              ) : (
                readiness.rows.map((row: any) => (
                  <tr key={row.employeeId}>
                    <td>{row.employeeNumber}</td>
                    <td>
                      <Link className="employee-link" href={`/employees/${row.employeeId}`}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.employmentType || '-'}</td>
                    <td>{row.status}</td>
                    <td>
                      <span className={row.payrollReady ? 'status-pill ready' : 'status-pill not-ready'}>
                        {row.readinessPercentage}%
                      </span>
                    </td>
                    <td>
                      {row.missingItems.length === 0 ? (
                        <span className="ready-text">Ready</span>
                      ) : (
                        <div className="missing-list">
                          {row.missingItems.map((item: string) => (
                            <span key={item}>{labelMap[item] || item}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="notice">
          Employees should not be included in live payroll until statutory details, approved bank account,
          contract, and approved conditions of service are validated by HR and Finance.
        </div>
      </section>
    </AppShell>
  );
}
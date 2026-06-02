import { AppShell } from '@/components/AppShell';
import { getPayrollRun } from '@/lib/api';

type PayrollRunPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

export default async function PayrollRunPage({ params }: PayrollRunPageProps) {
  const { id } = await params;
  const run = await getPayrollRun(id);

  const employees = run.employees || [];

  const totalGross = employees.reduce(
    (sum: number, line: any) => sum + Number(line.grossPay || 0),
    0,
  );

  const totalDeductions = employees.reduce(
    (sum: number, line: any) => sum + Number(line.totalDeductions || 0),
    0,
  );

  const totalNet = employees.reduce(
    (sum: number, line: any) => sum + Number(line.netPay || 0),
    0,
  );

  const totalEmployerCost = employees.reduce(
    (sum: number, line: any) => sum + Number(line.employerCost || 0),
    0,
  );

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>{run.runName}</h1>
            <p className="muted">
              {run.payrollPeriod?.periodName || '-'} · {run.runType} · {run.status}
            </p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Employees</span>
            <strong>{employees.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Gross Pay</span>
            <strong>{totalGross.toFixed(2)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Deductions</span>
            <strong>{totalDeductions.toFixed(2)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Net Pay</span>
            <strong>{totalNet.toFixed(2)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Employer Cost</span>
            <strong>{totalEmployerCost.toFixed(2)}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <h3>Payroll Employees</h3>

          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Employment Type</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Employer Cost</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={10}>No employees in this payroll run.</td>
                </tr>
              ) : (
                employees.map((line: any) => (
                  <tr key={line.id}>
                    <td>{line.employee?.employeeNumber || '-'}</td>
                    <td>
                      {line.employee?.firstName || '-'} {line.employee?.lastName || ''}
                    </td>
                    <td>{line.employee?.department?.name || '-'}</td>
                    <td>{line.employee?.jobTitle?.name || '-'}</td>
                    <td>{line.employee?.employmentType?.name || '-'}</td>
                    <td>{money(line.grossPay)}</td>
                    <td>{money(line.totalDeductions)}</td>
                    <td>{money(line.netPay)}</td>
                    <td>{money(line.employerCost)}</td>
                    <td>{line.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="notice">
          Payroll calculation, statutory deductions, approval workflow, and payroll lock will be added in the next payroll phases.
        </div>
      </section>
    </AppShell>
  );
}
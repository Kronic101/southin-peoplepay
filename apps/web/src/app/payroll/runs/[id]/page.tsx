import { AppShell } from '@/components/AppShell';
import { getPayrollRun } from '@/lib/api';

type PayrollRunPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PayrollRunPage({ params }: PayrollRunPageProps) {
  const { id } = await params;
  const run = await getPayrollRun(id);

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>{run.runName}</h1>
            <p className="muted">
              {run.payrollPeriod?.periodName} · {run.runType} · {run.status}
            </p>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Employees</span>
            <strong>{run.payrollRunEmployees.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Gross Pay</span>
            <strong>0.00</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Deductions</span>
            <strong>0.00</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Net Pay</span>
            <strong>0.00</strong>
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
                <th>Employment Type</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {run.payrollRunEmployees.map((line: any) => (
                <tr key={line.id}>
                  <td>{line.employee.employeeNumber}</td>
                  <td>
                    {line.employee.firstName} {line.employee.lastName}
                  </td>
                  <td>{line.employee.department?.name || '-'}</td>
                  <td>{line.employee.employmentType?.name || '-'}</td>
                  <td>{line.grossPay}</td>
                  <td>{line.totalDeductions}</td>
                  <td>{line.netPay}</td>
                  <td>{line.status}</td>
                </tr>
              ))}
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
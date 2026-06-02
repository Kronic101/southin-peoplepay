import { AppShell } from '@/components/AppShell';
import { getPayrollRun } from '@/lib/api';
import { PayrollRunLinesEditor } from './components/PayrollRunLinesEditor';

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
            <strong>{money(totalGross)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Deductions</span>
            <strong>{money(totalDeductions)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Net Pay</span>
            <strong>{money(totalNet)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Employer Cost</span>
            <strong>{money(totalEmployerCost)}</strong>
          </div>
        </div>

        <PayrollRunLinesEditor runId={run.id} employees={employees} />

        <div className="notice">
          This phase records manual gross pay and creates a BASIC_PAY earning. Statutory calculations for PAYE, NAPSA, and NHIMA will be added next.
        </div>
      </section>
    </AppShell>
  );
}
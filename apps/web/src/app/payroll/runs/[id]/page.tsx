import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPayrollRun } from '@/lib/api';
import { PayrollRunWorkflowActions } from './PayrollRunWorkflowActions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  const value = String(status).toUpperCase();

  if (['LOCKED', 'APPROVED', 'GENERATED', 'READY', 'COMPLETED'].includes(value)) {
    return 'status-pill locked';
  }

  if (['OPEN', 'DRAFT', 'PENDING'].includes(value)) {
    return 'status-pill warning';
  }

  if (['REJECTED', 'FAILED', 'BLOCKED'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

function getApprovals(payrollRun: any) {
  return payrollRun?.approvals || payrollRun?.approvalRecords || [];
}

function getEmployees(payrollRun: any) {
  return payrollRun?.employees || [];
}

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payrollRun = await getPayrollRun(id);

  const employees = getEmployees(payrollRun);
  const approvals = getApprovals(payrollRun);

  return (
    <AppShell>
      <section className="card">
        <div className="page-header">
          <div>
            <h1>{payrollRun?.runName || 'Payroll Run'}</h1>
            <p className="muted">
              {payrollRun?.payrollPeriod?.periodName || '-'} · {payrollRun?.runType || '-'} ·{' '}
              <strong>{payrollRun?.status || '-'}</strong>
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/payroll">
              Payroll
            </Link>

            <Link className="btn-secondary" href="/reports/payroll-readiness">
              Readiness
            </Link>

            <Link className="btn-secondary" href="/reports/payroll-audit">
              Payroll Audit
            </Link>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Employees</span>
            <strong>{payrollRun?.employeeCount ?? employees.length}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Gross Pay</span>
            <strong>{money(payrollRun?.grossPay)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Deductions</span>
            <strong>{money(payrollRun?.totalDeductions)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Net Pay</span>
            <strong>{money(payrollRun?.netPay)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Employer Cost</span>
            <strong>{money(payrollRun?.employerCost)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Created</span>
            <strong>{formatDateTime(payrollRun?.createdAt)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Locked At</span>
            <strong>{formatDateTime(payrollRun?.lockedAt)}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Status</span>
            <strong>{payrollRun?.status || '-'}</strong>
          </div>
        </div>

        <PayrollRunWorkflowActions payrollRun={payrollRun} />

        <div className="table-wrap">
          <h3>Payroll Employees</h3>

          <table>
            <thead>
              <tr>
                <th>Line ID</th>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Employment Type</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
                <th>Payslip</th>
              </tr>
            </thead>

            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={9}>No employees found in this payroll run.</td>
                </tr>
              ) : (
                employees.map((line: any) => {
                  const employee = line.employee || {};
                  const employeeName =
                    line.employeeName ||
                    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                    '-';

                  const payslipGenerated = Boolean(
                    line.payslip ||
                      line.payslipId ||
                      String(line.payslipStatus || '').toUpperCase() === 'GENERATED',
                  );

                  return (
                    <tr key={line.id}>
                      <td>{String(line.id || '').slice(0, 8)}...</td>
                      <td>{employee.employeeNumber || line.employeeNumber || '-'}</td>
                      <td>{employeeName}</td>
                      <td>{employee.department?.name || line.department || '-'}</td>
                      <td>{employee.employmentType?.name || line.employmentType || '-'}</td>
                      <td>{money(line.grossPay)}</td>
                      <td>{money(line.totalDeductions)}</td>
                      <td>{money(line.netPay)}</td>
                      <td>
                        <span className={statusClass(payslipGenerated ? 'GENERATED' : 'PENDING')}>
                          {payslipGenerated ? 'Generated' : 'Not Generated'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Approval Timeline</h3>

          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Role</th>
                <th>Approver</th>
                <th>Status</th>
                <th>Comments</th>
                <th>Approved At</th>
              </tr>
            </thead>

            <tbody>
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={6}>No approval records yet.</td>
                </tr>
              ) : (
                approvals.map((approval: any) => (
                  <tr key={approval.id}>
                    <td>{approval.stage || '-'}</td>
                    <td>{approval.role || approval.requiredRole || '-'}</td>
                    <td>{approval.approver || approval.approvedBy || '-'}</td>
                    <td>
                      <span className={statusClass(approval.status)}>{approval.status || '-'}</span>
                    </td>
                    <td>{approval.comments || '-'}</td>
                    <td>{formatDateTime(approval.approvedAt || approval.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <details>
          <summary>Raw Payroll Run JSON</summary>
          <pre className="json-preview">{JSON.stringify(payrollRun, null, 2)}</pre>
        </details>
      </section>
    </AppShell>
  );
}
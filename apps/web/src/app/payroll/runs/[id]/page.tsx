import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
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

function shortId(value?: string | null) {
  if (!value) return '-';
  return `${String(value).slice(0, 8)}...`;
}

function getEmployeeCount(run: any) {
  return run?.employeeCount ?? run?.employees?.length ?? 0;
}

function getTotals(run: any) {
  const employees = run?.employees || [];

  const grossPay =
    run?.grossPay ??
    run?.totals?.grossPay ??
    employees.reduce((sum: number, row: any) => sum + Number(row.grossPay || 0), 0);

  const deductions =
    run?.totalDeductions ??
    run?.totals?.totalDeductions ??
    employees.reduce((sum: number, row: any) => sum + Number(row.totalDeductions || 0), 0);

  const netPay =
    run?.netPay ??
    run?.totals?.netPay ??
    employees.reduce((sum: number, row: any) => sum + Number(row.netPay || 0), 0);

  const employerCost =
    run?.employerCost ??
    run?.totals?.employerCost ??
    employees.reduce((sum: number, row: any) => sum + Number(row.employerCost || 0), 0);

  return {
    grossPay,
    deductions,
    netPay,
    employerCost,
  };
}

function payslipStatus(row: any) {
  if (row?.payslip || row?.payslipId || row?.payslips?.length > 0) {
    return 'Generated';
  }

  return 'Not generated';
}

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getPayrollRun(id);

  const employees = run?.employees || [];
  const approvals = run?.approvals || run?.approvalTimeline || [];
  const totals = getTotals(run);

  const isLocked = run?.status === 'LOCKED';

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Payroll Run"
          title={run?.runName || 'Payroll Run'}
          description={`${run?.payrollPeriod?.periodName || run?.periodName || '-'} · ${
            run?.runType || '-'
          } · ${run?.status || '-'}`}
          actions={
            <>
              <Link className="btn-secondary" href="/payroll">
                Payroll
              </Link>

              <Link className="btn-secondary" href="/hr/payroll-readiness-gates">
                Readiness
              </Link>

              <Link className="btn-secondary" href="/reports/payroll-audit">
                Payroll Audit
              </Link>
            </>
          }
        />

        <SummaryGrid
          items={[
            {
              label: 'Employees',
              value: getEmployeeCount(run),
            },
            {
              label: 'Gross Pay',
              value: money(totals.grossPay),
            },
            {
              label: 'Deductions',
              value: money(totals.deductions),
            },
            {
              label: 'Net Pay',
              value: money(totals.netPay),
            },
            {
              label: 'Employer Cost',
              value: money(totals.employerCost),
            },
            {
              label: 'Created',
              value: formatDateTime(run?.createdAt),
            },
            {
              label: 'Locked At',
              value: formatDateTime(run?.lockedAt),
            },
            {
              label: 'Status',
              value: run?.status || '-',
            },
          ]}
        />

        <div className="workflow-panel">
          <h3>Payroll Review Workflow</h3>
          <p className="muted">
            Current status: <strong>{run?.status || '-'}</strong>. Actions are shown based on the
            selected role and workflow state.
          </p>

          {isLocked ? (
            <Notice>
              Payroll is locked and payslips have been generated. Workflow actions are now locked
              for audit control.
            </Notice>
          ) : (
            <PayrollRunWorkflowActions payrollRun={run} />
          )}
        </div>

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
                  <td colSpan={9}>No employees are attached to this payroll run.</td>
                </tr>
              ) : (
                employees.map((row: any) => {
                  const employee = row.employee || {};
                  const name =
                    row.employeeName ||
                    employee.name ||
                    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                    '-';

                  return (
                    <tr key={row.id}>
                      <td>{shortId(row.id)}</td>
                      <td>{row.employeeNumber || employee.employeeNumber || '-'}</td>
                      <td>{name}</td>
                      <td>{row.department || employee.department?.name || '-'}</td>
                      <td>{row.employmentType || employee.employmentType?.name || '-'}</td>
                      <td>{money(row.grossPay)}</td>
                      <td>{money(row.totalDeductions)}</td>
                      <td>{money(row.netPay)}</td>
                      <td>
                        <StatusPill status={payslipStatus(row)} />
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
                  <tr key={approval.id || `${approval.stage}-${approval.createdAt}`}>
                    <td>{approval.stage || '-'}</td>
                    <td>{approval.role || approval.requiredRole || '-'}</td>
                    <td>{approval.approver || approval.approvedBy || '-'}</td>
                    <td>
                      <StatusPill status={approval.status || '-'} />
                    </td>
                    <td>{approval.comments || approval.notes || '-'}</td>
                    <td>{formatDateTime(approval.approvedAt || approval.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <details>
          <summary>Raw Payroll Run JSON</summary>
          <pre className="json-preview">{JSON.stringify(run, null, 2)}</pre>
        </details>
      </section>
    </AppShell>
  );
}
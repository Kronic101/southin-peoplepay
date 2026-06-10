import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { getPayrollDashboard } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

export default async function PayrollPage() {
  const data = await getPayrollDashboard();

  const periods = data?.payrollPeriods || [];
  const readyEmployees = data?.payrollReadyEmployees || [];
  const runs = data?.payrollRuns || [];

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Payroll Control"
          title="Payroll Dashboard"
          description="Manage payroll periods, payroll-ready employees, draft payroll runs, approvals, and payroll locks."
          actions={
            <>
              <Link className="btn-secondary" href="/payroll/periods/new">
                New Period
              </Link>

              <Link className="btn" href="/payroll/runs/new">
                New Payroll Run
              </Link>
            </>
          }
        />

        <SummaryGrid
          items={[
            {
              label: 'Payroll periods',
              value: data?.summary?.payrollPeriods ?? periods.length,
            },
            {
              label: 'Open periods',
              value:
                data?.summary?.openPayrollPeriods ??
                periods.filter((period: any) => period.status === 'OPEN').length,
            },
            {
              label: 'Payroll-ready employees',
              value: data?.summary?.payrollReadyEmployees ?? readyEmployees.length,
            },
            {
              label: 'Payroll runs',
              value: data?.summary?.payrollRuns ?? runs.length,
            },
          ]}
        />

        <Notice>
          Only employees who have passed HR and Finance readiness gates can be included in payroll.
          This protects payroll from incomplete employee records, unvalidated bank details, missing
          contracts, or unapproved conditions of service.
        </Notice>

        <div className="table-wrap">
          <h3>Payroll Periods</h3>

          <table>
            <thead>
              <tr>
                <th>Period Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Pay Date</th>
                <th>Status</th>
                <th>Runs</th>
              </tr>
            </thead>

            <tbody>
              {periods.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll periods found.</td>
                </tr>
              ) : (
                periods.map((period: any) => (
                  <tr key={period.id}>
                    <td>{period.periodName}</td>
                    <td>{formatDate(period.startDate)}</td>
                    <td>{formatDate(period.endDate)}</td>
                    <td>{formatDate(period.payDate)}</td>
                    <td>
                      <StatusPill status={period.status} />
                    </td>
                    <td>{period.runCount ?? period._count?.runs ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Payroll-Ready Employees</h3>

          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Department</th>
                <th>Job Title</th>
                <th>Site</th>
                <th>Employment Type</th>
              </tr>
            </thead>

            <tbody>
              {readyEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll-ready employees found.</td>
                </tr>
              ) : (
                readyEmployees.map((employee: any) => {
                  const employeeId = employee.employeeId || employee.id;
                  const name =
                    employee.name ||
                    `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                    '-';

                  return (
                    <tr key={employeeId}>
                      <td>{employee.employeeNumber || '-'}</td>
                      <td>
                        <Link href={`/employees/${employeeId}`}>{name}</Link>
                      </td>
                      <td>{employee.department?.name || employee.department || '-'}</td>
                      <td>{employee.jobTitle?.name || employee.jobTitle || '-'}</td>
                      <td>{employee.site?.name || employee.site || '-'}</td>
                      <td>{employee.employmentType?.name || employee.employmentType || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Recent Payroll Runs</h3>

          <table>
            <thead>
              <tr>
                <th>Run Name</th>
                <th>Period</th>
                <th>Type</th>
                <th>Status</th>
                <th>Employees</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6}>No payroll runs found.</td>
                </tr>
              ) : (
                runs.map((run: any) => (
                  <tr key={run.id}>
                    <td>
                      <Link href={`/payroll/runs/${run.id}`}>{run.runName}</Link>
                    </td>
                    <td>{run.periodName || run.payrollPeriod?.periodName || '-'}</td>
                    <td>{run.runType || '-'}</td>
                    <td>
                      <StatusPill status={run.status} />
                    </td>
                    <td>{run.employeeCount ?? run.employees?.length ?? '-'}</td>
                    <td>{formatDate(run.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
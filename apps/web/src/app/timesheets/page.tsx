import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getTimesheetDashboard, getPeopleOpsContext } from '@/lib/api';
import {
  approvalLabel,
  approvalProgress,
  payrollReady as approvalPayrollReady,
  currentApprover,
} from '@/lib/people-ops-approval-ui';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    siteId?: string;
  }>;
};

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-ZM', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatName(record: any) {
  return (
    record?.employee?.name ||
    record?.employeeName ||
    `${record?.employee?.firstName || ''} ${record?.employee?.lastName || ''}`.trim() ||
    '-'
  );
}

function money(value: unknown) {
  return `K ${Number(value || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getEmployeeRate(employee: any) {
  if (employee?.hourlyRate) return `${money(employee.hourlyRate)}/hr`;
  if (employee?.dailyRate) return `${money(employee.dailyRate)}/day`;
  if (employee?.monthlyRate) return `${money(employee.monthlyRate)}/month`;
  return '-';
}




export default async function TimesheetsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getTimesheetDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];
  const sites = context?.sites || [];
  const records = (data as any)?.timesheets || (data as any)?.records || (data as any)?.items || [];

  const summary = data?.summary || {};

  const hourlyEmployees = employees.filter((employee: any) => String(employee.payBasis || '').toUpperCase() === 'HOURLY');
  const dailyEmployees = employees.filter((employee: any) => String(employee.payBasis || '').toUpperCase() === 'DAILY');

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">People Operations</p>
            <h1>Timesheets</h1>
            <p className="muted">
              Capture and approve normal hours, site hours, casual-worker hours, and payroll-ready working time.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/attendance">
              Attendance
            </Link>

            <Link className="btn" href={`/timesheets/new${siteId ? `?siteId=${siteId}` : ''}`}>
              New Timesheet
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Open Timesheets</span>
            <strong>{summary.openTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Submitted</span>
            <strong>{summary.submittedTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved</span>
            <strong>{summary.approvedTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Exceptions</span>
            <strong>{summary.exceptionCount ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Selected Site Employees</span>
            <strong>{employees.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Hourly Employees</span>
            <strong>{hourlyEmployees.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Daily Employees</span>
            <strong>{dailyEmployees.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Site Managers</span>
            <strong>{siteManagers.length}</strong>
          </div>
        </div>

        <div className="finance-notice warning">
          Timesheets are the payroll source for casual and hourly employees. Payroll should only
          consume approved timesheets linked to the correct employee, site, manager, and payroll period.
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Site Filter</h2>
              <p className="muted">
                Select a site before creating timesheets so the employee list and manager cross-check are correct.
              </p>
            </div>
          </div>

          <form className="form-grid" method="get">
            <label>
              Site / Location
              <select name="siteId" defaultValue={siteId}>
                <option value="">All sites</option>
                {sites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.code ? `${site.code} - ` : ''}
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="action-row form-action-row">
              <button className="btn" type="submit">
                Load Site
              </button>

              {siteId ? (
                <Link className="btn-secondary" href="/timesheets">
                  Clear
                </Link>
              ) : null}
            </div>
          </form>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Responsible Site Managers</h2>
              <p className="muted">
                These managers are responsible for approving or confirming timesheet hours for this site.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Manager</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Primary</th>
                </tr>
              </thead>

              <tbody>
                {siteManagers.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No site managers assigned to this site yet.</td>
                  </tr>
                ) : (
                  siteManagers.map((manager: any) => (
                    <tr key={manager.id}>
                      <td>{manager.managerName || '-'}</td>
                      <td>{manager.managerEmail || '-'}</td>
                      <td>{manager.managerRole || 'SITE_MANAGER'}</td>
                      <td>{manager.isPrimary ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Employees at Selected Site</h2>
              <p className="muted">
                These employees should be available for site-specific timesheet capture.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee No.</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Employment Type</th>
                  <th>Pay Basis</th>
                  <th>Rate</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No employees found for this site.</td>
                  </tr>
                ) : (
                  employees.map((employee: any) => (
                    <tr key={employee.id}>
                      <td>{employee.employeeNumber}</td>
                      <td>
                        <Link className="employee-link" href={`/employees/${employee.id}`}>
                          {employee.name ||
                            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                            '-'}
                        </Link>
                      </td>
                      <td>{displayValue(employee.department)}</td>
                      <td>{displayValue(employee.jobTitle)}</td>
                      <td>{displayValue(employee.employmentType)}</td>
                      <td>{displayValue(employee.payBasis)}</td>
                      <td>{getEmployeeRate(employee)}</td>
                      <td>
                        <StatusPill status={displayValue(employee.status, 'DRAFT')} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Recent Timesheets</h2>
              <p className="muted">
                Only approved timesheets should be consumed during payroll run calculation.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timesheet</th>
                  <th>Employee</th>
                  <th>Site</th>
                  <th>Period</th>
                  <th>Normal Hours</th>
                  <th>Overtime Hours</th>
                  <th>Current Approver</th>
                  <th>Approval</th>
                  <th>Steps</th>
                  <th>Payroll Ready</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No timesheets found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.id}>
                      <td>{record.timesheetNo || record.requestReference || '-'}</td>
                      <td>{formatName(record)}</td>
                      <td>{record.siteName || record.site || '-'}</td>
                      <td>
                        {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                      </td>
                      <td>{record.normalHours ?? '-'}</td>
                      <td>{record.overtimeHours ?? '-'}</td>
                      <td>{currentApprover(record)}</td>
                      <td>
                        <StatusPill status={approvalLabel(record)} />
                      </td>
                      <td>{approvalProgress(record)}</td>
                      <td>
                        <StatusPill status={approvalPayrollReady(record)} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
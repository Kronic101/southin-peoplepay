import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getPeopleOpsContext, getTimesheetDashboard } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    siteId?: string;
  }>;
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '-';
  }
}

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

function formatMoney(value: any) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return 'K 0.00';
  }

  return `K ${amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['APPROVED', 'VALIDATED', 'COMPLETED', 'LOCKED'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'DECLINED', 'CANCELLED', 'EXCEPTION'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

export default async function TimesheetsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getTimesheetDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const timesheets = data?.recentTimesheets || [];
  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];

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
            <strong>{data?.summary?.openTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Submitted</span>
            <strong>{data?.summary?.submittedTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved</span>
            <strong>{data?.summary?.approvedTimesheets ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Exceptions</span>
            <strong>{data?.summary?.exceptionCount ?? 0}</strong>
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
          Timesheets are the payroll source for casual and hourly employees. Payroll should only consume
          approved timesheets linked to the correct employee, site, manager, and payroll period.
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

          <form className="finance-form-grid" method="get">
            <label>
              Site / Location
              <select name="siteId" defaultValue={siteId}>
                <option value="">All sites</option>
                {context.sites.map((site: any) => (
                  <option key={site.id} value={site.id}>
                    {site.code ? `${site.code} - ` : ''}
                    {site.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button className="btn" type="submit">
                Load Site
              </button>

              <Link className="btn-secondary" href="/timesheets">
                Clear
              </Link>
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
                      <td>{manager.managerName}</td>
                      <td>{manager.managerEmail}</td>
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
                  employees.map((employee: any) => {
                    const payBasis = String(employee.payBasis || '').toUpperCase();

                    let rate = '-';

                    if (payBasis === 'HOURLY' && employee.hourlyRate) {
                      rate = `${formatMoney(employee.hourlyRate)} / hr`;
                    }

                    if (payBasis === 'DAILY' && employee.dailyRate) {
                      rate = `${formatMoney(employee.dailyRate)} / day`;
                    }

                    if (payBasis === 'MONTHLY' && employee.monthlyRate) {
                      rate = `${formatMoney(employee.monthlyRate)} / month`;
                    }

                    return (
                      <tr key={employee.id}>
                        <td>{employee.employeeNumber}</td>
                        <td>
                          <Link className="employee-link" href={`/employees/${employee.id}`}>
                            {employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                          </Link>
                        </td>
                        <td>{displayValue(employee.department)}</td>
                        <td>{displayValue(employee.jobTitle)}</td>
                        <td>{displayValue(employee.employmentType)}</td>
                        <td>{displayValue(employee.payBasis)}</td>
                        <td>{rate}</td>
                        <td>
                          <span className={statusClass(employee.status)}>
                            {displayValue(employee.status, 'DRAFT')}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
                Approved timesheets will later feed payroll calculations for hourly, daily and casual employees.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Employee</th>
                  <th>Site</th>
                  <th>Normal Hours</th>
                  <th>Overtime Hours</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {timesheets.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No timesheets captured yet.</td>
                  </tr>
                ) : (
                  timesheets.map((sheet: any, index: number) => (
                    <tr key={sheet.id || index}>
                      <td>
                        {formatDate(sheet.periodStart)} - {formatDate(sheet.periodEnd)}
                      </td>
                      <td>
                        {sheet.employeeId ? (
                          <Link className="employee-link" href={`/employees/${sheet.employeeId}`}>
                            {displayValue(sheet.employeeName || sheet.employee)}
                          </Link>
                        ) : (
                          displayValue(sheet.employeeName || sheet.employee)
                        )}
                      </td>
                      <td>{displayValue(sheet.siteName || sheet.site)}</td>
                      <td>{sheet.normalHours ?? 0}</td>
                      <td>{sheet.overtimeHours ?? 0}</td>
                      <td>{sheet.totalHours ?? 0}</td>
                      <td>
                        <span className={statusClass(sheet.status)}>
                          {displayValue(sheet.status, 'OPEN')}
                        </span>
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
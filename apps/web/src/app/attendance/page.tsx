import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getAttendanceDashboard, getPeopleOpsContext } from '@/lib/api';

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

export default async function AttendancePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getAttendanceDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];
  const sites = context?.sites || [];

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">People Operations</p>
            <h1>Attendance</h1>
            <p className="muted">
              Track daily employee attendance by site, shift, and responsible site manager.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/timesheets">
              Timesheets
            </Link>

            <Link className="btn" href={`/attendance/new${siteId ? `?siteId=${siteId}` : ''}`}>
              Capture Attendance
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Selected Site Employees</span>
            <strong>{employees.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Site Managers</span>
            <strong>{siteManagers.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Present Today</span>
            <strong>{data?.summary?.presentToday ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Absent Today</span>
            <strong>{data?.summary?.absentToday ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Late Clock-ins</span>
            <strong>{data?.summary?.lateToday ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Today Records</span>
            <strong>{data?.summary?.todayRecords ?? 0}</strong>
          </div>
        </div>

        <div className="finance-notice warning">
          Attendance must be captured against the employee’s assigned site. Payroll should only
          consume attendance records after site-manager cross-checking.
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Site Filter</h2>
              <p className="muted">
                Select a site to view employees and the responsible site manager before attendance is captured.
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
                <Link className="btn-secondary" href="/attendance">
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
                These managers are responsible for verifying attendance records for the selected site.
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
                      <td>{manager.managerName || manager.name || '-'}</td>
                      <td>{manager.managerEmail || manager.email || '-'}</td>
                      <td>{manager.managerRole || manager.role || 'SITE_MANAGER'}</td>
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
              <h2>Employees Assigned to Selected Site</h2>
              <p className="muted">
                Attendance records should be captured against these employees for the selected site.
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
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No employees assigned to this site yet.</td>
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
      </section>
    </AppShell>
  );
}
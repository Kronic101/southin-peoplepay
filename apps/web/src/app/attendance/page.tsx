import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
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

  const employees = context.employees || [];
  const siteManagers = context.siteManagers || [];

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="People Operations"
          title="Attendance"
          description="Track daily employee attendance by site, shift, and responsible site manager."
          actions={
            <>
              <Link className="btn-secondary" href="/timesheets">
                Timesheets
              </Link>
              <Link className="btn" href={`/attendance/new${siteId ? `?siteId=${siteId}` : ''}`}>
                Capture Attendance
              </Link>
            </>
          }
        />

        <SummaryGrid
          items={[
            { label: 'Selected site employees', value: employees.length },
            { label: 'Site managers', value: siteManagers.length },
            { label: 'Present today', value: data?.summary?.presentToday ?? 0 },
            { label: 'Absent today', value: data?.summary?.absentToday ?? 0 },
          ]}
        />

        <Notice>
          Select a site to view employees assigned to that location. Attendance records captured for
          these employees will be cross-referenced against the responsible site manager before payroll.
        </Notice>

        <form className="form-grid" method="get">
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

          <div>
            <button className="btn" type="submit">
              Load Site
            </button>
          </div>
        </form>

        <div className="table-wrap">
          <h3>Site Managers</h3>

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

        <div className="table-wrap">
          <h3>Employees Assigned to Selected Site</h3>

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
                      <Link href={`/employees/${employee.id}`}>
                        {employee.name}
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
      </section>
    </AppShell>
  );
}
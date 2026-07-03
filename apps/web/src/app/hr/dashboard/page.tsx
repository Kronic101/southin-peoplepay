import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';
import { StatusPill } from '@/components/ui/StatusPill';
import { getHrDashboard } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

export default async function HrDashboardPage() {
  const data = await getHrDashboard();

  const recentEmployees = data?.recentEmployees || [];
  const employeesBySite = data?.employeesBySite || [];
  const pendingActions = data?.pendingActions || [];

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Human Resources"
          title="HR Dashboard"
          description="Manage employee onboarding, site allocation, contracts, service conditions, statutory details, portal access, and payroll readiness."
          actions={
            <>
              <Link className="btn-secondary" href="/employees">
                Employee Register
              </Link>

              <Link className="btn" href="/employees/new">
                Add Employee
              </Link>
            </>
          }
        />

        <SummaryGrid
          items={[
            {
              label: 'Total employees',
              value: data?.summary?.totalEmployees ?? 0,
            },
            {
              label: 'Active employees',
              value: data?.summary?.activeEmployees ?? 0,
            },
            {
              label: 'Draft profiles',
              value: data?.summary?.draftEmployees ?? 0,
            },
            {
              label: 'Portal enabled',
              value: data?.summary?.portalEnabled ?? 0,
            },
            {
              label: 'Casual workers',
              value: data?.summary?.casualWorkers ?? 0,
            },
            {
              label: 'Payroll-ready',
              value: data?.summary?.payrollReadyEmployees ?? 0,
            },
          ]}
        />

        <Notice>
          HR must assign every employee to a site/location and confirm the employment type before
          payroll readiness can be trusted. Casual workers must have a pay basis and hourly/daily rate
          before timesheets can feed payroll.
        </Notice>

        <div className="table-wrap">
          <h3>Pending HR Actions</h3>

          <table>
            <thead>
              <tr>
                <th>Area</th>
                <th>Issue</th>
                <th>Employee</th>
                <th>Site</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {pendingActions.length === 0 ? (
                <tr>
                  <td colSpan={5}>No pending HR actions found.</td>
                </tr>
              ) : (
                pendingActions.map((item: any, index: number) => (
                  <tr key={item.id || index}>
                    <td>{displayValue(item.area)}</td>
                    <td>{displayValue(item.issue)}</td>
                    <td>
                      {item.employeeId ? (
                        <Link href={`/employees/${item.employeeId}`}>{displayValue(item.employeeName)}</Link>
                      ) : (
                        displayValue(item.employeeName)
                      )}
                    </td>
                    <td>{displayValue(item.site)}</td>
                    <td>
                      <StatusPill status={displayValue(item.status, 'PENDING')} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Employees by Site</h3>

          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Total Employees</th>
                <th>Active</th>
                <th>Casual</th>
                <th>Portal Enabled</th>
              </tr>
            </thead>

            <tbody>
              {employeesBySite.length === 0 ? (
                <tr>
                  <td colSpan={5}>No site allocation summary available yet.</td>
                </tr>
              ) : (
                employeesBySite.map((site: any, index: number) => (
                  <tr key={site.siteId || index}>
                    <td>{displayValue(site.siteName || site.site)}</td>
                    <td>{site.totalEmployees ?? 0}</td>
                    <td>{site.activeEmployees ?? 0}</td>
                    <td>{site.casualWorkers ?? 0}</td>
                    <td>{site.portalEnabled ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-wrap">
          <h3>Recently Added Employees</h3>

          <table>
            <thead>
              <tr>
                <th>Employee No.</th>
                <th>Name</th>
                <th>Site</th>
                <th>Employment Type</th>
                <th>Status</th>
                <th>Portal</th>
              </tr>
            </thead>

            <tbody>
              {recentEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6}>No recent employees found.</td>
                </tr>
              ) : (
                recentEmployees.map((employee: any) => {
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
                      <td>{displayValue(employee.siteName || employee.site)}</td>
                      <td>{displayValue(employee.employmentType)}</td>
                      <td>
                        <StatusPill status={displayValue(employee.status, 'DRAFT')} />
                      </td>
                      <td>{employee.portalAccount?.isActive ? 'Enabled' : 'Not enabled'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
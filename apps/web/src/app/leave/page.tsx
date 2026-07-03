import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getLeaveDashboard, getPeopleOpsContext } from '@/lib/api';

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

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['APPROVED', 'VALIDATED', 'COMPLETED'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'DECLINED', 'CANCELLED'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

export default async function LeavePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getLeaveDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const requests = data?.recentRequests || [];
  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">People Operations</p>
            <h1>Leave</h1>
            <p className="muted">
              Manage leave requests by site, employee, responsible manager, approval status, and payroll impact.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/leave-approvals">
              Leave Approvals
            </Link>

            <Link className="btn" href={`/leave/new${siteId ? `?siteId=${siteId}` : ''}`}>
              New Leave Request
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Pending Requests</span>
            <strong>{data?.summary?.pendingRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved This Month</span>
            <strong>{data?.summary?.approvedThisMonth ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>On Leave Today</span>
            <strong>{data?.summary?.onLeaveToday ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Rejected This Month</span>
            <strong>{data?.summary?.rejectedThisMonth ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Selected Site Employees</span>
            <strong>{employees.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Site Managers</span>
            <strong>{siteManagers.length}</strong>
          </div>
        </div>

        <div className="finance-notice warning">
          Leave must be linked to the employee site/location so payroll can correctly handle paid leave,
          unpaid leave, and manager accountability during the payroll period.
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Site Filter</h2>
              <p className="muted">
                Select a site to cross-reference employees, leave records, and the responsible site manager.
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

              <Link className="btn-secondary" href="/leave">
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
                These managers are responsible for verifying leave records for the selected site.
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
                Leave requests should be raised against these employees when a site is selected.
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
                    <td colSpan={7}>No employees found for this site.</td>
                  </tr>
                ) : (
                  employees.map((employee: any) => (
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
                      <td>
                        <span className={statusClass(employee.status)}>{displayValue(employee.status, 'DRAFT')}</span>
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
              <h2>Recent Leave Requests</h2>
              <p className="muted">
                Approved and unpaid leave will later feed payroll calculations by employee, site, and pay period.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Employee</th>
                  <th>Site</th>
                  <th>Leave Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No leave requests found.</td>
                  </tr>
                ) : (
                  requests.map((request: any, index: number) => (
                    <tr key={request.id || index}>
                      <td>{request.reference || request.requestNo || '-'}</td>
                      <td>
                        {request.employeeId ? (
                          <Link className="employee-link" href={`/employees/${request.employeeId}`}>
                            {displayValue(request.employeeName || request.employee)}
                          </Link>
                        ) : (
                          displayValue(request.employeeName || request.employee)
                        )}
                      </td>
                      <td>{displayValue(request.siteName || request.site)}</td>
                      <td>{displayValue(request.leaveType)}</td>
                      <td>{formatDate(request.startDate)}</td>
                      <td>{formatDate(request.endDate)}</td>
                      <td>{request.days ?? '-'}</td>
                      <td>
                        <span className={statusClass(request.status)}>
                          {displayValue(request.status, 'SUBMITTED')}
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
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getOvertimeDashboard, getPeopleOpsContext } from '@/lib/api';

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

  if (['APPROVED', 'VALIDATED', 'COMPLETED', 'PAID'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'DECLINED', 'CANCELLED'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill warning';
}

export default async function OvertimePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getOvertimeDashboard(),
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
            <h1>Overtime</h1>
            <p className="muted">
              Control overtime by site, employee, manager approval, approved hours, and payroll cost impact.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">
              Approval Inbox
            </Link>

            <Link className="btn" href={`/overtime/new${siteId ? `?siteId=${siteId}` : ''}`}>
              New Overtime Request
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Pending Requests</span>
            <strong>{data?.summary?.pendingRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved Requests</span>
            <strong>{data?.summary?.approvedRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved Hours</span>
            <strong>{data?.summary?.approvedHours ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Estimated Cost</span>
            <strong>{formatMoney(data?.summary?.estimatedCost ?? 0)}</strong>
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
          Overtime must be approved against the employee’s site before payroll. This prevents unapproved
          extra hours from being paid and keeps each site manager accountable for the overtime cost.
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Site Filter</h2>
              <p className="muted">
                Select a site to review employees and responsible managers before overtime is submitted.
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

              <Link className="btn-secondary" href="/overtime">
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
                These managers should verify overtime before it is accepted into payroll.
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
                Overtime requests should only be raised for employees assigned to the selected location.
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
                  <th>Hourly Rate</th>
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
                          {employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim()}
                        </Link>
                      </td>
                      <td>{displayValue(employee.department)}</td>
                      <td>{displayValue(employee.jobTitle)}</td>
                      <td>{displayValue(employee.employmentType)}</td>
                      <td>{displayValue(employee.payBasis)}</td>
                      <td>{employee.hourlyRate ? formatMoney(employee.hourlyRate) : '-'}</td>
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
              <h2>Recent Overtime Requests</h2>
              <p className="muted">
                Approved overtime hours will later feed payroll calculations by employee, site, and pay period.
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
                  <th>Hours</th>
                  <th>Rate Type</th>
                  <th>Estimated Cost</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No overtime requests found.</td>
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
                      <td>{request.hours ?? '-'}</td>
                      <td>{displayValue(request.rateType || request.overtimeType)}</td>
                      <td>{formatMoney(request.estimatedCost)}</td>
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
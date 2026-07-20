import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getOvertimeDashboard, getPeopleOpsContext } from '@/lib/api';
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

function money(value: unknown) {
  return `K ${Number(value || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

export default async function OvertimePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getOvertimeDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];
  const sites = context?.sites || [];
  const records = (data as any)?.overtimeRequests || (data as any)?.requests || (data as any)?.records || [];

  const summary = data?.summary || {};

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
            <strong>{summary.pendingRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved Requests</span>
            <strong>{summary.approvedRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved Hours</span>
            <strong>{summary.approvedHours ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Estimated Cost</span>
            <strong>{money(summary.estimatedCost ?? 0)}</strong>
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
          extra hours from being paid and keeps each site manager accountable for overtime cost.
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
                <Link className="btn-secondary" href="/overtime">
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
                          {employee.name ||
                            `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                            '-'}
                        </Link>
                      </td>
                      <td>{displayValue(employee.department)}</td>
                      <td>{displayValue(employee.jobTitle)}</td>
                      <td>{displayValue(employee.employmentType)}</td>
                      <td>{displayValue(employee.payBasis)}</td>
                      <td>{employee.hourlyRate ? money(employee.hourlyRate) : '-'}</td>
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
              <h2>Recent Overtime Requests</h2>
              <p className="muted">
                Approved overtime should feed payroll calculations only after manager approval.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
              <tr>
                <th>Employee</th>
                <th>Site</th>
                <th>Date</th>
                <th>Hours</th>
                <th>Rate</th>
                <th>Estimated Cost</th>
                <th>Current Approver</th>
                <th>Approval</th>
                <th>Steps</th>
                <th>Payroll Ready</th>
              </tr>
            </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No overtime requests found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => {
                  const hours = Number(record.approvedHours ?? record.requestedHours ?? record.hours ?? 0);
                  const rate = Number(record.hourlyRate ?? record.rate ?? 0);
                  const estimatedCost = Number(record.estimatedCost ?? hours * rate);

                  return (
                    <tr key={record.id}>
                      <td>{formatName(record)}</td>
                      <td>{record.siteName || record.site || '-'}</td>
                      <td>{formatDate(record.overtimeDate || record.date || record.createdAt)}</td>
                      <td>{hours}</td>
                      <td>{money(rate)}</td>
                      <td>{money(estimatedCost)}</td>
                      <td>{currentApprover(record)}</td>
                      <td>
                        <StatusPill status={approvalLabel(record)} />
                      </td>
                      <td>{approvalProgress(record)}</td>
                      <td>
                        <StatusPill status={approvalPayrollReady(record)} />
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
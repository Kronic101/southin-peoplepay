import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getLeaveDashboard, getPeopleOpsContext } from '@/lib/api';
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

export default async function LeavePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const siteId = params?.siteId || '';

  const [data, context] = await Promise.all([
    getLeaveDashboard(),
    getPeopleOpsContext(siteId),
  ]);

  const employees = context?.employees || [];
  const siteManagers = context?.siteManagers || [];
  const sites = context?.sites || [];
  const dashboard = data as any;
  const records = dashboard?.records || [];

  const summary = dashboard?.summary || {};

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
            <Link className="btn-secondary" href="/hr/leave-approvals">
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
            <strong>{summary.pendingRequests ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Approved This Month</span>
            <strong>{summary.approvedThisMonth ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>On Leave Today</span>
            <strong>{summary.onLeaveToday ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Rejected This Month</span>
            <strong>{summary.rejectedThisMonth ?? 0}</strong>
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
                <Link className="btn-secondary" href="/leave">
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

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Recent Leave Activity</h2>
              <p className="muted">
                Approved leave must be included in payroll period validation before payroll is locked.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Site</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Current Approver</th>
                  <th>Approval</th>
                  <th>Steps</th>
                  <th>Payroll Ready</th>
                  <th>Submitted</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No leave requests found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.id}>
                      <td>{formatName(record)}</td>
                      <td>{record.siteName || record.site || '-'}</td>
                      <td>{record.leaveType || '-'}</td>
                      <td>
                        {formatDate(record.startDate)} - {formatDate(record.endDate)}
                      </td>
                      <td>{record.totalDays ?? record.requestedDays ?? '-'}</td>
                      <td>{currentApprover(record)}</td>
                      <td>
                        <StatusPill status={approvalLabel(record)} />
                      </td>
                      <td>{approvalProgress(record)}</td>
                      <td>
                        <StatusPill status={approvalPayrollReady(record)} />
                      </td>
                      <td>{formatDate(record.createdAt || record.submittedAt)}</td>
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
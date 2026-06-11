'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RequireStaffRole } from '@/components/RequireStaffRole';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatDate(value: any) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function fullName(employee: any) {
  return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function label(value: any) {
  return String(value || '-').replaceAll('_', ' ');
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';

  return 'warning';
}

function isFemale(employee: any) {
  return String(employee?.gender || '').toLowerCase().startsWith('f');
}

export default function HRLeaveDashboardPage() {
  const [supervisorEmail, setSupervisorEmail] = useState('supervisor@southincon.com');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const summary = useMemo(() => {
    const pending = requests.filter((item) => item.status === 'PENDING_SUPERVISOR');
    const approved = requests.filter((item) => item.status === 'APPROVED');
    const rejected = requests.filter((item) => item.status === 'REJECTED');

    const totalDaysApproved = approved.reduce((sum, item) => sum + Number(item.totalDays || 0), 0);

    const employees = new Map<string, any>();

    for (const request of requests) {
      if (request.employee?.id) {
        employees.set(request.employee.id, request.employee);
      }
    }

    return {
      total: requests.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      totalDaysApproved,
      employeeCount: employees.size,
    };
  }, [requests]);

  const leaveBalances = useMemo(() => {
    const employees = new Map<string, any>();

    for (const request of requests) {
      if (request.employee?.id) {
        employees.set(request.employee.id, request.employee);
      }
    }

    return Array.from(employees.values()).map((employee) => {
      const employeeRequests = requests.filter((item) => item.employee?.id === employee.id);
      const approvedDays = employeeRequests
        .filter((item) => item.status === 'APPROVED')
        .reduce((sum, item) => sum + Number(item.totalDays || 0), 0);

      const monthlyLeave = 2;
      const mothersDay = isFemale(employee) ? 1 : 0;
      const monthlyEntitlement = monthlyLeave + mothersDay;
      const annualEstimate = monthlyLeave * 12;
      const remainingAnnualEstimate = Math.max(annualEstimate - approvedDays, 0);

      return {
        employee,
        monthlyLeave,
        mothersDay,
        monthlyEntitlement,
        annualEstimate,
        approvedDays,
        remainingAnnualEstimate,
      };
    });
  }, [requests]);

  async function loadRequests() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/leave/supervisor/requests?email=${encodeURIComponent(supervisorEmail)}`,
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Unable to load leave dashboard.');
      }

      const returnedRequests = result?.requests || result?.items || result?.data || result || [];

      setRequests(Array.isArray(returnedRequests) ? returnedRequests : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load leave dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  return (
    <RequireStaffRole
      allowedRoles={['HR_MANAGER', 'DIRECTOR', 'ADMIN', 'LINE_MANAGER', 'SUPERVISOR']}
      title="HR Leave Dashboard"
      message="Only authorised HR users, supervisors, line managers, directors, and administrators can view leave dashboard records."
    >
      <main className="employee-portal-page">
        <section className="employee-portal-shell">
          <nav className="employee-portal-nav">
            <div>
              <strong>Southin PeoplePay</strong>
              <span>HR Leave Dashboard</span>
            </div>

            <div className="employee-portal-nav-links">
              <Link href="/workbench">Workbench</Link>
              <Link href="/hr/leave-approvals">Approvals</Link>
              <Link href="/demo">Demo</Link>
            </div>
          </nav>

          <section className="employee-hero-card">
            <div>
              <div className="hero-kicker">Human Resources</div>
              <h1>Leave Dashboard & Balances</h1>
              <p>
                Track submitted leave requests, approval status, approved leave days, and simple
                leave balance estimates for the current PeoplePay demo phase.
              </p>
            </div>

            <Link className="btn-secondary" href="/hr/leave-approvals">
              Open Approvals
            </Link>
          </section>

          {error && (
            <div className="notice danger" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <section className="employee-panel" style={{ marginBottom: '1rem' }}>
            <h2>Dashboard Filter</h2>

            <div className="employee-form-grid">
              <label>
                Supervisor Email
                <input
                  type="email"
                  value={supervisorEmail}
                  onChange={(event) => setSupervisorEmail(event.target.value)}
                  placeholder="supervisor@southincon.com"
                />
              </label>

              <div className="form-actions" style={{ alignItems: 'end' }}>
                <button className="btn" type="button" onClick={loadRequests} disabled={loading}>
                  {loading ? 'Loading...' : 'Refresh Dashboard'}
                </button>
              </div>
            </div>
          </section>

          <section className="employee-dashboard-grid">
            <Summary title="Total Requests" label="All requests" value={summary.total} />
            <Summary title="Pending" label="Awaiting review" value={summary.pending} />
            <Summary title="Approved" label="Approved requests" value={summary.approved} />
            <Summary title="Rejected" label="Rejected requests" value={summary.rejected} />
            <Summary title="Approved Days" label="Total approved days" value={summary.totalDaysApproved} />
            <Summary title="Employees" label="Employees with records" value={summary.employeeCount} />
          </section>

          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <h2>Leave Balances</h2>

            {leaveBalances.length === 0 ? (
              <div className="notice">No leave balance records found for this filter.</div>
            ) : (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Monthly Entitlement</th>
                      <th>Annual Estimate</th>
                      <th>Approved Days</th>
                      <th>Estimated Balance</th>
                    </tr>
                  </thead>

                  <tbody>
                    {leaveBalances.map((balance) => (
                      <tr key={balance.employee.id}>
                        <td>
                          <strong>{fullName(balance.employee)}</strong>
                          <br />
                          <span className="muted">{balance.employee.employeeNumber}</span>
                        </td>

                        <td>{balance.employee?.department?.name || '-'}</td>

                        <td>
                          {balance.monthlyLeave} days
                          {balance.mothersDay ? ' + 1 Mother’s Day' : ''}
                        </td>

                        <td>{balance.annualEstimate} days</td>

                        <td>{balance.approvedDays} days</td>

                        <td>
                          <strong>{balance.remainingAnnualEstimate} days</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <h2>Leave Request Register</h2>

            {requests.length === 0 ? (
              <div className="notice">No leave requests found.</div>
            ) : (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Supervisor</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>

                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong>{fullName(request.employee)}</strong>
                          <br />
                          <span className="muted">{request.employee?.employeeNumber}</span>
                        </td>

                        <td>{label(request.leaveType)}</td>

                        <td>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </td>

                        <td>{request.totalDays}</td>

                        <td>
                          {request.supervisorName || '-'}
                          <br />
                          <span className="muted">{request.supervisorEmail || '-'}</span>
                        </td>

                        <td>
                          <span className={`employee-status ${statusClass(request.status)}`}>
                            {label(request.status)}
                          </span>
                        </td>

                        <td>{formatDate(request.submittedAt || request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="notice" style={{ marginTop: '1rem' }}>
            Current balance logic is for MVP/demo use. Full accrual, carry-over, opening balances,
            leave year configuration, and HR manual adjustments will be added in the next leave
            management phase.
          </div>
        </section>
      </main>
    </RequireStaffRole>
  );
}

function Summary({ title, label, value }: { title: string; label: string; value: number }) {
  return (
    <div className="employee-panel">
      <h2>{title}</h2>
      <div className="leave-summary-card">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </div>
  );
}
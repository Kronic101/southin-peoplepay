'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmployeePortalShell } from '@/components/EmployeePortalShell';
import {
  clearEmployeePortalToken,
  employeeAuthHeaders,
  getEmployeePortalToken,
} from '@/lib/employee-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const leaveTypes = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'COMPASSIONATE', label: 'Compassionate Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
  { value: 'OTHER', label: 'Other' },
];

function formatName(employee: any) {
  return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function isFemale(employee: any) {
  return String(employee?.gender || '').toLowerCase().startsWith('f');
}

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

function statusLabel(value: string) {
  return String(value || '').replaceAll('_', ' ');
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';

  return 'warning';
}

function calculateDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  return Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
}

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

export default function EmployeeLeavePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const employeeName = useMemo(() => formatName(employee), [employee]);

  const leaveSummary = useMemo(() => {
    const monthlyLeaveDays = 2;
    const mothersDayDays = isFemale(employee) ? 1 : 0;
    const totalAvailableThisMonth = monthlyLeaveDays + mothersDayDays;

    return {
      monthlyLeaveDays,
      mothersDayDays,
      totalAvailableThisMonth,
      annualEquivalent: monthlyLeaveDays * 12,
    };
  }, [employee]);

  const requestedDays = useMemo(
    () => calculateDays(form.startDate, form.endDate),
    [form.startDate, form.endDate],
  );

  const siteManagerName =
    employee?.siteManager?.managerName ||
    employee?.siteManagerName ||
    employee?.supervisor?.name ||
    '-';

  const siteManagerEmail =
    employee?.siteManager?.managerEmail ||
    employee?.siteManagerEmail ||
    employee?.supervisor?.email ||
    '-';

  async function loadLeavePage() {
    setLoading(true);
    setError('');
    setSuccess('');

    const token = getEmployeePortalToken();

    if (!token) {
      setError('Your employee session was not found. Please login again.');
      setLoading(false);
      return;
    }

    try {
      const [profileResponse, requestsResponse] = await Promise.all([
        fetch(`${API_URL}/auth/employee/me`, {
          method: 'GET',
          headers: employeeAuthHeaders(),
          cache: 'no-store',
        }),
        fetch(`${API_URL}/leave/employee/requests`, {
          method: 'GET',
          headers: employeeAuthHeaders(),
          cache: 'no-store',
        }),
      ]);

      const profileResult = await profileResponse.json().catch(() => null);
      const requestsResult = await requestsResponse.json().catch(() => null);

      if (!profileResponse.ok) {
        clearEmployeePortalToken();
        throw new Error(profileResult?.message || 'Unable to load leave information.');
      }

      setEmployee(profileResult?.employee || profileResult);

      if (requestsResponse.ok) {
        const returnedRequests =
          requestsResult?.requests ||
          requestsResult?.items ||
          requestsResult?.data ||
          requestsResult ||
          [];

        setRequests(Array.isArray(returnedRequests) ? returnedRequests : []);
      } else {
        setRequests([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load leave information.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeavePage();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    if (!form.startDate || !form.endDate) {
      setError('Please select a leave start date and end date.');
      setSaving(false);
      return;
    }

    if (requestedDays <= 0) {
      setError('The leave end date cannot be before the start date.');
      setSaving(false);
      return;
    }

    if (!employee?.siteId && !employee?.site?.id) {
      setError('Your employee profile is not assigned to a site. HR must assign your site before leave can be requested.');
      setSaving(false);
      return;
    }

    if (siteManagerEmail === '-') {
      setError('No site manager is assigned to your site. HR must assign a site manager before leave can be requested.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leave/employee/request`, {
        method: 'POST',
        headers: employeeAuthHeaders(),
        body: JSON.stringify({
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          totalDays: requestedDays,
          reason: form.reason,

          // Sent as a snapshot for audit. Backend must still verify this from the employee/site record.
          siteId: employee?.siteId || employee?.site?.id || null,
          siteName: employee?.site?.name || employee?.siteName || null,
          siteManagerName,
          siteManagerEmail,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Unable to submit leave request.');
      }

      setSuccess('Leave request submitted successfully. It has been routed to your assigned site manager.');

      setForm({
        leaveType: 'ANNUAL',
        startDate: '',
        endDate: '',
        reason: '',
      });

      await loadLeavePage();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit leave request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <EmployeePortalShell>
      <section className="employee-hero-card">
        <div>
          <div className="hero-kicker">Leave</div>
          <h1>Leave Request Centre</h1>
          <p>
            Submit leave requests, view your entitlement, and track approval status through your
            assigned site manager.
          </p>
        </div>

        <Link className="btn-secondary" href="/me">
          Back to Portal
        </Link>
      </section>

      {loading && <div className="notice">Loading leave information...</div>}

      {error && (
        <div className="notice danger" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="notice success" style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {!loading && employee && (
        <>
          <section className="employee-dashboard-grid">
            <div className="employee-panel">
              <h2>Employee</h2>

              <div className="mini-detail-grid">
                <Detail label="Employee No." value={employee.employeeNumber} />
                <Detail label="Employee Name" value={employeeName} />
                <Detail label="Department" value={displayValue(employee?.department)} />
                <Detail label="Site" value={displayValue(employee?.site || employee?.siteName)} />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Responsible Manager</h2>

              <div className="mini-detail-grid">
                <Detail label="Manager" value={siteManagerName} />
                <Detail label="Email" value={siteManagerEmail} />
              </div>

              <p className="employee-muted">
                The manager is selected automatically from your assigned site. Employees should not
                manually type approver emails.
              </p>
            </div>

            <div className="employee-panel">
              <h2>Monthly Entitlement</h2>

              <div className="leave-summary-card">
                <div>
                  <span>Standard Leave</span>
                  <strong>{leaveSummary.monthlyLeaveDays} days</strong>
                </div>

                <div>
                  <span>Mother’s Day</span>
                  <strong>{leaveSummary.mothersDayDays} day</strong>
                </div>

                <div>
                  <span>Total Available</span>
                  <strong>{leaveSummary.totalAvailableThisMonth} days</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <h2>Submit Leave Request</h2>

            <form className="employee-form-grid" onSubmit={handleSubmit}>
              <label>
                Leave Type
                <select
                  value={form.leaveType}
                  onChange={(event) => setForm({ ...form, leaveType: event.target.value })}
                >
                  {leaveTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Start Date
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                  required
                />
              </label>

              <label>
                End Date
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => setForm({ ...form, endDate: event.target.value })}
                  required
                />
              </label>

              <label>
                Requested Days
                <input value={requestedDays ? `${requestedDays} day(s)` : '-'} readOnly />
              </label>

              <label>
                Site
                <input value={displayValue(employee?.site || employee?.siteName)} readOnly />
              </label>

              <label>
                Routed To
                <input value={`${siteManagerName} <${siteManagerEmail}>`} readOnly />
              </label>

              <label className="span-2">
                Reason / Comments
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  placeholder="Briefly explain the reason for your leave request"
                  rows={4}
                />
              </label>

              <div className="span-2 form-actions">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </section>

          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <h2>Leave Request History</h2>

            {requests.length === 0 ? (
              <div className="notice">No leave requests have been submitted yet.</div>
            ) : (
              <div className="employee-table-wrap">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Manager</th>
                      <th>Status</th>
                      <th>Submitted</th>
                    </tr>
                  </thead>

                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id}>
                        <td>{statusLabel(request.leaveType)}</td>
                        <td>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </td>
                        <td>{request.totalDays || request.days || '-'}</td>
                        <td>
                          <strong>{request.siteManagerName || request.supervisorName || '-'}</strong>
                          <br />
                          <span className="muted">
                            {request.siteManagerEmail || request.supervisorEmail || '-'}
                          </span>
                        </td>
                        <td>
                          <span className={`employee-status ${statusClass(request.status)}`}>
                            {statusLabel(request.status)}
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
        </>
      )}
    </EmployeePortalShell>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}
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

function money(value: unknown) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function formatName(employee: any) {
  const first = employee?.firstName || '';
  const middle = employee?.middleName || '';
  const last = employee?.lastName || '';

  return `${first} ${middle} ${last}`.replace(/\s+/g, ' ').trim() || 'Employee';
}

function isFemale(employee: any) {
  return String(employee?.gender || '').toLowerCase().startsWith('f');
}

function getAllowedModules(employee: any): string[] {
  const modules = employee?.portalAccount?.allowedModules;

  return Array.isArray(modules) ? modules : [];
}

function canAccess(employee: any, moduleName: string) {
  const modules = getAllowedModules(employee);

  if (modules.length === 0) {
    return true;
  }

  return modules.includes(moduleName);
}

function displayValue(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.name || value.title || value.label || value.code || fallback;
  return fallback;
}

export default function EmployeePortalHomePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [timeSummary, setTimeSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = useMemo(() => formatName(employee), [employee]);

  const leaveSummary = useMemo(() => {
    const standardLeaveDays = 2;
    const mothersDay = isFemale(employee) ? 1 : 0;

    return {
      standardLeaveDays,
      mothersDay,
      totalAvailable: standardLeaveDays + mothersDay,
    };
  }, [employee]);

  const latestPayslip = payslips?.[0] || null;

  useEffect(() => {
    async function loadPortal() {
      setLoading(true);
      setError('');

      const token = getEmployeePortalToken();

      if (!token) {
        setError('Your employee session has expired. Please login again.');
        setLoading(false);
        return;
      }

      try {
        const [profileResponse, payslipResponse, timeResponse] = await Promise.all([
          fetch(`${API_URL}/auth/employee/me`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
          fetch(`${API_URL}/auth/employee/payslips`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
          fetch(`${API_URL}/auth/employee/time-summary`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
            cache: 'no-store',
          }),
        ]);

        const profileResult = await profileResponse.json().catch(() => null);
        const payslipResult = await payslipResponse.json().catch(() => null);
        const timeResult = await timeResponse.json().catch(() => null);

        if (!profileResponse.ok) {
          clearEmployeePortalToken();
          throw new Error(
            profileResult?.message ||
              profileResult?.error ||
              'Unable to load employee profile. Please login again.',
          );
        }

        const profile = profileResult?.employee || profileResult;
        setEmployee(profile);

        if (payslipResponse.ok) {
          const returnedPayslips =
            payslipResult?.payslips ||
            payslipResult?.items ||
            payslipResult?.data ||
            payslipResult ||
            [];

          setPayslips(Array.isArray(returnedPayslips) ? returnedPayslips : []);
        } else {
          setPayslips([]);
        }

        if (timeResponse.ok) {
          setTimeSummary(timeResult?.summary || timeResult || null);
        } else {
          setTimeSummary(null);
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to load employee portal.');
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, []);

  if (loading) {
    return (
      <EmployeePortalShell>
        <div className="notice">Loading employee portal...</div>
      </EmployeePortalShell>
    );
  }

  if (error) {
    return (
      <EmployeePortalShell>
        <div className="notice danger">
          {error}

          <div style={{ marginTop: 12 }}>
            <Link className="btn-secondary" href="/employee-login">
              Return to Employee Login
            </Link>
          </div>
        </div>
      </EmployeePortalShell>
    );
  }

  return (
    <EmployeePortalShell>
      <section className="employee-hero-card">
        <div>
          <div className="hero-kicker">Employee Portal</div>
          <h1>Welcome back, {employeeName}</h1>
          <p>
            View your profile, site assignment, leave, time records, payslips, and statutory
            information from one self-service centre.
          </p>
        </div>

        <div className="employee-avatar-card">
          <div className="employee-avatar">{employeeName.charAt(0).toUpperCase()}</div>
          <strong>{employeeName}</strong>
          <span>{employee?.employeeNumber || '-'}</span>
        </div>
      </section>

      <section className="employee-dashboard-grid">
        <div className="employee-panel">
          <h2>Profile Summary</h2>

          <div className="mini-detail-grid">
            <div>
              <span>Employee No.</span>
              <strong>{employee?.employeeNumber || '-'}</strong>
            </div>

            <div>
              <span>Status</span>
              <strong>{employee?.status || '-'}</strong>
            </div>

            <div>
              <span>Department</span>
              <strong>{displayValue(employee?.department)}</strong>
            </div>

            <div>
              <span>Job Title</span>
              <strong>{displayValue(employee?.jobTitle)}</strong>
            </div>

            <div>
              <span>Site</span>
              <strong>{displayValue(employee?.site || employee?.siteName)}</strong>
            </div>

            <div>
              <span>Employment Type</span>
              <strong>{displayValue(employee?.employmentType)}</strong>
            </div>
          </div>
        </div>

        <div className="employee-panel">
          <h2>Site Manager</h2>

          <div className="mini-detail-grid">
            <div>
              <span>Manager</span>
              <strong>
                {employee?.siteManager?.managerName ||
                  employee?.siteManagerName ||
                  employee?.supervisor?.name ||
                  '-'}
              </strong>
            </div>

            <div>
              <span>Email</span>
              <strong>
                {employee?.siteManager?.managerEmail ||
                  employee?.siteManagerEmail ||
                  employee?.supervisor?.email ||
                  '-'}
              </strong>
            </div>
          </div>

          <p className="employee-muted">
            Leave, overtime, and timesheet records should route through the responsible manager for
            your assigned site.
          </p>
        </div>

        <div className="employee-panel">
          <h2>Leave Summary</h2>

          <div className="leave-summary-card">
            <div>
              <span>Monthly Leave</span>
              <strong>{leaveSummary.standardLeaveDays} days</strong>
            </div>

            <div>
              <span>Mother’s Day</span>
              <strong>{leaveSummary.mothersDay} day</strong>
            </div>

            <div>
              <span>Total Available</span>
              <strong>{leaveSummary.totalAvailable} days</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="employee-tile-grid" style={{ marginTop: '1rem' }}>
        {canAccess(employee, 'EMPLOYEE_PROFILE') && (
          <Link className="employee-tile" href="/me/details">
            <span className="tile-icon">👤</span>
            <div>
              <h3>My Details</h3>
              <p>View your employee profile, department, job title, site, and contact information.</p>
              <strong>Open details →</strong>
            </div>
          </Link>
        )}

        {canAccess(employee, 'EMPLOYEE_REQUESTS') && (
          <Link className="employee-tile" href="/me/leave">
            <span className="tile-icon">🌿</span>
            <div>
              <h3>Leave Requests</h3>
              <p>Submit leave and track approval status from your assigned site manager.</p>
              <strong>Request leave →</strong>
            </div>
          </Link>
        )}

        {canAccess(employee, 'EMPLOYEE_REQUESTS') && (
          <Link className="employee-tile" href="/me/time">
            <span className="tile-icon">⏱️</span>
            <div>
              <h3>My Time</h3>
              <p>View attendance, timesheets, overtime, and payroll-impacting time records.</p>
              <strong>Open time centre →</strong>
            </div>
          </Link>
        )}

        {canAccess(employee, 'EMPLOYEE_PAYSLIPS') && (
          <Link className="employee-tile" href="/me/payslips">
            <span className="tile-icon">💳</span>
            <div>
              <h3>Payslips</h3>
              <p>
                {payslips.length > 0
                  ? `${payslips.length} generated payslip(s) available.`
                  : 'No generated payslips are available yet.'}
              </p>
              <strong>View payslips →</strong>
            </div>
          </Link>
        )}

        <Link className="employee-tile" href="/me/statutory-certificates">
          <span className="tile-icon">📄</span>
          <div>
            <h3>Statutory Certificates</h3>
            <p>View PAYE, NAPSA, NHIMA, and other statutory certificate records when published.</p>
            <strong>Open centre →</strong>
          </div>
        </Link>
      </section>

      <section className="employee-dashboard-grid" style={{ marginTop: '1rem' }}>
        <div className="employee-panel">
          <h2>Time Snapshot</h2>

          <div className="mini-detail-grid">
            <div>
              <span>Attendance Records</span>
              <strong>{timeSummary?.attendanceCount ?? 0}</strong>
            </div>

            <div>
              <span>Approved Hours</span>
              <strong>{timeSummary?.approvedHours ?? 0}</strong>
            </div>

            <div>
              <span>Overtime Hours</span>
              <strong>{timeSummary?.approvedOvertimeHours ?? 0}</strong>
            </div>

            <div>
              <span>Pending Items</span>
              <strong>{timeSummary?.pendingItems ?? 0}</strong>
            </div>
          </div>
        </div>

        <div className="employee-panel">
          <h2>Latest Payslip</h2>

          {latestPayslip ? (
            <div className="latest-payslip-card">
              <div>
                <span>Pay Period</span>
                <strong>
                  {latestPayslip?.payrollPeriod?.periodName ||
                    latestPayslip?.periodName ||
                    'Payslip'}
                </strong>
              </div>

              <div>
                <span>Net Pay</span>
                <strong>{money(latestPayslip?.netPay)}</strong>
              </div>

              <Link className="btn" href={`/me/payslips/${latestPayslip.id}`}>
                View Payslip
              </Link>
            </div>
          ) : (
            <p className="muted">No payslip has been generated yet.</p>
          )}
        </div>

        <div className="employee-panel">
          <h2>Portal Access</h2>

          <div className="mini-detail-grid">
            <div>
              <span>Access Profile</span>
              <strong>{employee?.portalAccount?.accessProfile || 'EMPLOYEE'}</strong>
            </div>

            <div>
              <span>Allowed Modules</span>
              <strong>{getAllowedModules(employee).length || 'Default'}</strong>
            </div>
          </div>
        </div>
      </section>
    </EmployeePortalShell>
  );
}
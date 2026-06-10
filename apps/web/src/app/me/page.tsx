'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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

export default function EmployeePortalHomePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
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
        const [profileResponse, payslipResponse] = await Promise.all([
          fetch(`${API_URL}/auth/employee/me`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
          }),
          fetch(`${API_URL}/auth/employee/payslips`, {
            method: 'GET',
            headers: employeeAuthHeaders(),
          }),
        ]);

        const profileResult = await profileResponse.json().catch(() => null);
        const payslipResult = await payslipResponse.json().catch(() => null);

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
      } catch (err: any) {
        setError(err?.message || 'Unable to load employee portal.');
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, []);

  function handleLogout() {
    clearEmployeePortalToken();
    window.location.href = '/employee-login';
  }

  if (loading) {
    return (
      <main className="employee-portal-page">
        <section className="employee-portal-shell">
          <EmployeePortalNav onLogout={handleLogout} />
          <div className="notice">Loading employee portal...</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="employee-portal-page">
        <section className="employee-portal-shell">
          <EmployeePortalNav onLogout={handleLogout} />

          <div className="notice danger">
            {error}
            <div style={{ marginTop: 12 }}>
              <Link className="btn-secondary" href="/employee-login">
                Return to Employee Login
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <EmployeePortalNav onLogout={handleLogout} />

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Employee Portal</div>
            <h1>Welcome back, {employeeName}</h1>
            <p>
              View your personal details, leave entitlement, payslips, and employee documents from
              one self-service centre.
            </p>
          </div>

          <div className="employee-avatar-card">
            <div className="employee-avatar">{employeeName.charAt(0).toUpperCase()}</div>
            <strong>{employeeName}</strong>
            <span>{employee?.employeeNumber || '-'}</span>
          </div>
        </section>

        <section className="employee-tile-grid">
          <Link className="employee-tile" href="/me/details">
            <span className="tile-icon">👤</span>
            <div>
              <h3>My Details</h3>
              <p>View your employee profile, department, job title, and contact information.</p>
              <strong>Open details →</strong>
            </div>
          </Link>

          <Link className="employee-tile" href="/me/leave">
            <span className="tile-icon">🌿</span>
            <div>
              <h3>Leave</h3>
              <p>
                Monthly entitlement: {leaveSummary.standardLeaveDays} days
                {leaveSummary.mothersDay ? ' + 1 Mother’s Day' : ''}.
              </p>
              <strong>{leaveSummary.totalAvailable} available day(s)</strong>
            </div>
          </Link>

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

          <Link className="employee-tile" href="/me/statutory-certificates">
            <span className="tile-icon">📄</span>

            <div>
              <h3>Statutory Certificates</h3>
              <p>
                View PAYE, NAPSA, NHIMA, and other statutory certificate records when published.
              </p>
              <strong>Open centre →</strong>
            </div>
          </Link>
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
                <span>Department</span>
                <strong>{employee?.department?.name || employee?.department || '-'}</strong>
              </div>

              <div>
                <span>Job Title</span>
                <strong>{employee?.jobTitle?.name || employee?.jobTitle || '-'}</strong>
              </div>

              <div>
                <span>Site</span>
                <strong>{employee?.site?.name || employee?.site || '-'}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Leave Summary</h2>

            <div className="leave-summary-card">
              <div>
                <span>Monthly leave</span>
                <strong>{leaveSummary.standardLeaveDays} days</strong>
              </div>

              <div>
                <span>Mother’s Day</span>
                <strong>{leaveSummary.mothersDay} day</strong>
              </div>

              <div>
                <span>Total available</span>
                <strong>{leaveSummary.totalAvailable} days</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Latest Payslip</h2>

            {latestPayslip ? (
              <div className="latest-payslip-card">
                <div>
                  <span>Pay period</span>
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
        </section>
      </section>
    </main>
  );
}

function EmployeePortalNav({ onLogout }: { onLogout: () => void }) {
  return (
    <nav className="employee-portal-nav">
      <div>
        <strong>Southin PeoplePay</strong>
        <span>Employee Self-Service</span>
      </div>

      <div className="employee-portal-nav-links">
        <Link href="/me">Home</Link>
        <Link href="/me/payslips">Payslips</Link>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
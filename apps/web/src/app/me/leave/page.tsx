'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  clearEmployeePortalToken,
  employeeAuthHeaders,
  getEmployeePortalToken,
} from '@/lib/employee-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatName(employee: any) {
  return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function isFemale(employee: any) {
  return String(employee?.gender || '').toLowerCase().startsWith('f');
}

export default function EmployeeLeavePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    async function loadLeavePage() {
      setLoading(true);
      setError('');

      const token = getEmployeePortalToken();

      if (!token) {
        setError('Your employee session was not found. Please login again.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/employee/me`, {
          method: 'GET',
          headers: employeeAuthHeaders(),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          clearEmployeePortalToken();
          throw new Error(result?.message || 'Unable to load leave information.');
        }

        setEmployee(result?.employee || result);
      } catch (err: any) {
        setError(err?.message || 'Unable to load leave information.');
      } finally {
        setLoading(false);
      }
    }

    loadLeavePage();
  }, []);

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <EmployeePortalNav />

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Leave</div>
            <h1>Leave Entitlement</h1>
            <p>
              View your monthly leave entitlement and employee leave allowances. Leave request
              submission will be added in the next workflow phase.
            </p>
          </div>

          <Link className="btn-secondary" href="/me">
            Back to Portal
          </Link>
        </section>

        {loading && <div className="notice">Loading leave information...</div>}

        {error && (
          <div className="notice danger">
            {error}

            <div style={{ marginTop: 12 }}>
              <Link className="btn-secondary" href="/employee-login">
                Return to Employee Login
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && employee && (
          <>
            <section className="employee-dashboard-grid">
              <div className="employee-panel">
                <h2>Employee</h2>

                <div className="mini-detail-grid">
                  <Detail label="Employee No." value={employee.employeeNumber} />
                  <Detail label="Employee Name" value={employeeName} />
                  <Detail label="Department" value={employee?.department?.name || employee?.department} />
                  <Detail label="Site" value={employee?.site?.name || employee?.site} />
                </div>
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

              <div className="employee-panel">
                <h2>Annual View</h2>

                <div className="leave-summary-card">
                  <div>
                    <span>Annual Leave Estimate</span>
                    <strong>{leaveSummary.annualEquivalent} days</strong>
                  </div>

                  <div>
                    <span>Current Month Status</span>
                    <strong>Available</strong>
                  </div>

                  <div>
                    <span>Leave Workflow</span>
                    <strong>Coming Soon</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="employee-panel" style={{ marginTop: '1rem' }}>
              <h2>Leave Request Workflow</h2>

              <div className="employee-tile-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="employee-tile">
                  <span className="tile-icon">📝</span>
                  <div>
                    <h3>Request Leave</h3>
                    <p>
                      Employees will be able to submit annual leave requests directly from this
                      portal.
                    </p>
                    <strong>Planned</strong>
                  </div>
                </div>

                <div className="employee-tile">
                  <span className="tile-icon">✅</span>
                  <div>
                    <h3>Manager Approval</h3>
                    <p>
                      Leave requests will route to the employee’s line manager or HR for review.
                    </p>
                    <strong>Workflow phase</strong>
                  </div>
                </div>

                <div className="employee-tile">
                  <span className="tile-icon">📅</span>
                  <div>
                    <h3>Leave Calendar</h3>
                    <p>
                      Approved leave days will later appear in a calendar view for HR visibility.
                    </p>
                    <strong>Coming soon</strong>
                  </div>
                </div>
              </div>

              <div className="notice" style={{ marginTop: '1rem' }}>
                Current rule configured for this MVP: employees receive 2 leave days per month.
                Female employees also receive 1 Mother’s Day allowance for the month. Full leave
                balances, accrual rules, carry-over, and approvals will be implemented in the leave
                workflow phase.
              </div>
            </section>
          </>
        )}
      </section>
    </main>
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

function EmployeePortalNav() {
  function logout() {
    clearEmployeePortalToken();
    window.location.href = '/employee-login';
  }

  return (
    <nav className="employee-portal-nav">
      <div>
        <strong>Southin PeoplePay</strong>
        <span>Employee Self-Service</span>
      </div>

      <div className="employee-portal-nav-links">
        <Link href="/me">Home</Link>
        <Link href="/me/payslips">Payslips</Link>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
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

function valueOrDash(value: any) {
  return value || '-';
}

export default function EmployeeDetailsPage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = useMemo(() => formatName(employee), [employee]);

  useEffect(() => {
    async function loadDetails() {
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
          throw new Error(result?.message || 'Unable to load employee details.');
        }

        setEmployee(result?.employee || result);
      } catch (err: any) {
        setError(err?.message || 'Unable to load employee details.');
      } finally {
        setLoading(false);
      }
    }

    loadDetails();
  }, []);

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <EmployeePortalNav />

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">My Details</div>
            <h1>Employee Profile</h1>
            <p>
              View your employee information as currently captured in Southin PeoplePay. Contact HR
              if any details need to be updated.
            </p>
          </div>

          <Link className="btn-secondary" href="/me">
            Back to Portal
          </Link>
        </section>

        {loading && <div className="notice">Loading employee details...</div>}

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
          <section className="employee-dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="employee-panel">
              <h2>Personal Information</h2>

              <div className="mini-detail-grid">
                <Detail label="Employee Number" value={employee.employeeNumber} />
                <Detail label="Full Name" value={employeeName} />
                <Detail label="Gender" value={employee.gender} />
                <Detail label="Status" value={employee.status} />
                <Detail label="Phone" value={employee.phone} />
                <Detail label="Email" value={employee.email} />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Employment Information</h2>

              <div className="mini-detail-grid">
                <Detail label="Department" value={employee?.department?.name || employee?.department} />
                <Detail label="Job Title" value={employee?.jobTitle?.name || employee?.jobTitle} />
                <Detail label="Site" value={employee?.site?.name || employee?.site} />
                <Detail
                  label="Employment Type"
                  value={employee?.employmentType?.name || employee?.employmentType}
                />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Statutory Details</h2>

              <div className="mini-detail-grid">
                <Detail label="TPIN" value={employee?.statutoryDetails?.tpin} />
                <Detail label="NAPSA Number" value={employee?.statutoryDetails?.napsaNumber} />
                <Detail label="NHIMA Number" value={employee?.statutoryDetails?.nhimaNumber} />
                <Detail
                  label="PAYE Applicable"
                  value={employee?.statutoryDetails?.payeApplicable ? 'Yes' : 'No'}
                />
              </div>
            </div>

            <div className="employee-panel">
              <h2>Banking Details</h2>

              <div className="mini-detail-grid">
                <Detail label="Bank Status" value={employee.bankDetailsStatus} />
                <Detail label="Bank Name" value={employee.bankName} />
                <Detail label="Branch" value={employee.bankBranch} />
                <Detail label="Account Number" value={employee.bankAccountNumberMasked} />
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{valueOrDash(value)}</strong>
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
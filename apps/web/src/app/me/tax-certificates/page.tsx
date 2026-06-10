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

export default function EmployeeTaxCertificatesPage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = useMemo(() => formatName(employee), [employee]);

  useEffect(() => {
    async function loadTaxCertificates() {
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
          throw new Error(result?.message || 'Unable to load tax certificate information.');
        }

        setEmployee(result?.employee || result);
      } catch (err: any) {
        setError(err?.message || 'Unable to load tax certificate information.');
      } finally {
        setLoading(false);
      }
    }

    loadTaxCertificates();
  }, []);

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <EmployeePortalNav />

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Tax Certificates</div>
            <h1>PAYE & Statutory Certificates</h1>
            <p>
              View annual tax certificate information. Downloadable PAYE and statutory certificates
              will be published here after payroll year-end processing.
            </p>
          </div>

          <Link className="btn-secondary" href="/me">
            Back to Portal
          </Link>
        </section>

        {loading && <div className="notice">Loading tax certificate information...</div>}

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
                <h2>Employee Tax Profile</h2>

                <div className="mini-detail-grid">
                  <Detail label="Employee No." value={employee.employeeNumber} />
                  <Detail label="Employee Name" value={employeeName} />
                  <Detail label="TPIN" value={employee?.statutoryDetails?.tpin} />
                  <Detail
                    label="PAYE Applicable"
                    value={employee?.statutoryDetails?.payeApplicable ? 'Yes' : 'No'}
                  />
                </div>
              </div>

              <div className="employee-panel">
                <h2>Statutory References</h2>

                <div className="mini-detail-grid">
                  <Detail label="NAPSA Number" value={employee?.statutoryDetails?.napsaNumber} />
                  <Detail label="NHIMA Number" value={employee?.statutoryDetails?.nhimaNumber} />
                  <Detail
                    label="NAPSA Applicable"
                    value={employee?.statutoryDetails?.napsaApplicable ? 'Yes' : 'No'}
                  />
                  <Detail
                    label="NHIMA Applicable"
                    value={employee?.statutoryDetails?.nhimaApplicable ? 'Yes' : 'No'}
                  />
                </div>
              </div>

              <div className="employee-panel">
                <h2>Certificate Status</h2>

                <div className="leave-summary-card">
                  <div>
                    <span>Current Tax Year</span>
                    <strong>2026</strong>
                  </div>

                  <div>
                    <span>PAYE Certificate</span>
                    <strong>Coming Soon</strong>
                  </div>

                  <div>
                    <span>Download Status</span>
                    <strong>Not Published</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="employee-panel" style={{ marginTop: '1rem' }}>
              <h2>Available Certificates</h2>

              <div className="employee-tile-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="employee-tile">
                  <span className="tile-icon">📄</span>
                  <div>
                    <h3>PAYE Annual Certificate</h3>
                    <p>
                      Annual PAYE tax certificate will be generated after payroll year-end close.
                    </p>
                    <strong>Pending publication</strong>
                  </div>
                </div>

                <div className="employee-tile">
                  <span className="tile-icon">🏛️</span>
                  <div>
                    <h3>NAPSA Statement</h3>
                    <p>
                      NAPSA contribution references will be shown here when statutory reporting is
                      connected.
                    </p>
                    <strong>Coming soon</strong>
                  </div>
                </div>

                <div className="employee-tile">
                  <span className="tile-icon">🩺</span>
                  <div>
                    <h3>NHIMA Statement</h3>
                    <p>
                      NHIMA contribution references will be shown here when statutory reporting is
                      connected.
                    </p>
                    <strong>Coming soon</strong>
                  </div>
                </div>
              </div>

              <div className="notice" style={{ marginTop: '1rem' }}>
                This page is currently prepared as a certificate centre. In the next payroll
                reporting phase, HR/Payroll will publish downloadable annual certificates here for
                employee access.
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
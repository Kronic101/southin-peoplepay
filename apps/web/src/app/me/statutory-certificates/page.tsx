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

function yesNo(value: any) {
  return value ? 'Yes' : 'No';
}

export default function EmployeeStatutoryCertificatesPage() {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const employeeName = useMemo(() => formatName(employee), [employee]);
  const statutory = employee?.statutoryDetails || null;

  const payeApplicable = Boolean(statutory?.payeApplicable);
  const napsaApplicable = Boolean(statutory?.napsaApplicable);
  const nhimaApplicable = Boolean(statutory?.nhimaApplicable);

  useEffect(() => {
    async function loadStatutoryCertificates() {
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
          throw new Error(result?.message || 'Unable to load statutory certificate information.');
        }

        setEmployee(result?.employee || result);
      } catch (err: any) {
        setError(err?.message || 'Unable to load statutory certificate information.');
      } finally {
        setLoading(false);
      }
    }

    loadStatutoryCertificates();
  }, []);

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <EmployeePortalNav />

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Statutory Certificates</div>
            <h1>Statutory Records Centre</h1>
            <p>
              View PAYE, NAPSA, NHIMA, and other statutory records linked to your employee profile.
              Where a statutory item is not applicable or not yet published, the status will be
              clearly shown.
            </p>
          </div>

          <Link className="btn-secondary" href="/me">
            Back to Portal
          </Link>
        </section>

        {loading && <div className="notice">Loading statutory certificate information...</div>}

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
                <h2>Employee Statutory Profile</h2>

                <div className="mini-detail-grid">
                  <Detail label="Employee No." value={employee.employeeNumber} />
                  <Detail label="Employee Name" value={employeeName} />
                  <Detail label="Department" value={employee?.department?.name || employee?.department} />
                  <Detail label="Status" value={employee.status} />
                </div>
              </div>

              <div className="employee-panel">
                <h2>Registration Numbers</h2>

                <div className="mini-detail-grid">
                  <Detail label="TPIN" value={statutory?.tpin} />
                  <Detail label="NAPSA Number" value={statutory?.napsaNumber} />
                  <Detail label="NHIMA Number" value={statutory?.nhimaNumber} />
                  <Detail label="Statutory Data" value={statutory ? 'Captured' : 'Not captured'} />
                </div>
              </div>

              <div className="employee-panel">
                <h2>Applicability Status</h2>

                <div className="leave-summary-card">
                  <div>
                    <span>PAYE Applicable</span>
                    <strong>{yesNo(payeApplicable)}</strong>
                  </div>

                  <div>
                    <span>NAPSA Applicable</span>
                    <strong>{yesNo(napsaApplicable)}</strong>
                  </div>

                  <div>
                    <span>NHIMA Applicable</span>
                    <strong>{yesNo(nhimaApplicable)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="employee-panel" style={{ marginTop: '1rem' }}>
              <h2>Certificate Availability</h2>

              <div className="employee-tile-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <CertificateTile
                  icon="📄"
                  title="PAYE Certificate"
                  applicable={payeApplicable}
                  reference={statutory?.tpin}
                  unavailableText="PAYE is not currently applicable to this employee or no PAYE certificate has been published."
                />

                <CertificateTile
                  icon="🏛️"
                  title="NAPSA Certificate"
                  applicable={napsaApplicable}
                  reference={statutory?.napsaNumber}
                  unavailableText="NAPSA certificate data has not yet been published for download."
                />

                <CertificateTile
                  icon="🩺"
                  title="NHIMA Certificate"
                  applicable={nhimaApplicable}
                  reference={statutory?.nhimaNumber}
                  unavailableText="NHIMA certificate data has not yet been published for download."
                />
              </div>

              <div className="notice" style={{ marginTop: '1rem' }}>
                This page is prepared as the employee statutory certificate centre. During the next
                reporting phase, HR/Payroll will be able to publish downloadable PAYE, NAPSA, NHIMA,
                and other statutory documents here. If no document is available, the employee will
                still see whether the item is applicable and whether reference data exists.
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

function CertificateTile({
  icon,
  title,
  applicable,
  reference,
  unavailableText,
}: {
  icon: string;
  title: string;
  applicable: boolean;
  reference?: string | null;
  unavailableText: string;
}) {
  const hasReference = Boolean(reference);

  return (
    <div className="employee-tile">
      <span className="tile-icon">{icon}</span>

      <div>
        <h3>{title}</h3>

        {applicable ? (
          <p>
            Applicable to this employee
            {hasReference ? ` under reference ${reference}.` : ', but no reference number is captured yet.'}
          </p>
        ) : (
          <p>{unavailableText}</p>
        )}

        <strong>{applicable && hasReference ? 'Ready for future certificate' : 'No document available'}</strong>
      </div>
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
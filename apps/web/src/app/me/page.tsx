'use client';

import { useEffect, useState } from 'react';
import { getEmployeeMe } from '@/lib/api';

export default function EmployeeMePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [error, setError] = useState('');

  function handleLogout() {
    localStorage.removeItem('peoplepay_employee_token');
    localStorage.removeItem('peoplepay_employee_number');
    window.location.href = '/employee-login';
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = localStorage.getItem('peoplepay_employee_token');

        if (!token) {
          setError('You are not signed in.');
          return;
        }

        const profile = await getEmployeeMe(token);
        setEmployee(profile);
      } catch {
        setError('Failed to load employee profile.');
      }
    }

    loadProfile();
  }, []);

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Employee Portal</h1>
          <div className="notice">{error}</div>
          <a className="btn" href="/employee-login">
            Back to Login
          </a>
        </section>
      </main>
    );
  }

  if (!employee) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Employee Portal</h1>
          <p className="muted">Loading profile...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-card">
        <div className="page-header">
          <div>
            <h1>Welcome, {employee.firstName}</h1>
            <p className="muted">
              {employee.employeeNumber} · {employee.status}
            </p>
          </div>

          <button className="btn-secondary" onClick={handleLogout} type="button">
            Logout
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">PAYE</span>
            <strong>{employee.statutoryDetails?.payeApplicable ? 'Applicable' : 'Not applicable'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">NAPSA</span>
            <strong>{employee.statutoryDetails?.napsaApplicable ? 'Applicable' : 'Not applicable'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">NHIMA</span>
            <strong>{employee.statutoryDetails?.nhimaApplicable ? 'Applicable' : 'Not applicable'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Payslips</span>
            <strong>{employee.payslipCount}</strong>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <th>Name</th>
                <td>
                  {employee.firstName} {employee.lastName}
                </td>
              </tr>
              <tr>
                <th>Phone</th>
                <td>{employee.phone || '-'}</td>
              </tr>
              <tr>
                <th>Email</th>
                <td>{employee.email || '-'}</td>
              </tr>
              <tr>
                <th>Portal Status</th>
                <td>{employee.portalAccount?.isActive ? 'Active' : 'Inactive'}</td>
              </tr>
              <tr>
                <th>PIN Change Required</th>
                <td>{employee.portalAccount?.mustChangePin ? 'Yes' : 'No'}</td>
              </tr>
              <tr>
                <th>Last Login</th>
                <td>{employee.portalAccount?.lastLoginAt || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="notice">
          Payslip download and leave requests will be added in the next employee self-service phase.
        </div>
      </section>
    </main>
  );
}
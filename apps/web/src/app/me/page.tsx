'use client';

import { useEffect, useState } from 'react';
import { getEmployeeMe } from '@/lib/api';

export default function EmployeeMePage() {
  const [employee, setEmployee] = useState<any>(null);
  const [error, setError] = useState('');

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
    <main className="auth-page">
      <section className="auth-card">
        <h1>Welcome, {employee.firstName}</h1>
        <p className="muted">
          {employee.employeeNumber} · {employee.status}
        </p>

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
                <th>PAYE</th>
                <td>{employee.statutoryDetails?.payeApplicable ? 'Applicable' : 'Not applicable'}</td>
              </tr>
              <tr>
                <th>NAPSA</th>
                <td>{employee.statutoryDetails?.napsaApplicable ? 'Applicable' : 'Not applicable'}</td>
              </tr>
              <tr>
                <th>NHIMA</th>
                <td>{employee.statutoryDetails?.nhimaApplicable ? 'Applicable' : 'Not applicable'}</td>
              </tr>
              <tr>
                <th>Payslips</th>
                <td>{employee.payslipCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
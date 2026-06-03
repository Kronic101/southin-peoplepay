'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getEmployeePayslips } from '@/lib/api';

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function getStoredEmployeeToken() {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('employeeToken') ||
    localStorage.getItem('peoplepay_employee_token') ||
    localStorage.getItem('southinEmployeeToken') ||
    localStorage.getItem('southin_peoplepay_employee_token') ||
    localStorage.getItem('token')
  );
}

export default function EmployeePayslipsPage() {
  const router = useRouter();

  const [payslips, setPayslips] = useState<any[]>([]);
  const [message, setMessage] = useState('Loading payslips...');

  useEffect(() => {
    async function loadPayslips() {
      const token = getStoredEmployeeToken();

      if (!token) {
        setMessage('You are not logged in. Please login again.');
        return;
      }

      try {
        localStorage.setItem('employeeToken', token);
        localStorage.setItem('peoplepay_employee_token', token);

        const data = await getEmployeePayslips(token);
        setPayslips(data);
        setMessage('');
      } catch {
        setMessage('Failed to load payslips. Please login again.');
      }
    }

    loadPayslips();
  }, []);

  function handleBackToPortal() {
    const token = getStoredEmployeeToken();

    if (!token) {
      router.push('/employee-login');
      return;
    }

    router.push('/me');
  }

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>My Payslips</h1>
          <p className="muted">
            View generated payslips after payroll has been approved and locked.
          </p>
        </div>

        <button className="btn-secondary" onClick={handleBackToPortal} type="button">
          Back to Portal
        </button>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payroll Period</th>
              <th>Pay Date</th>
              <th>Gross Pay</th>
              <th>Deductions</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th>Generated</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {payslips.length === 0 && !message ? (
              <tr>
                <td colSpan={8}>No generated payslips are available yet.</td>
              </tr>
            ) : (
              payslips.map((payslip) => (
                <tr key={payslip.id}>
                  <td>{payslip.payrollPeriod}</td>
                  <td>{formatDate(payslip.payDate)}</td>
                  <td>{money(payslip.grossPay)}</td>
                  <td>{money(payslip.totalDeductions)}</td>
                  <td>{money(payslip.netPay)}</td>
                  <td>
                    <span className="status-pill locked">{payslip.status}</span>
                  </td>
                  <td>{formatDate(payslip.generatedAt)}</td>
                  <td>
                    <Link className="link-button" href={`/me/payslips/${payslip.id}`}>
                      View Payslip
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getEmployeePayslip } from '@/lib/api';

function getStoredEmployeeToken() {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('employeeToken') ||
    localStorage.getItem('southinEmployeeToken') ||
    localStorage.getItem('southin_peoplepay_employee_token') ||
    localStorage.getItem('token')
  );
}

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export default function EmployeePayslipDetailPage({ params }: { params: { id: string } }) {
  const [payslip, setPayslip] = useState<any>(null);
  const [message, setMessage] = useState('Loading payslip...');

  useEffect(() => {
    async function loadPayslip() {
      const token = getStoredEmployeeToken();

      if (!token) {
        setMessage('You are not logged in. Please login again.');
        return;
      }

      localStorage.setItem('employeeToken', token);

      try {
        const data = await getEmployeePayslip(params.id, token);
        setPayslip(data);
        setMessage('');
      } catch {
        setMessage('Failed to load payslip. Please login again.');
      }
    }

    loadPayslip();
  }, [params.id]);

  if (message) {
    return (
      <section className="card">
        <div className="notice">{message}</div>
      </section>
    );
  }

  if (!payslip) {
    return null;
  }

  const employee = payslip.employee;
  const earnings = payslip.payrollRunEmployee?.earnings || [];
  const deductions = payslip.payrollRunEmployee?.deductions || [];

  return (
    <section className="card payslip-card">
      <div className="page-header">
        <div>
          <h1>Payslip</h1>
          <p className="muted">
            {payslip.payrollPeriod?.periodName || '-'} · Generated {formatDate(payslip.generatedAt)}
          </p>
        </div>

        <div className="action-row">
          <button className="btn-secondary" onClick={() => window.print()} type="button">
            Print
          </button>

          <Link className="btn-secondary" href="/me/payslips">
            Back
          </Link>
        </div>
      </div>

      <div className="payslip-header">
        <div>
          <h2>Southin PeoplePay</h2>
          <p className="muted">Employee Payslip</p>
        </div>

        <div>
          <strong>Status: {payslip.status}</strong>
        </div>
      </div>

      <div className="workflow-grid">
        <div className="workflow-step">
          <span className="workflow-label">Employee No.</span>
          <strong>{employee.employeeNumber}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Employee Name</span>
          <strong>
            {employee.firstName} {employee.lastName}
          </strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Department</span>
          <strong>{employee.department?.name || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Job Title</span>
          <strong>{employee.jobTitle?.name || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Site</span>
          <strong>{employee.site?.name || '-'}</strong>
        </div>

        <div className="workflow-step">
          <span className="workflow-label">Employment Type</span>
          <strong>{employee.employmentType?.name || '-'}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Gross Pay</span>
          <strong>{money(payslip.grossPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Deductions</span>
          <strong>{money(payslip.totalDeductions)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Net Pay</span>
          <strong>{money(payslip.netPay)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employer Cost</span>
          <strong>{money(payslip.employerCost)}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <h3>Earnings</h3>

        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {earnings.length === 0 ? (
              <tr>
                <td colSpan={3}>No earnings recorded.</td>
              </tr>
            ) : (
              earnings.map((earning: any) => (
                <tr key={earning.id}>
                  <td>{earning.earningType}</td>
                  <td>{earning.description || '-'}</td>
                  <td>{money(earning.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Deductions</h3>

        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            {deductions.length === 0 ? (
              <tr>
                <td colSpan={3}>No deductions recorded.</td>
              </tr>
            ) : (
              deductions.map((deduction: any) => (
                <tr key={deduction.id}>
                  <td>{deduction.deductionType}</td>
                  <td>{deduction.description || '-'}</td>
                  <td>{money(deduction.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="notice">
        This payslip is system generated after payroll approval and lock. Payroll values must match approved statutory and finance records.
      </div>
    </section>
  );
}
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { EmployeePortalShell } from '@/components/EmployeePortalShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getEmployeeToken() {
  if (typeof window === 'undefined') return null;

  return (
    localStorage.getItem('employeeToken') ||
    localStorage.getItem('employee_token') ||
    localStorage.getItem('southinEmployeeToken') ||
    localStorage.getItem('token')
  );
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

function formatMoney(value: unknown) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function safeText(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

export default function EmployeePayslipDetailPage() {
  const params = useParams();
  const payslipId = String(params?.id || '');

  const [payslip, setPayslip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadPayslip() {
      setLoading(true);
      setMessage('');

      try {
        const token = getEmployeeToken();

        if (!token) {
          setMessage('Your employee session was not found. Please login again.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/auth/employee/payslips/${payslipId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.message || 'Unable to load payslip.');
        }

        const data = await response.json();
        setPayslip(data?.payslip || data);
      } catch (error: any) {
        setMessage(error?.message || 'Unable to load payslip.');
      } finally {
        setLoading(false);
      }
    }

    if (payslipId) {
      loadPayslip();
    }
  }, [payslipId]);

  const employee = payslip?.employee || payslip?.payrollRunEmployee?.employee || {};
  const payrollPeriod =
    payslip?.payrollPeriod ||
    payslip?.payrollRun?.payrollPeriod ||
    payslip?.payrollRunEmployee?.payrollRun?.payrollPeriod ||
    {};

  const payrollRun =
    payslip?.payrollRun ||
    payslip?.payrollRunEmployee?.payrollRun ||
    {};

  const employeeName = useMemo(() => {
    const fullName =
      payslip?.employeeName ||
      `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim();

    return fullName || '-';
  }, [employee, payslip]);

  const earnings = payslip?.earnings || payslip?.earningLines || [];
  const deductions = payslip?.deductions || payslip?.deductionLines || [];

  const grossPay =
    payslip?.grossPay ??
    payslip?.payrollRunEmployee?.grossPay ??
    0;

  const totalDeductions =
    payslip?.totalDeductions ??
    payslip?.deductionsTotal ??
    payslip?.payrollRunEmployee?.totalDeductions ??
    0;

  const netPay =
    payslip?.netPay ??
    payslip?.payrollRunEmployee?.netPay ??
    0;

  const employerCost =
    payslip?.employerCost ??
    payslip?.payrollRunEmployee?.employerCost ??
    0;

  return (
    <EmployeePortalShell>
      <section className="payslip-document-shell">
        <div className="payslip-toolbar no-print">
          <Link className="btn-secondary" href="/me/payslips">
            Back to Payslips
          </Link>

          <button className="btn" type="button" onClick={() => window.print()}>
            Print Payslip
          </button>
        </div>

        {loading && <div className="notice">Loading payslip...</div>}
        {message && <div className="notice danger">{message}</div>}

        {!loading && payslip && (
          <article className="formal-payslip">
            <header className="formal-payslip-header">
              <div>
                <div className="company-mark">SP</div>
              </div>

              <div className="company-title">
                <h1>Southin PeoplePay</h1>
                <p>Employee Payslip</p>
                <span>Southin Contracting Limited</span>
              </div>

              <div className="payslip-status-box">
                <span>Status</span>
                <strong>{payslip?.status || 'GENERATED'}</strong>
              </div>
            </header>

            <section className="payslip-title-row">
              <div>
                <span className="eyebrow">Payslip Statement</span>
                <h2>{payrollPeriod?.periodName || 'Payroll Period'}</h2>
                <p>
                  Pay date: {formatDate(payrollPeriod?.payDate || payslip?.payDate)} · Generated:{' '}
                  {formatDate(payslip?.generatedAt || payslip?.createdAt)}
                </p>
              </div>

              <div className="payslip-net-card">
                <span>Net Pay</span>
                <strong>{formatMoney(netPay)}</strong>
              </div>
            </section>

            <section className="formal-payslip-grid">
              <div className="formal-payslip-card">
                <span>Employee No.</span>
                <strong>{safeText(employee?.employeeNumber || payslip?.employeeNumber)}</strong>
              </div>

              <div className="formal-payslip-card">
                <span>Employee Name</span>
                <strong>{employeeName}</strong>
              </div>

              <div className="formal-payslip-card">
                <span>Department</span>
                <strong>
                  {safeText(
                    employee?.department?.name ||
                      payslip?.department ||
                      payslip?.payrollRunEmployee?.department,
                  )}
                </strong>
              </div>

              <div className="formal-payslip-card">
                <span>Job Title</span>
                <strong>{safeText(employee?.jobTitle?.name || employee?.jobTitle)}</strong>
              </div>

              <div className="formal-payslip-card">
                <span>Site</span>
                <strong>{safeText(employee?.site?.name || employee?.site)}</strong>
              </div>

              <div className="formal-payslip-card">
                <span>Employment Type</span>
                <strong>
                  {safeText(employee?.employmentType?.name || employee?.employmentType)}
                </strong>
              </div>
            </section>

            <section className="formal-pay-summary">
              <div>
                <span>Gross Pay</span>
                <strong>{formatMoney(grossPay)}</strong>
              </div>

              <div>
                <span>Total Deductions</span>
                <strong>{formatMoney(totalDeductions)}</strong>
              </div>

              <div className="highlight">
                <span>Net Pay</span>
                <strong>{formatMoney(netPay)}</strong>
              </div>

              <div>
                <span>Employer Cost</span>
                <strong>{formatMoney(employerCost)}</strong>
              </div>
            </section>

            <section className="formal-payslip-two-column">
              <div>
                <h3>Earnings</h3>

                <table className="formal-payslip-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Type</th>
                      <th className="amount-cell">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {earnings.length === 0 ? (
                      <tr>
                        <td>Basic salary / gross pay</td>
                        <td>BASIC_PAY</td>
                        <td className="amount-cell">{formatMoney(grossPay)}</td>
                      </tr>
                    ) : (
                      earnings.map((item: any, index: number) => (
                        <tr key={item.id || index}>
                          <td>{safeText(item.description)}</td>
                          <td>{safeText(item.type || item.code)}</td>
                          <td className="amount-cell">{formatMoney(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Deductions</h3>

                <table className="formal-payslip-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Type</th>
                      <th className="amount-cell">Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deductions.length === 0 ? (
                      <>
                        <tr>
                          <td>PAYE deduction</td>
                          <td>PAYE</td>
                          <td className="amount-cell">
                            {formatMoney(payslip?.paye || 0)}
                          </td>
                        </tr>
                        <tr>
                          <td>NAPSA deduction</td>
                          <td>NAPSA</td>
                          <td className="amount-cell">
                            {formatMoney(payslip?.napsa || 0)}
                          </td>
                        </tr>
                        <tr>
                          <td>NHIMA deduction</td>
                          <td>NHIMA</td>
                          <td className="amount-cell">
                            {formatMoney(payslip?.nhima || 0)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      deductions.map((item: any, index: number) => (
                        <tr key={item.id || index}>
                          <td>{safeText(item.description)}</td>
                          <td>{safeText(item.type || item.code)}</td>
                          <td className="amount-cell">{formatMoney(item.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="formal-payslip-footer-grid">
              <div>
                <span>Payroll Run</span>
                <strong>{safeText(payrollRun?.runName)}</strong>
              </div>

              <div>
                <span>Run Type</span>
                <strong>{safeText(payrollRun?.runType)}</strong>
              </div>

              <div>
                <span>Period Start</span>
                <strong>{formatDate(payrollPeriod?.startDate)}</strong>
              </div>

              <div>
                <span>Period End</span>
                <strong>{formatDate(payrollPeriod?.endDate)}</strong>
              </div>
            </section>

            <div className="formal-payslip-note">
              This payslip is system generated after payroll approval and lock. Payroll values must
              match approved statutory, HR, Finance, and audit records. This document is for employee
              information and payroll audit reference.
            </div>

            <footer className="formal-payslip-footer">
              <span>Generated by Southin PeoplePay</span>
              <span>Confidential employee payroll document</span>
            </footer>
          </article>
        )}
      </section>
    </EmployeePortalShell>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculatePayrollLineStatutory,
  updatePayrollLineGrossPay,
} from '@/lib/api';

type Props = {
  runId: string;
  employees: any[];
};

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function shortId(value: string) {
  if (!value) return '-';
  return `${value.slice(0, 8)}...`;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export function PayrollRunLinesEditor({ runId, employees }: Props) {
  const router = useRouter();

  const [savingGrossLineId, setSavingGrossLineId] = useState('');
  const [calculatingLineId, setCalculatingLineId] = useState('');
  const [expandedLineId, setExpandedLineId] = useState('');
  const [message, setMessage] = useState('');

  async function handleUpdateGrossPay(event: React.FormEvent<HTMLFormElement>, lineId: string) {
    event.preventDefault();

    setMessage('');
    setSavingGrossLineId(lineId);

    const formData = new FormData(event.currentTarget);
    const grossPay = Number(formData.get('grossPay') || 0);
    const description = String(formData.get('description') || 'Basic salary / gross pay');

    try {
      await updatePayrollLineGrossPay(runId, lineId, {
        grossPay,
        description,
      });

      setMessage('Gross pay updated and payroll line recalculated.');
      router.refresh();
    } catch {
      setMessage('Failed to update gross pay. Check the API and try again.');
    } finally {
      setSavingGrossLineId('');
    }
  }

  async function handleCalculateStatutory(lineId: string) {
    setMessage('');
    setCalculatingLineId(lineId);

    try {
      await calculatePayrollLineStatutory(runId, lineId);
      setMessage('Statutory draft deductions calculated. Values must be validated before go-live.');
      router.refresh();
    } catch {
      setMessage('Failed to calculate statutory deductions. Confirm gross pay and approved statutory rates.');
    } finally {
      setCalculatingLineId('');
    }
  }

  function toggleBreakdown(lineId: string) {
    setExpandedLineId((current) => (current === lineId ? '' : lineId));
  }

  return (
    <>
      {message && <div className="notice">{message}</div>}

      <div className="table-wrap">
        <h3>Payroll Employees</h3>

        <table>
          <thead>
            <tr>
              <th>Line ID</th>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>Gross Pay Entry</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net</th>
              <th>Deduction Records</th>
              <th>Payslip</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={13}>No employees in this payroll run.</td>
              </tr>
            ) : (
              employees.map((line: any) => {
                const deductionCount = line.deductions?.length || 0;
                const earningCount = line.earnings?.length || 0;
                const isExpanded = expandedLineId === line.id;
                const isLockedOrPayslipGenerated = Boolean(line.payslip);

                return (
                  <>
                    <tr key={line.id}>
                      <td>
                        <code title={line.id}>{shortId(line.id)}</code>
                      </td>

                      <td>{line.employee?.employeeNumber || '-'}</td>

                      <td>
                        {line.employee?.firstName || '-'} {line.employee?.lastName || ''}
                      </td>

                      <td>{line.employee?.department?.name || '-'}</td>

                      <td>{line.employee?.employmentType?.name || '-'}</td>

                      <td>
                        <form
                          className="inline-pay-form"
                          onSubmit={(event) => handleUpdateGrossPay(event, line.id)}
                        >
                          <input
                            name="grossPay"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={Number(line.grossPay || 0)}
                            disabled={isLockedOrPayslipGenerated}
                          />

                          <input
                            name="description"
                            placeholder="Description"
                            defaultValue="Basic salary / gross pay"
                            disabled={isLockedOrPayslipGenerated}
                          />

                          <button
                            className="btn-small"
                            disabled={savingGrossLineId === line.id || isLockedOrPayslipGenerated}
                            type="submit"
                          >
                            {savingGrossLineId === line.id ? 'Saving...' : 'Update'}
                          </button>
                        </form>
                      </td>

                      <td>{money(line.grossPay)}</td>

                      <td>{money(line.totalDeductions)}</td>

                      <td>{money(line.netPay)}</td>

                      <td>
                        {deductionCount > 0 ? (
                          <button
                            className="link-button"
                            onClick={() => toggleBreakdown(line.id)}
                            type="button"
                          >
                            {deductionCount} records
                          </button>
                        ) : (
                          <span className="muted">None</span>
                        )}
                      </td>

                      <td>
                        {line.payslip ? (
                          <span className="status-pill locked">Generated</span>
                        ) : (
                          <span className="muted">Not generated</span>
                        )}
                      </td>

                      <td>{line.status}</td>

                      <td>
                        <div className="action-row">
                          <button
                            className="btn-small"
                            disabled={calculatingLineId === line.id || isLockedOrPayslipGenerated}
                            onClick={() => handleCalculateStatutory(line.id)}
                            type="button"
                          >
                            {calculatingLineId === line.id ? 'Calculating...' : 'Calculate Statutory'}
                          </button>

                          <button
                            className="btn-small"
                            onClick={() => toggleBreakdown(line.id)}
                            type="button"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${line.id}-details`}>
                        <td colSpan={13}>
                          <div className="payroll-breakdown">
                            <div>
                              <h4>Earnings</h4>

                              <table>
                                <thead>
                                  <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Taxable</th>
                                    <th>NAPSA</th>
                                    <th>NHIMA</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {earningCount === 0 ? (
                                    <tr>
                                      <td colSpan={6}>No earnings recorded.</td>
                                    </tr>
                                  ) : (
                                    line.earnings.map((earning: any) => (
                                      <tr key={earning.id}>
                                        <td>{earning.earningType}</td>
                                        <td>{earning.description || '-'}</td>
                                        <td>{money(earning.amount)}</td>
                                        <td>{earning.taxable ? 'Yes' : 'No'}</td>
                                        <td>{earning.napsaPensionable ? 'Yes' : 'No'}</td>
                                        <td>{earning.nhimaApplicable ? 'Yes' : 'No'}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div>
                              <h4>Deductions</h4>

                              <table>
                                <thead>
                                  <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Source</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {deductionCount === 0 ? (
                                    <tr>
                                      <td colSpan={4}>No deductions recorded.</td>
                                    </tr>
                                  ) : (
                                    line.deductions.map((deduction: any) => (
                                      <tr key={deduction.id}>
                                        <td>{deduction.deductionType}</td>
                                        <td>{deduction.description || '-'}</td>
                                        <td>{money(deduction.amount)}</td>
                                        <td>{deduction.source || '-'}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            <div>
                              <h4>Payslip</h4>

                              {line.payslip ? (
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Status</th>
                                      <th>Gross Pay</th>
                                      <th>Deductions</th>
                                      <th>Net Pay</th>
                                      <th>Employer Cost</th>
                                      <th>Generated At</th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    <tr>
                                      <td>{line.payslip.status}</td>
                                      <td>{money(line.payslip.grossPay)}</td>
                                      <td>{money(line.payslip.totalDeductions)}</td>
                                      <td>{money(line.payslip.netPay)}</td>
                                      <td>{money(line.payslip.employerCost)}</td>
                                      <td>{formatDateTime(line.payslip.generatedAt)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <div className="notice">
                                  Payslip has not yet been generated for this payroll line.
                                </div>
                              )}
                            </div>

                            <div className="breakdown-summary">
                              <strong>Payroll Line Summary</strong>
                              <span>Gross: {money(line.grossPay)}</span>
                              <span>Deductions: {money(line.totalDeductions)}</span>
                              <span>Net Pay: {money(line.netPay)}</span>
                              <span>Employer Cost: {money(line.employerCost)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
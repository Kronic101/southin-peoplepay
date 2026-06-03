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

export function PayrollRunLinesEditor({ runId, employees }: Props) {
  const router = useRouter();
  const [savingGrossLineId, setSavingGrossLineId] = useState('');
  const [calculatingLineId, setCalculatingLineId] = useState('');
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
      setMessage('Failed to calculate statutory deductions. Confirm gross pay has been entered.');
    } finally {
      setCalculatingLineId('');
    }
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
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={12}>No employees in this payroll run.</td>
              </tr>
            ) : (
              employees.map((line: any) => {
                const deductionCount = line.deductions?.length || 0;

                return (
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
                        />

                        <input
                          name="description"
                          placeholder="Description"
                          defaultValue="Basic salary / gross pay"
                        />

                        <button
                        className="btn-small"
                        disabled={savingGrossLineId === line.id}
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
                        <span className="ready-text">{deductionCount} records</span>
                      ) : (
                        <span className="muted">None</span>
                      )}
                    </td>

                    <td>{line.status}</td>

                    <td>
                      <button
                      className="btn-small"
                      disabled={calculatingLineId === line.id}
                      onClick={() => handleCalculateStatutory(line.id)}
                      type="button"
                    >
                      {calculatingLineId === line.id ? 'Calculating...' : 'Calculate Statutory'}
                    </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
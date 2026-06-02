'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePayrollLineGrossPay } from '@/lib/api';

type Props = {
  runId: string;
  employees: any[];
};

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

export function PayrollRunLinesEditor({ runId, employees }: Props) {
  const router = useRouter();
  const [savingLineId, setSavingLineId] = useState('');
  const [message, setMessage] = useState('');

  async function handleUpdateGrossPay(event: React.FormEvent<HTMLFormElement>, lineId: string) {
    event.preventDefault();
    setMessage('');
    setSavingLineId(lineId);

    const formData = new FormData(event.currentTarget);
    const grossPay = Number(formData.get('grossPay') || 0);

    try {
      await updatePayrollLineGrossPay(runId, lineId, {
        grossPay,
        description: String(formData.get('description') || 'Basic salary / gross pay'),
      });

      setMessage('Gross pay updated and payroll line recalculated.');
      router.refresh();
    } catch {
      setMessage('Failed to update gross pay. Check the API and try again.');
    } finally {
      setSavingLineId('');
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
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={10}>No employees in this payroll run.</td>
              </tr>
            ) : (
              employees.map((line: any) => (
                <tr key={line.id}>
                  <td>
                    <code>{line.id}</code>
                  </td>
                  <td>{line.employee?.employeeNumber || '-'}</td>
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
                      <button className="btn-small" disabled={savingLineId === line.id} type="submit">
                        {savingLineId === line.id ? 'Saving...' : 'Update'}
                      </button>
                    </form>
                  </td>
                  <td>{money(line.grossPay)}</td>
                  <td>{money(line.totalDeductions)}</td>
                  <td>{money(line.netPay)}</td>
                  <td>{line.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
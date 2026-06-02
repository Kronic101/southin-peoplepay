'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPayrollRun,
  getPayrollPeriods,
  getPayrollReadyEmployees,
} from '@/lib/api';
import { AppShell } from '@/components/AppShell';

export default function NewPayrollRunPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<any[]>([]);
  const [readyEmployees, setReadyEmployees] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [periodData, employeeData] = await Promise.all([
          getPayrollPeriods(),
          getPayrollReadyEmployees(),
        ]);

        setPeriods(periodData);
        setReadyEmployees(employeeData);
      } catch {
        setError('Failed to load payroll setup data.');
      }
    }

    loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      const run = await createPayrollRun({
        payrollPeriodId: String(formData.get('payrollPeriodId') || ''),
        runName: String(formData.get('runName') || ''),
        runType: String(formData.get('runType') || 'MONTHLY'),
      });

      router.push(`/payroll/runs/${run.id}`);
      router.refresh();
    } catch {
      setError('Failed to create payroll run. Confirm there is an open period and payroll-ready employees.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="card">
        <h1>New Payroll Run</h1>
        <p className="muted">
          Create a draft payroll run using payroll-ready employees only.
        </p>

        <div className="notice">
          Payroll-ready employees available: <strong>{readyEmployees.length}</strong>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Payroll Period
            <select name="payrollPeriodId" required>
              <option value="">Select payroll period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.periodName} · {period.status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Run Name
            <input name="runName" placeholder="June 2026 Main Payroll" required />
          </label>

          <label>
            Run Type
            <select name="runType" defaultValue="MONTHLY">
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="CASUAL">Casual</option>
              <option value="OFF_CYCLE">Off-cycle</option>
              <option value="FINAL_PAY">Final pay</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </label>

          <div className="table-wrap">
            <h3>Employees to be included</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee No.</th>
                  <th>Name</th>
                  <th>Employment Type</th>
                  <th>Department</th>
                </tr>
              </thead>
              <tbody>
                {readyEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No payroll-ready employees available.</td>
                  </tr>
                ) : (
                  readyEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.employeeNumber}</td>
                      <td>{employee.name}</td>
                      <td>{employee.employmentType || '-'}</td>
                      <td>{employee.department || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {error && <div className="notice">{error}</div>}

          <button className="btn" disabled={saving || readyEmployees.length === 0} type="submit">
            {saving ? 'Creating...' : 'Create Draft Payroll Run'}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
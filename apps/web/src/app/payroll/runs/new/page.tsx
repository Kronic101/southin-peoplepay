'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPayrollRun, getPayrollRunCreationReadiness } from '@/lib/api';

type Props = {
  periods: any[];
};

function formatMissing(value: string) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^has /i, 'Missing ')
    .replace(/^bank /i, 'Bank ')
    .replace(/^./, (char) => char.toUpperCase());
}

export function NewPayrollRunForm({ periods }: Props) {
  const router = useRouter();

  const [payrollPeriodId, setPayrollPeriodId] = useState(periods?.[0]?.id || '');
  const [runName, setRunName] = useState('');
  const [runType, setRunType] = useState('MONTHLY');
  const [preparedBy, setPreparedBy] = useState('payroll-officer-dev');
  const [strictReadiness, setStrictReadiness] = useState(true);

  const [readiness, setReadiness] = useState<any>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReadiness() {
      setLoadingReadiness(true);
      setError('');

      try {
        const result = await getPayrollRunCreationReadiness();
        setReadiness(result);
      } catch {
        setError('Failed to load HR/Finance readiness gates.');
      } finally {
        setLoadingReadiness(false);
      }
    }

    loadReadiness();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCreating(true);
    setMessage('');
    setError('');

    try {
      const result = await createPayrollRun({
        payrollPeriodId,
        runName,
        runType,
        preparedBy,
        strictReadiness,
      });

      setMessage(result.message || 'Payroll run created successfully.');

      const runId = result.run?.id || result.id;

      if (runId) {
        router.push(`/payroll/runs/${runId}`);
      } else {
        router.push('/payroll');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create payroll run.');
    } finally {
      setCreating(false);
    }
  }

  const readyEmployees = readiness?.readyEmployees || [];
  const blockedEmployees = readiness?.blockedEmployees || [];

  const canCreate =
    readiness?.readyCount > 0 && (!strictReadiness || readiness?.blockedCount === 0);

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>New Payroll Run</h1>
          <p className="muted">
            Payroll creation is controlled by HR and Finance readiness gates.
          </p>
        </div>
      </div>

      {loadingReadiness ? (
        <div className="notice">Checking HR/Finance readiness gates...</div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Total Employees</span>
              <strong>{readiness?.summary?.totalEmployees ?? 0}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Ready Employees</span>
              <strong>{readiness?.readyCount ?? 0}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Blocked Employees</span>
              <strong>{readiness?.blockedCount ?? 0}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Can Create Payroll</span>
              <strong>{readiness?.canCreatePayrollRun ? 'YES' : 'NO'}</strong>
            </div>
          </div>

          <div className="notice">
            {readiness?.message ||
              'Payroll readiness will determine which employees can be included.'}
          </div>
        </>
      )}

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Payroll Period
          <select
            value={payrollPeriodId}
            onChange={(event) => setPayrollPeriodId(event.target.value)}
            required
          >
            {periods.map((period: any) => (
              <option key={period.id} value={period.id}>
                {period.periodName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Run Name
          <input
            value={runName}
            onChange={(event) => setRunName(event.target.value)}
            placeholder="Example: June 2026 Payroll"
            required
          />
        </label>

        <label>
          Run Type
          <select value={runType} onChange={(event) => setRunType(event.target.value)}>
            <option value="MONTHLY">MONTHLY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="CASUAL">CASUAL</option>
            <option value="ADHOC">ADHOC</option>
          </select>
        </label>

        <label>
          Prepared By
          <input
            value={preparedBy}
            onChange={(event) => setPreparedBy(event.target.value)}
            required
          />
        </label>

        <label>
          Readiness Enforcement
          <select
            value={strictReadiness ? 'STRICT' : 'READY_ONLY'}
            onChange={(event) => setStrictReadiness(event.target.value === 'STRICT')}
          >
            <option value="STRICT">Block payroll if any employee fails readiness</option>
            <option value="READY_ONLY">Create payroll for ready employees only</option>
          </select>
        </label>

        {error && <div className="notice danger">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <button className="btn" type="submit" disabled={creating || !readiness?.canCreatePayrollRun}>
          {creating ? 'Creating Payroll Run...' : 'Create Payroll Run'}
        </button>

        {!canCreate && readiness?.readyCount > 0 && strictReadiness && (
          <div className="notice">
            Strict mode is enabled. Payroll is blocked because some employees have failed readiness
            gates. Change enforcement to <strong>ready employees only</strong> if you want to exclude
            blocked employees from this run.
          </div>
        )}
      </form>

      <h2>Employees Included If Created Now</h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Employment Type</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {readyEmployees.length === 0 ? (
              <tr>
                <td colSpan={5}>No payroll-ready employees found.</td>
              </tr>
            ) : (
              readyEmployees.map((employee: any) => (
                <tr key={employee.employeeId}>
                  <td>{employee.employeeNumber}</td>
                  <td>{employee.name}</td>
                  <td>{employee.department}</td>
                  <td>{employee.employmentType}</td>
                  <td>
                    <span className="badge success">READY</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2>Blocked Employees</h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>HR Gate</th>
              <th>Finance Gate</th>
              <th>Missing Items</th>
            </tr>
          </thead>

          <tbody>
            {blockedEmployees.length === 0 ? (
              <tr>
                <td colSpan={5}>No blocked employees.</td>
              </tr>
            ) : (
              blockedEmployees.map((employee: any) => (
                <tr key={employee.employeeId}>
                  <td>{employee.employeeNumber}</td>
                  <td>{employee.name}</td>
                  <td>
                    <span className="badge warning">{employee.hrStatus}</span>
                  </td>
                  <td>
                    <span className="badge warning">{employee.financeStatus}</span>
                  </td>
                  <td>
                    <ul>
                      {(employee.missingItems || []).map((item: string) => (
                        <li key={item}>{formatMissing(item)}</li>
                      ))}
                    </ul>
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
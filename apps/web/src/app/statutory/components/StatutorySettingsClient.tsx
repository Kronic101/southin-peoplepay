'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveNapsaRate,
  approveNhimaRate,
  approveSdlRate,
  createNapsaRate,
  createNhimaRate,
  createPayeBand,
  createSdlRate,
  createTaxYear,
} from '@/lib/api';

type Props = {
  settings: {
    taxYears: any[];
    napsaRates: any[];
    nhimaRates: any[];
    sdlRates: any[];
  };
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value.split('T')[0];
  }

  return value;
}

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(value || 0);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function StatutorySettingsClient({ settings }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tax-years');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setMessage('');
    setSaving(true);

    try {
      await action();
      setMessage(successMessage);
      router.refresh();
    } catch {
      setMessage('Action failed. Check the API terminal and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTaxYear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        createTaxYear({
          name: String(formData.get('name') || ''),
          startDate: String(formData.get('startDate') || ''),
          endDate: String(formData.get('endDate') || ''),
          isActive: formData.get('isActive') === 'on',
        }),
      'Tax year created.',
    );

    event.currentTarget.reset();
  }

  async function handleCreatePayeBand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const upperBoundRaw = String(formData.get('upperBound') || '').trim();

    await runAction(
      () =>
        createPayeBand({
          taxYearId: String(formData.get('taxYearId') || ''),
          lowerBound: numberValue(formData.get('lowerBound')),
          upperBound: upperBoundRaw ? Number(upperBoundRaw) : null,
          rate: numberValue(formData.get('rate')),
        }),
      'PAYE band created.',
    );

    event.currentTarget.reset();
  }

  async function handleCreateNapsaRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const monthlyCeilingRaw = String(formData.get('monthlyCeiling') || '').trim();

    await runAction(
      () =>
        createNapsaRate({
          name: String(formData.get('name') || ''),
          employeeRate: numberValue(formData.get('employeeRate')),
          employerRate: numberValue(formData.get('employerRate')),
          monthlyCeiling: monthlyCeilingRaw ? Number(monthlyCeilingRaw) : null,
          effectiveFrom: String(formData.get('effectiveFrom') || ''),
          effectiveTo: String(formData.get('effectiveTo') || '') || null,
        }),
      'NAPSA rate created as DRAFT.',
    );

    event.currentTarget.reset();
  }

  async function handleCreateNhimaRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        createNhimaRate({
          name: String(formData.get('name') || ''),
          employeeRate: numberValue(formData.get('employeeRate')),
          employerRate: numberValue(formData.get('employerRate')),
          calculationBase: String(formData.get('calculationBase') || 'CONFIGURABLE'),
          effectiveFrom: String(formData.get('effectiveFrom') || ''),
          effectiveTo: String(formData.get('effectiveTo') || '') || null,
        }),
      'NHIMA rate created as DRAFT.',
    );

    event.currentTarget.reset();
  }

  async function handleCreateSdlRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    await runAction(
      () =>
        createSdlRate({
          name: String(formData.get('name') || ''),
          employerRate: numberValue(formData.get('employerRate')),
          calculationBase: String(formData.get('calculationBase') || 'GROSS_EMOLUMENTS'),
          effectiveFrom: String(formData.get('effectiveFrom') || ''),
          effectiveTo: String(formData.get('effectiveTo') || '') || null,
        }),
      'SDL rate created as DRAFT.',
    );

    event.currentTarget.reset();
  }

  const tabs = [
    ['tax-years', 'Tax Years & PAYE'],
    ['napsa', 'NAPSA'],
    ['nhima', 'NHIMA'],
    ['sdl', 'SDL / Employer'],
  ];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Statutory Settings</h1>
          <p className="muted">
            Configure PAYE, NAPSA, NHIMA, and employer statutory settings before live payroll use.
          </p>
        </div>
      </div>

      <div className="notice">
        These values must be validated and approved by HR/Finance before go-live. Draft values are for system setup and testing only.
      </div>

      <div className="tabs">
        {tabs.map(([key, label]) => (
          <button
            className={activeTab === key ? 'tab active-tab' : 'tab'}
            key={key}
            onClick={() => {
              setActiveTab(key);
              setMessage('');
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div className="notice">{message}</div>}

      {activeTab === 'tax-years' && (
        <>
          <form className="form-grid" onSubmit={handleCreateTaxYear}>
            <h2>Create Tax Year</h2>

            <label>
              Tax Year Name
              <input name="name" placeholder="2026 Tax Year - Draft" required />
            </label>

            <label>
              Start Date
              <input name="startDate" type="date" required />
            </label>

            <label>
              End Date
              <input name="endDate" type="date" required />
            </label>

            <label className="checkbox-line">
              <input name="isActive" type="checkbox" />
              Set as active tax year
            </label>

            <button className="btn" disabled={saving} type="submit">
              Create Tax Year
            </button>
          </form>

          <form className="form-grid" onSubmit={handleCreatePayeBand}>
            <h2>Add PAYE Band</h2>

            <label>
              Tax Year
              <select name="taxYearId" required>
                <option value="">Select tax year</option>
                {settings.taxYears.map((taxYear) => (
                  <option key={taxYear.id} value={taxYear.id}>
                    {taxYear.name} {taxYear.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Lower Bound
              <input name="lowerBound" type="number" step="0.01" defaultValue="0" required />
            </label>

            <label>
              Upper Bound
              <input name="upperBound" type="number" step="0.01" placeholder="Leave blank if no upper limit" />
            </label>

            <label>
              Rate
              <input name="rate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <button className="btn" disabled={saving || settings.taxYears.length === 0} type="submit">
              Add PAYE Band
            </button>
          </form>

          <div className="table-wrap">
            <h3>Tax Years</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Active</th>
                  <th>PAYE Bands</th>
                </tr>
              </thead>
              <tbody>
                {settings.taxYears.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No tax years configured.</td>
                  </tr>
                ) : (
                  settings.taxYears.map((taxYear) => (
                    <tr key={taxYear.id}>
                      <td>{taxYear.name}</td>
                      <td>{formatDate(taxYear.startDate)}</td>
                      <td>{formatDate(taxYear.endDate)}</td>
                      <td>{taxYear.isActive ? 'Yes' : 'No'}</td>
                      <td>{taxYear.payeBands?.length || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'napsa' && (
        <>
          <form className="form-grid" onSubmit={handleCreateNapsaRate}>
            <h2>Create NAPSA Rate</h2>

            <label>
              Name
              <input name="name" placeholder="NAPSA 2026 Draft" required />
            </label>

            <label>
              Employee Rate
              <input name="employeeRate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <label>
              Employer Rate
              <input name="employerRate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <label>
              Monthly Ceiling
              <input name="monthlyCeiling" type="number" step="0.01" placeholder="Optional" />
            </label>

            <label>
              Effective From
              <input name="effectiveFrom" type="date" required />
            </label>

            <label>
              Effective To
              <input name="effectiveTo" type="date" />
            </label>

            <button className="btn" disabled={saving} type="submit">
              Create NAPSA Rate
            </button>
          </form>

          <RatesTable
            title="NAPSA Rates"
            rows={settings.napsaRates}
            onApprove={(id) => runAction(() => approveNapsaRate(id), 'NAPSA rate approved.')}
          />
        </>
      )}

      {activeTab === 'nhima' && (
        <>
          <form className="form-grid" onSubmit={handleCreateNhimaRate}>
            <h2>Create NHIMA Rate</h2>

            <label>
              Name
              <input name="name" placeholder="NHIMA 2026 Draft" required />
            </label>

            <label>
              Employee Rate
              <input name="employeeRate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <label>
              Employer Rate
              <input name="employerRate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <label>
              Calculation Base
              <input name="calculationBase" defaultValue="CONFIGURABLE" required />
            </label>

            <label>
              Effective From
              <input name="effectiveFrom" type="date" required />
            </label>

            <label>
              Effective To
              <input name="effectiveTo" type="date" />
            </label>

            <button className="btn" disabled={saving} type="submit">
              Create NHIMA Rate
            </button>
          </form>

          <RatesTable
            title="NHIMA Rates"
            rows={settings.nhimaRates}
            onApprove={(id) => runAction(() => approveNhimaRate(id), 'NHIMA rate approved.')}
          />
        </>
      )}

      {activeTab === 'sdl' && (
        <>
          <form className="form-grid" onSubmit={handleCreateSdlRate}>
            <h2>Create SDL / Employer Rate</h2>

            <label>
              Name
              <input name="name" placeholder="SDL 2026 Draft" required />
            </label>

            <label>
              Employer Rate
              <input name="employerRate" type="number" step="0.0001" defaultValue="0" required />
            </label>

            <label>
              Calculation Base
              <input name="calculationBase" defaultValue="GROSS_EMOLUMENTS" required />
            </label>

            <label>
              Effective From
              <input name="effectiveFrom" type="date" required />
            </label>

            <label>
              Effective To
              <input name="effectiveTo" type="date" />
            </label>

            <button className="btn" disabled={saving} type="submit">
              Create SDL Rate
            </button>
          </form>

          <RatesTable
            title="SDL / Employer Rates"
            rows={settings.sdlRates}
            onApprove={(id) => runAction(() => approveSdlRate(id), 'SDL rate approved.')}
          />
        </>
      )}
    </section>
  );
}

function RatesTable({
  title,
  rows,
  onApprove,
}: {
  title: string;
  rows: any[];
  onApprove: (id: string) => void;
}) {
  return (
    <div className="table-wrap">
      <h3>{title}</h3>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee Rate</th>
            <th>Employer Rate</th>
            <th>Ceiling / Base</th>
            <th>Effective From</th>
            <th>Effective To</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8}>No rates configured.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.employeeRate ?? '-'}</td>
                <td>{row.employerRate ?? '-'}</td>
                <td>{row.monthlyCeiling ?? row.calculationBase ?? '-'}</td>
                <td>{formatDate(row.effectiveFrom)}</td>
                <td>{formatDate(row.effectiveTo)}</td>
                <td>{row.status}</td>
                <td>
                  {row.status === 'APPROVED' ? (
                    <span className="ready-text">Approved</span>
                  ) : (
                    <button className="btn-small" onClick={() => onApprove(row.id)} type="button">
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
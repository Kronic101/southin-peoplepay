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
  updateNapsaRate,
  updateNhimaRate,
  updatePayeBand,
  updateSdlRate,
} from '@/lib/api';

type StatutorySettings = {
  taxYears: any[];
  napsaRates: any[];
  nhimaRates: any[];
  sdlRates: any[];
};

type Props = {
  settings: StatutorySettings;
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

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value || '').trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

function rateHint() {
  return 'Enter rates as decimals: 5% = 0.05, 10% = 0.10, 37.5% = 0.375';
}

export function StatutorySettingsClient({ settings }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('tax-years');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const payeBandRows = settings.taxYears.flatMap((taxYear) =>
    (taxYear.payeBands || []).map((band: any) => ({
      ...band,
      taxYearName: taxYear.name,
    })),
  );

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setMessage('');
    setSaving(true);

    try {
      await action();
      setMessage(successMessage);
      router.refresh();
    } catch {
      setMessage('Action failed. Confirm the values are valid and check the API terminal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateTaxYear(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

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

    form.reset();
  }

  async function handleCreatePayeBand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    await runAction(
      () =>
        createPayeBand({
          taxYearId: String(formData.get('taxYearId') || ''),
          lowerBound: numberValue(formData.get('lowerBound')),
          upperBound: optionalNumber(formData.get('upperBound')),
          rate: numberValue(formData.get('rate')),
        }),
      'PAYE band created.',
    );

    form.reset();
  }

  async function handleCreateNapsaRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    await runAction(
      () =>
        createNapsaRate({
          name: String(formData.get('name') || ''),
          employeeRate: numberValue(formData.get('employeeRate')),
          employerRate: numberValue(formData.get('employerRate')),
          monthlyCeiling: optionalNumber(formData.get('monthlyCeiling')),
          effectiveFrom: String(formData.get('effectiveFrom') || ''),
          effectiveTo: String(formData.get('effectiveTo') || '') || null,
        }),
      'NAPSA rate created as DRAFT.',
    );

    form.reset();
  }

  async function handleCreateNhimaRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

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

    form.reset();
  }

  async function handleCreateSdlRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

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

    form.reset();
  }

  async function handleEditPayeBand(band: any) {
    const lowerBound = window.prompt('Lower bound', String(band.lowerBound ?? '0'));

    if (lowerBound === null) return;

    const upperBound = window.prompt(
      'Upper bound - leave blank if no upper limit',
      band.upperBound === null || band.upperBound === undefined ? '' : String(band.upperBound),
    );

    if (upperBound === null) return;

    const rate = window.prompt(`PAYE rate. ${rateHint()}`, String(band.rate ?? '0'));

    if (rate === null) return;

    await runAction(
      () =>
        updatePayeBand(band.id, {
          lowerBound: Number(lowerBound || 0),
          upperBound: upperBound.trim() ? Number(upperBound) : null,
          rate: Number(rate || 0),
        }),
      'PAYE band updated.',
    );
  }

  async function handleEditNapsaRate(row: any) {
    const name = window.prompt('Name', row.name || '');

    if (name === null) return;

    const employeeRate = window.prompt(`Employee rate. ${rateHint()}`, String(row.employeeRate ?? '0'));

    if (employeeRate === null) return;

    const employerRate = window.prompt(`Employer rate. ${rateHint()}`, String(row.employerRate ?? '0'));

    if (employerRate === null) return;

    const monthlyCeiling = window.prompt(
      'Monthly ceiling - leave blank if none',
      row.monthlyCeiling === null || row.monthlyCeiling === undefined ? '' : String(row.monthlyCeiling),
    );

    if (monthlyCeiling === null) return;

    await runAction(
      () =>
        updateNapsaRate(row.id, {
          name,
          employeeRate: Number(employeeRate || 0),
          employerRate: Number(employerRate || 0),
          monthlyCeiling: monthlyCeiling.trim() ? Number(monthlyCeiling) : null,
        }),
      'NAPSA rate updated and returned to DRAFT.',
    );
  }

  async function handleEditNhimaRate(row: any) {
    const name = window.prompt('Name', row.name || '');

    if (name === null) return;

    const employeeRate = window.prompt(`Employee rate. ${rateHint()}`, String(row.employeeRate ?? '0'));

    if (employeeRate === null) return;

    const employerRate = window.prompt(`Employer rate. ${rateHint()}`, String(row.employerRate ?? '0'));

    if (employerRate === null) return;

    const calculationBase = window.prompt('Calculation base', row.calculationBase || 'CONFIGURABLE');

    if (calculationBase === null) return;

    await runAction(
      () =>
        updateNhimaRate(row.id, {
          name,
          employeeRate: Number(employeeRate || 0),
          employerRate: Number(employerRate || 0),
          calculationBase,
        }),
      'NHIMA rate updated and returned to DRAFT.',
    );
  }

  async function handleEditSdlRate(row: any) {
    const name = window.prompt('Name', row.name || '');

    if (name === null) return;

    const employerRate = window.prompt(`Employer rate. ${rateHint()}`, String(row.employerRate ?? '0'));

    if (employerRate === null) return;

    const calculationBase = window.prompt('Calculation base', row.calculationBase || 'GROSS_EMOLUMENTS');

    if (calculationBase === null) return;

    await runAction(
      () =>
        updateSdlRate(row.id, {
          name,
          employerRate: Number(employerRate || 0),
          calculationBase,
        }),
      'SDL rate updated and returned to DRAFT.',
    );
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
        These values must be validated and approved by HR/Finance before go-live. Enter rates as decimals:
        <strong> 5% = 0.05</strong>, <strong>10% = 0.10</strong>, <strong>37.5% = 0.375</strong>.
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
              {saving ? 'Saving...' : 'Create Tax Year'}
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
              <span className="muted">Example: 30% must be entered as 0.30</span>
            </label>

            <button className="btn" disabled={saving || settings.taxYears.length === 0} type="submit">
              {saving ? 'Saving...' : 'Add PAYE Band'}
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

          <div className="table-wrap">
            <h3>PAYE Bands</h3>

            <table>
              <thead>
                <tr>
                  <th>Tax Year</th>
                  <th>Lower Bound</th>
                  <th>Upper Bound</th>
                  <th>Rate</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {payeBandRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No PAYE bands configured.</td>
                  </tr>
                ) : (
                  payeBandRows.map((band) => (
                    <tr key={band.id}>
                      <td>{band.taxYearName}</td>
                      <td>{band.lowerBound}</td>
                      <td>{band.upperBound ?? '-'}</td>
                      <td>{band.rate}</td>
                      <td>
                        <button className="btn-small" onClick={() => handleEditPayeBand(band)} type="button">
                          Edit
                        </button>
                      </td>
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
              <span className="muted">Example: 5% must be entered as 0.05</span>
            </label>

            <label>
              Employer Rate
              <input name="employerRate" type="number" step="0.0001" defaultValue="0" required />
              <span className="muted">Example: 5% must be entered as 0.05</span>
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
              {saving ? 'Saving...' : 'Create NAPSA Rate'}
            </button>
          </form>

          <RatesTable
            title="NAPSA Rates"
            rows={settings.napsaRates}
            onApprove={(id) => runAction(() => approveNapsaRate(id), 'NAPSA rate approved.')}
            onEdit={handleEditNapsaRate}
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
              <span className="muted">Example: 1% must be entered as 0.01</span>
            </label>

            <label>
              Employer Rate
              <input name="employerRate" type="number" step="0.0001" defaultValue="0" required />
              <span className="muted">Example: 1% must be entered as 0.01</span>
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
              {saving ? 'Saving...' : 'Create NHIMA Rate'}
            </button>
          </form>

          <RatesTable
            title="NHIMA Rates"
            rows={settings.nhimaRates}
            onApprove={(id) => runAction(() => approveNhimaRate(id), 'NHIMA rate approved.')}
            onEdit={handleEditNhimaRate}
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
              <span className="muted">Example: 0.5% must be entered as 0.005</span>
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
              {saving ? 'Saving...' : 'Create SDL Rate'}
            </button>
          </form>

          <RatesTable
            title="SDL / Employer Rates"
            rows={settings.sdlRates}
            onApprove={(id) => runAction(() => approveSdlRate(id), 'SDL rate approved.')}
            onEdit={handleEditSdlRate}
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
  onEdit,
}: {
  title: string;
  rows: any[];
  onApprove: (id: string) => void;
  onEdit: (row: any) => void;
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
                  <div className="action-row">
                    <button className="btn-small" onClick={() => onEdit(row)} type="button">
                      Edit
                    </button>

                    {row.status === 'APPROVED' ? (
                      <span className="ready-text">Approved</span>
                    ) : (
                      <button className="btn-small" onClick={() => onApprove(row.id)} type="button">
                        Approve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
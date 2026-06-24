'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetFuelLogRecord,
  FleetVehicleRecord,
  createFleetFuelLog,
  exportFleetCsv,
  getFleetFuelLogs,
  getFleetVehicles,
} from '@/lib/fleet-api';

const initialForm = {
  vehicleId: '',
  fuelType: 'DIESEL',
  litres: '0',
  unitPrice: '0',
  odometer: '0',
  stationName: '',
  receiptNo: '',
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(asNumber(value));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function FleetFuelPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleRecord[]>([]);
  const [logs, setLogs] = useState<FleetFuelLogRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [vehicleResult, logResult] = await Promise.all([getFleetVehicles(), getFleetFuelLogs()]);
      setVehicles(vehicleResult || []);
      setLogs(logResult || []);
      setForm((current) => ({ ...current, vehicleId: current.vehicleId || vehicleResult?.[0]?.id || '' }));
    } catch (err: any) {
      setError(err?.message || 'Unable to load fuel records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const litres = logs.reduce((sum, log) => sum + asNumber(log.litres), 0);
    const totalCost = logs.reduce((sum, log) => sum + asNumber(log.amount), 0);
    const vehicleCount = new Set(logs.map((log) => log.vehicleId)).size;

    return { total: logs.length, litres, totalCost, vehicleCount };
  }, [logs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.vehicleId) {
        throw new Error('Please select a vehicle.');
      }

      await createFleetFuelLog(form);
      setMessage('Fuel log submitted successfully.');
      setForm({ ...initialForm, vehicleId: form.vehicleId });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit fuel log.');
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-fuel-logs.csv',
      logs.map((log) => ({
        date: log.fuelDate || log.createdAt || '',
        registrationNo: log.vehicle?.registrationNo || '',
        fuelType: log.fuelType || '',
        litres: log.litres || '',
        amount: log.amount || '',
        odometer: log.odometer || '',
        stationName: log.stationName || '',
        receiptNo: log.receiptDocumentId || '',
      })),
    );
  }

  const estimatedTotal = asNumber(form.litres) * asNumber(form.unitPrice);

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fuel Logs</h1>
            <p className="muted">
              Fuel control for diesel/petrol entries, odometer capture, receipt references and finance costing.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/reports">Reports</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Fuel Logs</span><strong>{summary.total}</strong></div>
          <div className="finance-summary-card"><span>Total Litres</span><strong>{summary.litres.toFixed(2)}</strong></div>
          <div className="finance-summary-card"><span>Total Fuel Cost</span><strong>{formatMoney(summary.totalCost)}</strong></div>
          <div className="finance-summary-card"><span>Vehicles Fuelled</span><strong>{summary.vehicleCount}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Capture Fuel Log</h2>
          <p className="muted">Web capture is for Fleet Manager/Dispatch review. Driver self-entry should be handled from Android.</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Vehicle
              <select value={form.vehicleId} onChange={(event) => setForm({ ...form, vehicleId: event.target.value })} required>
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNo} - {vehicle.make} {vehicle.model}</option>
                ))}
              </select>
            </label>
            <label>
              Fuel Type
              <select value={form.fuelType} onChange={(event) => setForm({ ...form, fuelType: event.target.value })}>
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              Litres
              <input type="number" step="0.01" value={form.litres} onChange={(event) => setForm({ ...form, litres: event.target.value })} required />
            </label>
            <label>
              Unit Price
              <input type="number" step="0.01" value={form.unitPrice} onChange={(event) => setForm({ ...form, unitPrice: event.target.value })} required />
            </label>
            <label>
              Odometer
              <input type="number" value={form.odometer} onChange={(event) => setForm({ ...form, odometer: event.target.value })} required />
            </label>
            <label>
              Station Name
              <input value={form.stationName} onChange={(event) => setForm({ ...form, stationName: event.target.value })} placeholder="e.g. TotalEnergies Kitwe" />
            </label>
            <label>
              Receipt No.
              <input value={form.receiptNo} onChange={(event) => setForm({ ...form, receiptNo: event.target.value })} placeholder="FUEL-001" />
            </label>
            <label>
              Calculated Amount
              <input value={formatMoney(estimatedTotal)} readOnly />
            </label>

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Fuel Log'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <h2>Fuel Register</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Fuel</th>
                  <th>Litres</th>
                  <th>Amount</th>
                  <th>Odometer</th>
                  <th>Station</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {!logs.length ? (
                  <tr><td colSpan={8}>No fuel logs found.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDate(log.fuelDate || log.createdAt)}</td>
                      <td>{log.vehicle?.registrationNo || '-'}</td>
                      <td>{log.fuelType || '-'}</td>
                      <td>{log.litres || '0'}</td>
                      <td>{formatMoney(log.amount)}</td>
                      <td>{log.odometer || '-'}</td>
                      <td>{log.stationName || '-'}</td>
                      <td>{log.receiptDocumentId || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

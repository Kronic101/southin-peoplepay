'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetVehicleRecord,
  createFleetVehicle,
  exportFleetCsv,
  getFleetVehicles,
} from '@/lib/fleet-api';

const initialForm = {
  registrationNo: '',
  make: '',
  model: '',
  year: '',
  vehicleType: 'PICKUP',
  department: 'Operations',
  site: 'Kitwe Main Distribution Centre',
  status: 'ACTIVE',
  odometerCurrent: '0',
  insuranceExpiry: '',
  fitnessExpiry: '',
  roadTaxExpiry: '',
  telematicsProvider: '',
  telematicsUnitId: '',
};

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE') return 'status-pill success';
  if (['INACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE'].includes(value)) return 'status-pill warning';
  return 'status-pill';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function FleetVehiclesPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadVehicles() {
    setLoading(true);
    setError('');

    try {
      const result = await getFleetVehicles();
      setVehicles(result || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet vehicles.');
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  const summary = useMemo(() => {
    return {
      total: vehicles.length,
      active: vehicles.filter((vehicle) => String(vehicle.status).toUpperCase() === 'ACTIVE').length,
      maintenance: vehicles.filter((vehicle) => String(vehicle.status).toUpperCase() === 'MAINTENANCE').length,
      telematics: vehicles.filter((vehicle) => vehicle.telematicsProvider || vehicle.telematicsUnitId).length,
    };
  }, [vehicles]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const created = await createFleetVehicle(form);
      setMessage(`Vehicle ${created.registrationNo || form.registrationNo} created successfully.`);
      setForm(initialForm);
      await loadVehicles();
    } catch (err: any) {
      setError(err?.message || 'Unable to create vehicle.');
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-vehicles.csv',
      vehicles.map((vehicle) => ({
        registrationNo: vehicle.registrationNo || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        vehicleType: vehicle.vehicleType || '',
        department: vehicle.department || '',
        site: vehicle.site || '',
        status: vehicle.status || '',
        odometerCurrent: vehicle.odometerCurrent || '',
        insuranceExpiry: vehicle.insuranceExpiry || '',
        fitnessExpiry: vehicle.fitnessExpiry || '',
        roadTaxExpiry: vehicle.roadTaxExpiry || '',
        telematicsProvider: vehicle.telematicsProvider || '',
        telematicsUnitId: vehicle.telematicsUnitId || '',
      })),
    );
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Vehicle Register</h1>
            <p className="muted">
              Master register for Southin vehicles, compliance dates, odometer control and telematics readiness.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/dashboard">Dashboard</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadVehicles}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="summary-grid">
          <div className="leave-summary-card"><span>Total Vehicles</span><strong>{summary.total}</strong></div>
          <div className="leave-summary-card"><span>Active</span><strong>{summary.active}</strong></div>
          <div className="leave-summary-card"><span>Maintenance</span><strong>{summary.maintenance}</strong></div>
          <div className="leave-summary-card"><span>Telematics Ready</span><strong>{summary.telematics}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Create Vehicle</h2>
          <p className="muted">Office-based vehicle registration. Driver field transactions will be captured from Android.</p>

          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Registration No.
              <input value={form.registrationNo} onChange={(event) => setForm({ ...form, registrationNo: event.target.value })} placeholder="e.g. ALB 1234" required />
            </label>
            <label>
              Vehicle Type
              <select value={form.vehicleType} onChange={(event) => setForm({ ...form, vehicleType: event.target.value })}>
                <option value="PICKUP">Pickup</option>
                <option value="TRUCK">Truck</option>
                <option value="BUS">Bus</option>
                <option value="VAN">Van</option>
                <option value="FORKLIFT">Forklift</option>
                <option value="LIGHT_VEHICLE">Light Vehicle</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
            <label>
              Make
              <input value={form.make} onChange={(event) => setForm({ ...form, make: event.target.value })} placeholder="Toyota" />
            </label>
            <label>
              Model
              <input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Hilux" />
            </label>
            <label>
              Year
              <input type="number" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} placeholder="2021" />
            </label>
            <label>
              Current Odometer
              <input type="number" value={form.odometerCurrent} onChange={(event) => setForm({ ...form, odometerCurrent: event.target.value })} />
            </label>
            <label>
              Department
              <input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
            </label>
            <label>
              Site
              <input value={form.site} onChange={(event) => setForm({ ...form, site: event.target.value })} />
            </label>
            <label>
              Insurance Expiry
              <input type="date" value={form.insuranceExpiry} onChange={(event) => setForm({ ...form, insuranceExpiry: event.target.value })} />
            </label>
            <label>
              Fitness Expiry
              <input type="date" value={form.fitnessExpiry} onChange={(event) => setForm({ ...form, fitnessExpiry: event.target.value })} />
            </label>
            <label>
              Road Tax Expiry
              <input type="date" value={form.roadTaxExpiry} onChange={(event) => setForm({ ...form, roadTaxExpiry: event.target.value })} />
            </label>
            <label>
              Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>
            </label>
            <label>
              Telematics Provider
              <input value={form.telematicsProvider} onChange={(event) => setForm({ ...form, telematicsProvider: event.target.value })} placeholder="C-Track, MTN, etc." />
            </label>
            <label>
              Telematics Unit ID
              <input value={form.telematicsUnitId} onChange={(event) => setForm({ ...form, telematicsUnitId: event.target.value })} />
            </label>

            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Vehicle'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <h2>Vehicle Register</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Odometer</th>
                  <th>Insurance</th>
                  <th>Fitness</th>
                  <th>Road Tax</th>
                  <th>Site</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!vehicles.length ? (
                  <tr><td colSpan={9}>No vehicles found.</td></tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>{vehicle.registrationNo || '-'}</td>
                      <td>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</td>
                      <td>{vehicle.vehicleType || '-'}</td>
                      <td>{vehicle.odometerCurrent || '0'}</td>
                      <td>{formatDate(vehicle.insuranceExpiry)}</td>
                      <td>{formatDate(vehicle.fitnessExpiry)}</td>
                      <td>{formatDate(vehicle.roadTaxExpiry)}</td>
                      <td>{vehicle.site || '-'}</td>
                      <td><span className={statusClass(vehicle.status)}>{vehicle.status || '-'}</span></td>
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

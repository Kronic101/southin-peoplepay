'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetDefectRecord,
  FleetVehicleRecord,
  createFleetDefect,
  exportFleetCsv,
  getFleetDefects,
  getFleetVehicles,
  updateFleetDefectStatus,
} from '@/lib/fleet-api';

const initialForm = {
  vehicleId: '',
  title: '',
  description: '',
  severity: 'MEDIUM',
  reportedBy: 'Fleet Manager',
  odometer: '0',
  location: 'Kitwe Main Distribution Centre',
};

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (['CLOSED', 'RESOLVED'].includes(value)) return 'status-pill success';
  if (['OPEN', 'REPORTED', 'IN_PROGRESS'].includes(value)) return 'status-pill warning';
  if (['CRITICAL', 'HIGH'].includes(value)) return 'status-pill danger';
  return 'status-pill';
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FleetDefectsPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleRecord[]>([]);
  const [defects, setDefects] = useState<FleetDefectRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [vehicleResult, defectResult] = await Promise.all([getFleetVehicles(), getFleetDefects()]);
      setVehicles(vehicleResult || []);
      setDefects(defectResult || []);
      setForm((current) => ({ ...current, vehicleId: current.vehicleId || vehicleResult?.[0]?.id || '' }));
    } catch (err: any) {
      setError(err?.message || 'Unable to load defect records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      total: defects.length,
      open: defects.filter((defect) => ['OPEN', 'REPORTED', 'IN_PROGRESS'].includes(String(defect.status).toUpperCase())).length,
      high: defects.filter((defect) => ['HIGH', 'CRITICAL'].includes(String(defect.severity || defect.priority).toUpperCase())).length,
      closed: defects.filter((defect) => ['CLOSED', 'RESOLVED'].includes(String(defect.status).toUpperCase())).length,
    };
  }, [defects]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.vehicleId) throw new Error('Please select a vehicle.');
      const created = await createFleetDefect(form);
      setMessage(`Defect ${created.defectNo || created.title || ''} submitted successfully.`);
      setForm({ ...initialForm, vehicleId: form.vehicleId });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to submit defect.');
    } finally {
      setSaving(false);
    }
  }

  async function handleResolve(defect: FleetDefectRecord) {
    setMessage('');
    setError('');

    try {
      await updateFleetDefectStatus(defect.id, {
        status: 'RESOLVED',
        closedBy: 'Fleet Manager',
        comments: 'Resolved from web portal.',
      });
      setMessage('Defect marked as resolved.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to update defect status.');
    }
  }

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-defects.csv',
      defects.map((defect) => ({
        defectNo: defect.defectNo || '',
        vehicle: defect.vehicle?.registrationNo || '',
        title: defect.title || '',
        description: defect.description || '',
        severity: defect.severity || defect.priority || '',
        status: defect.status || '',
        reportedBy: defect.reportedBy || '',
        reportedAt: defect.reportedAt || defect.createdAt || '',
        odometer: defect.odometer || '',
        location: defect.location || '',
      })),
    );
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Defect Reports</h1>
            <p className="muted">Control reported vehicle defects, severity, status and workshop escalation readiness.</p>
          </div>
          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/workshop">Workshop</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Defects</span><strong>{summary.total}</strong></div>
          <div className="finance-summary-card"><span>Open</span><strong>{summary.open}</strong></div>
          <div className="finance-summary-card"><span>High / Critical</span><strong>{summary.high}</strong></div>
          <div className="finance-summary-card"><span>Closed</span><strong>{summary.closed}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Raise Defect</h2>
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
              Severity
              <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Brake warning light" required />
            </label>
            <label>
              Odometer
              <input type="number" value={form.odometer} onChange={(event) => setForm({ ...form, odometer: event.target.value })} />
            </label>
            <label>
              Reported By
              <input value={form.reportedBy} onChange={(event) => setForm({ ...form, reportedBy: event.target.value })} />
            </label>
            <label>
              Location
              <input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            </label>
            <label className="span-2">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the defect and any safety risk." />
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Defect'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <h2>Defect Register</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Defect No.</th>
                  <th>Vehicle</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Reported By</th>
                  <th>Reported</th>
                  <th>Odometer</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!defects.length ? (
                  <tr><td colSpan={9}>No defects found.</td></tr>
                ) : (
                  defects.map((defect) => (
                    <tr key={defect.id}>
                      <td>{defect.defectNo || '-'}</td>
                      <td>{defect.vehicle?.registrationNo || '-'}</td>
                      <td>{defect.title || defect.description || '-'}</td>
                      <td><span className={statusClass(defect.severity || defect.priority)}>{defect.severity || defect.priority || '-'}</span></td>
                      <td><span className={statusClass(defect.status)}>{defect.status || '-'}</span></td>
                      <td>{defect.reportedBy || '-'}</td>
                      <td>{formatDate(defect.reportedAt || defect.createdAt)}</td>
                      <td>{defect.odometer || '-'}</td>
                      <td>
                        {['CLOSED', 'RESOLVED'].includes(String(defect.status).toUpperCase()) ? (
                          <span className="status-pill success">Complete</span>
                        ) : (
                          <button className="btn-secondary" type="button" onClick={() => handleResolve(defect)}>Resolve</button>
                        )}
                      </td>
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

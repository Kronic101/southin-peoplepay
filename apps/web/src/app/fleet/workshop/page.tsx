'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetVehicleRecord,
  FleetWorkshopJobRecord,
  closeFleetWorkshopJob,
  createFleetWorkshopJob,
  exportFleetCsv,
  getFleetVehicles,
  getFleetWorkshopJobs,
  updateFleetWorkshopJobStatus,
} from '@/lib/fleet-api';

const initialForm = {
  vehicleId: '',
  title: '',
  description: '',
  jobType: 'REPAIR',
  priority: 'MEDIUM',
  openedBy: 'Fleet Manager',
  odometer: '0',
  estimatedCost: '0',
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
  return date.toLocaleString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (['CLOSED', 'COMPLETED', 'RELEASED'].includes(value)) return 'status-pill success';
  if (['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'APPROVED'].includes(value)) return 'status-pill warning';
  return 'status-pill';
}

export default function FleetWorkshopPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleRecord[]>([]);
  const [jobs, setJobs] = useState<FleetWorkshopJobRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [vehicleResult, jobResult] = await Promise.all([getFleetVehicles(), getFleetWorkshopJobs()]);
      setVehicles(vehicleResult || []);
      setJobs(jobResult || []);
      setForm((current) => ({ ...current, vehicleId: current.vehicleId || vehicleResult?.[0]?.id || '' }));
    } catch (err: any) {
      setError(err?.message || 'Unable to load workshop jobs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      total: jobs.length,
      open: jobs.filter((job) => ['OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'APPROVED'].includes(String(job.status).toUpperCase())).length,
      closed: jobs.filter((job) => ['CLOSED', 'COMPLETED', 'RELEASED'].includes(String(job.status).toUpperCase())).length,
      estimatedCost: jobs.reduce((sum, job) => sum + asNumber(job.estimatedCost), 0),
    };
  }, [jobs]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.vehicleId) throw new Error('Please select a vehicle.');
      const created = await createFleetWorkshopJob(form);
      setMessage(`Workshop job ${created.jobCardNo || ''} created successfully.`);
      setForm({ ...initialForm, vehicleId: form.vehicleId });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to create workshop job.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStartJob(job: FleetWorkshopJobRecord) {
    try {
      await updateFleetWorkshopJobStatus(job.id, {
        status: 'IN_PROGRESS',
        updatedBy: 'Fleet Manager',
        comments: 'Job started from web portal.',
      });
      setMessage('Workshop job moved to in progress.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to update workshop job.');
    }
  }

  async function handleCloseJob(job: FleetWorkshopJobRecord) {
    const actualCost = window.prompt('Enter actual cost:', String(job.actualCost || job.estimatedCost || '0'));
    if (actualCost === null) return;

    try {
      await closeFleetWorkshopJob(job.id, {
        closedBy: 'Fleet Manager',
        actualCost,
        workDone: 'Job closed from web portal.',
      });
      setMessage('Workshop job closed successfully.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to close workshop job.');
    }
  }

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-workshop-jobs.csv',
      jobs.map((job) => ({
        jobCardNo: job.jobCardNo || '',
        registrationNo: job.vehicle?.registrationNo || '',
        title: job.title || '',
        jobType: job.jobType || '',
        priority: job.priority || '',
        status: job.status || '',
        openedBy: job.openedBy || '',
        openedAt: job.openedAt || '',
        estimatedCost: job.estimatedCost || '',
        actualCost: job.actualCost || '',
        closedAt: job.closedAt || '',
      })),
    );
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Workshop Jobs</h1>
            <p className="muted">Fleet workshop control for repairs, service jobs, approvals, cost estimates and close-out.</p>
          </div>
          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/defects">Defects</Link>
            <Link className="btn-secondary" href="/fleet/reports">Reports</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="summary-grid">
          <div className="leave-summary-card"><span>Total Jobs</span><strong>{summary.total}</strong></div>
          <div className="leave-summary-card"><span>Open Jobs</span><strong>{summary.open}</strong></div>
          <div className="leave-summary-card"><span>Closed Jobs</span><strong>{summary.closed}</strong></div>
          <div className="leave-summary-card"><span>Estimated Cost</span><strong>{formatMoney(summary.estimatedCost)}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Create Workshop Job</h2>
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
              Job Type
              <select value={form.jobType} onChange={(event) => setForm({ ...form, jobType: event.target.value })}>
                <option value="REPAIR">Repair</option>
                <option value="SERVICE">Service</option>
                <option value="INSPECTION">Inspection</option>
                <option value="TYRE">Tyre</option>
                <option value="BODYWORK">Bodywork</option>
              </select>
            </label>
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Brake system inspection" required />
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </label>
            <label>
              Opened By
              <input value={form.openedBy} onChange={(event) => setForm({ ...form, openedBy: event.target.value })} />
            </label>
            <label>
              Odometer
              <input type="number" value={form.odometer} onChange={(event) => setForm({ ...form, odometer: event.target.value })} />
            </label>
            <label>
              Estimated Cost
              <input type="number" value={form.estimatedCost} onChange={(event) => setForm({ ...form, estimatedCost: event.target.value })} />
            </label>
            <label className="span-2">
              Description
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the work required." />
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Workshop Job'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <h2>Workshop Register</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Job Card</th>
                  <th>Vehicle</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Estimate</th>
                  <th>Actual</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!jobs.length ? (
                  <tr><td colSpan={10}>No workshop jobs found.</td></tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td>{job.jobCardNo || '-'}</td>
                      <td>{job.vehicle?.registrationNo || '-'}</td>
                      <td>{job.title || '-'}</td>
                      <td>{job.jobType || '-'}</td>
                      <td>{job.priority || '-'}</td>
                      <td><span className={statusClass(job.status)}>{job.status || '-'}</span></td>
                      <td>{formatDate(job.openedAt || job.createdAt)}</td>
                      <td>{formatMoney(job.estimatedCost)}</td>
                      <td>{formatMoney(job.actualCost)}</td>
                      <td>
                        {String(job.status).toUpperCase() === 'OPEN' ? (
                          <button className="btn-secondary" type="button" onClick={() => handleStartJob(job)}>Start</button>
                        ) : ['CLOSED', 'COMPLETED', 'RELEASED'].includes(String(job.status).toUpperCase()) ? (
                          <span className="status-pill success">Complete</span>
                        ) : (
                          <button className="btn-secondary" type="button" onClick={() => handleCloseJob(job)}>Close</button>
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

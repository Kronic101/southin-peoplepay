'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetTripRecord,
  FleetVehicleRecord,
  closeFleetTrip,
  createFleetTrip,
  exportFleetCsv,
  getFleetTrips,
  getFleetVehicles,
} from '@/lib/fleet-api';

const initialForm = {
  vehicleId: '',
  tripDate: new Date().toISOString().slice(0, 10),
  driverName: '',
  purpose: '',
  origin: 'Kitwe Main Distribution Centre',
  destination: '',
  openingOdometer: '0',
  notes: '',
};

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-ZM', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (['COMPLETED', 'CLOSED'].includes(value)) return 'status-pill success';
  if (['OPEN', 'PLANNED', 'IN_PROGRESS'].includes(value)) return 'status-pill warning';
  return 'status-pill';
}

export default function FleetTripsPage() {
  const [vehicles, setVehicles] = useState<FleetVehicleRecord[]>([]);
  const [trips, setTrips] = useState<FleetTripRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [vehicleResult, tripResult] = await Promise.all([getFleetVehicles(), getFleetTrips()]);
      setVehicles(vehicleResult || []);
      setTrips(tripResult || []);
      setForm((current) => ({ ...current, vehicleId: current.vehicleId || vehicleResult?.[0]?.id || '' }));
    } catch (err: any) {
      setError(err?.message || 'Unable to load trips.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      total: trips.length,
      open: trips.filter((trip) => ['OPEN', 'PLANNED', 'IN_PROGRESS'].includes(String(trip.status).toUpperCase())).length,
      closed: trips.filter((trip) => ['CLOSED', 'COMPLETED'].includes(String(trip.status).toUpperCase())).length,
      distance: trips.reduce((sum, trip) => sum + asNumber(trip.distanceKm), 0),
    };
  }, [trips]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (!form.vehicleId) throw new Error('Please select a vehicle.');
      const created = await createFleetTrip(form);
      setMessage(`Trip ${created.tripNo || ''} created successfully.`);
      setForm({ ...initialForm, vehicleId: form.vehicleId });
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to create trip.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseTrip(trip: FleetTripRecord) {
    const closingOdometer = window.prompt('Enter closing odometer:', String(trip.closingOdometer || ''));
    if (!closingOdometer) return;

    setError('');
    setMessage('');

    try {
      const updated = await closeFleetTrip(trip.id, {
        closingOdometer,
        closedBy: 'Fleet Manager',
        notes: 'Trip closed from web portal.',
      });
      setMessage(`Trip ${updated.tripNo || ''} closed successfully.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to close trip.');
    }
  }

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-trips.csv',
      trips.map((trip) => ({
        tripNo: trip.tripNo || '',
        tripDate: trip.tripDate || '',
        registrationNo: trip.vehicle?.registrationNo || '',
        driverName: trip.driverName || '',
        purpose: trip.purpose || '',
        origin: trip.origin || '',
        destination: trip.destination || '',
        openingOdometer: trip.openingOdometer || '',
        closingOdometer: trip.closingOdometer || '',
        distanceKm: trip.distanceKm || '',
        status: trip.status || '',
        notes: trip.notes || '',
      })),
    );
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Trips</h1>
            <p className="muted">Trip planning and route tracking for dispatch control. Field trip capture will later move to Android.</p>
          </div>
          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/dashboard">Dashboard</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Trips</span><strong>{summary.total}</strong></div>
          <div className="finance-summary-card"><span>Open / Planned</span><strong>{summary.open}</strong></div>
          <div className="finance-summary-card"><span>Closed</span><strong>{summary.closed}</strong></div>
          <div className="finance-summary-card"><span>Total KM</span><strong>{summary.distance.toFixed(2)}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Create Trip</h2>
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
              Trip Date
              <input type="date" value={form.tripDate} onChange={(event) => setForm({ ...form, tripDate: event.target.value })} />
            </label>
            <label>
              Driver Name
              <input value={form.driverName} onChange={(event) => setForm({ ...form, driverName: event.target.value })} placeholder="Fleet Driver" />
            </label>
            <label>
              Purpose
              <input value={form.purpose} onChange={(event) => setForm({ ...form, purpose: event.target.value })} placeholder="Site delivery, inspection, staff movement" />
            </label>
            <label>
              Origin
              <input value={form.origin} onChange={(event) => setForm({ ...form, origin: event.target.value })} />
            </label>
            <label>
              Destination
              <input value={form.destination} onChange={(event) => setForm({ ...form, destination: event.target.value })} />
            </label>
            <label>
              Opening Odometer
              <input type="number" value={form.openingOdometer} onChange={(event) => setForm({ ...form, openingOdometer: event.target.value })} />
            </label>
            <label>
              Notes
              <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="btn" type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Trip'}</button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <h2>Trip Register</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Trip No.</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Purpose</th>
                  <th>Route</th>
                  <th>Odometer</th>
                  <th>Distance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {!trips.length ? (
                  <tr><td colSpan={10}>No trips found.</td></tr>
                ) : (
                  trips.map((trip) => (
                    <tr key={trip.id}>
                      <td>{trip.tripNo || '-'}</td>
                      <td>{formatDate(trip.tripDate)}</td>
                      <td>{trip.vehicle?.registrationNo || '-'}</td>
                      <td>{trip.driverName || '-'}</td>
                      <td>{trip.purpose || '-'}</td>
                      <td>{trip.origin || '-'} → {trip.destination || '-'}</td>
                      <td>{trip.openingOdometer || '-'} / {trip.closingOdometer || '-'}</td>
                      <td>{trip.distanceKm || '-'}</td>
                      <td><span className={statusClass(trip.status)}>{trip.status || '-'}</span></td>
                      <td>
                        {['OPEN', 'PLANNED', 'IN_PROGRESS'].includes(String(trip.status).toUpperCase()) ? (
                          <button className="btn-secondary" type="button" onClick={() => handleCloseTrip(trip)}>Close</button>
                        ) : (
                          <span className="status-pill success">Complete</span>
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

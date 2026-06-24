'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { FleetDashboardResponse, getFleetDashboard } from '@/lib/fleet-api';

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
  if (['ACTIVE', 'COMPLETED', 'CLOSED', 'RESOLVED'].includes(value)) return 'status-pill success';
  if (['OPEN', 'REPORTED', 'IN_PROGRESS', 'OVERDUE', 'WAITING_PARTS'].includes(value)) return 'status-pill warning';
  if (['DAMAGED', 'FAILED', 'REJECTED'].includes(value)) return 'status-pill danger';
  return 'status-pill';
}

export default function FleetDashboardPage() {
  const [data, setData] = useState<FleetDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const result = await getFleetDashboard();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet dashboard.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    return {
      vehicles: asNumber(data?.summary?.vehicles),
      activeVehicles: asNumber(data?.summary?.activeVehicles),
      drivers: asNumber(data?.summary?.drivers),
      activeAssignments: asNumber(data?.summary?.activeAssignments),
      openDueItems: asNumber(data?.summary?.openDueItems),
      overdueDueItems: asNumber(data?.summary?.overdueDueItems),
      inspections: asNumber(data?.summary?.inspections),
      defects: asNumber(data?.summary?.defects),
      openDefects: asNumber(data?.summary?.openDefects),
      trips: asNumber(data?.summary?.trips),
      fuelLogs: asNumber(data?.summary?.fuelLogs),
      workshopJobs: asNumber(data?.summary?.workshopJobs),
      openWorkshopJobs: asNumber(data?.summary?.openWorkshopJobs),
    };
  }, [data]);

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Dashboard</h1>
            <p className="muted">
              International fleet control centre for vehicles, trips, defects, fuel, workshop jobs,
              compliance reminders and cost visibility.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/vehicles">Vehicles</Link>
            <Link className="btn-secondary" href="/fleet/reports">Reports</Link>
            <button className="btn-secondary" type="button" onClick={loadDashboard}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Vehicles</span><strong>{summary.vehicles}</strong></div>
          <div className="finance-summary-card"><span>Active Vehicles</span><strong>{summary.activeVehicles}</strong></div>
          <div className="finance-summary-card"><span>Drivers</span><strong>{summary.drivers}</strong></div>
          <div className="finance-summary-card"><span>Active Assignments</span><strong>{summary.activeAssignments}</strong></div>
          <div className="finance-summary-card"><span>Open Due Items</span><strong>{summary.openDueItems}</strong></div>
          <div className="finance-summary-card"><span>Overdue Items</span><strong>{summary.overdueDueItems}</strong></div>
          <div className="finance-summary-card"><span>Inspections</span><strong>{summary.inspections}</strong></div>
          <div className="finance-summary-card"><span>Open Defects</span><strong>{summary.openDefects}</strong></div>
          <div className="finance-summary-card"><span>Trips</span><strong>{summary.trips}</strong></div>
          <div className="finance-summary-card"><span>Fuel Logs</span><strong>{summary.fuelLogs}</strong></div>
          <div className="finance-summary-card"><span>Workshop Jobs</span><strong>{summary.workshopJobs}</strong></div>
          <div className="finance-summary-card"><span>Open Workshop</span><strong>{summary.openWorkshopJobs}</strong></div>
        </div>

        <section className="finance-dashboard-grid">
          <div className="finance-card">
            <div className="section-heading-row">
              <div>
                <h2>Recent Vehicles</h2>
                <p className="muted">Fleet master register summary.</p>
              </div>
              <Link className="btn-secondary" href="/fleet/vehicles">Open Register</Link>
            </div>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Site</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.recentVehicles?.length ? (
                    <tr><td colSpan={5}>No vehicles found.</td></tr>
                  ) : (
                    data.recentVehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td>{vehicle.registrationNo || '-'}</td>
                        <td>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</td>
                        <td>{vehicle.vehicleType || '-'}</td>
                        <td>{vehicle.site || '-'}</td>
                        <td><span className={statusClass(vehicle.status)}>{vehicle.status || '-'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="finance-card">
            <div className="section-heading-row">
              <div>
                <h2>Open Defects</h2>
                <p className="muted">Recent issues requiring fleet attention.</p>
              </div>
              <Link className="btn-secondary" href="/fleet/defects">View Defects</Link>
            </div>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Defect</th>
                    <th>Severity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!data?.recentDefects?.length ? (
                    <tr><td colSpan={4}>No recent defects found.</td></tr>
                  ) : (
                    data.recentDefects.map((defect) => (
                      <tr key={defect.id}>
                        <td>{defect.vehicle?.registrationNo || '-'}</td>
                        <td>{defect.title || defect.description || '-'}</td>
                        <td>{defect.severity || defect.priority || '-'}</td>
                        <td><span className={statusClass(defect.status)}>{defect.status || '-'}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Compliance and Due Items</h2>
              <p className="muted">Service, road tax, insurance, fitness and other scheduled controls.</p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Due Type</th>
                  <th>Title</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {!data?.recentDueItems?.length ? (
                  <tr><td colSpan={6}>No due items found.</td></tr>
                ) : (
                  data.recentDueItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.vehicle?.registrationNo || '-'}</td>
                      <td>{item.dueType || '-'}</td>
                      <td>{item.title || '-'}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>{item.priority || '-'}</td>
                      <td><span className={statusClass(item.status)}>{item.status || '-'}</span></td>
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

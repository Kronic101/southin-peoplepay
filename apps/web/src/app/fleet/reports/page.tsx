'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  FleetCostByVehicleRecord,
  FleetReportSummary,
  exportFleetCsv,
  getFleetCostsByVehicle,
  getFleetReportSummary,
} from '@/lib/fleet-api';

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

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE') return 'status-pill success';
  if (['MAINTENANCE', 'INACTIVE', 'OUT_OF_SERVICE'].includes(value)) return 'status-pill warning';
  return 'status-pill';
}

export default function FleetReportsPage() {
  const [summary, setSummary] = useState<FleetReportSummary>({});
  const [costs, setCosts] = useState<FleetCostByVehicleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadReports() {
    setLoading(true);
    setError('');

    try {
      const [summaryResult, costResult] = await Promise.all([
        getFleetReportSummary(),
        getFleetCostsByVehicle(),
      ]);

      setSummary(summaryResult?.summary || {});
      setCosts(costResult || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet reports.');
      setSummary({});
      setCosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const totals = useMemo(() => {
    return {
      fuel: costs.reduce((sum, row) => sum + asNumber(row.fuelCost), 0),
      workshop: costs.reduce((sum, row) => sum + asNumber(row.workshopCost), 0),
      total: costs.reduce((sum, row) => sum + asNumber(row.totalCost), 0),
    };
  }, [costs]);

  function handleExportCsv() {
    exportFleetCsv(
      'southin-fleet-costs-by-vehicle.csv',
      costs.map((row) => ({
        registrationNo: row.registrationNo || '',
        make: row.make || '',
        model: row.model || '',
        status: row.status || '',
        fuelLogs: row.fuelLogs || 0,
        workshopJobs: row.workshopJobs || 0,
        defects: row.defects || 0,
        trips: row.trips || 0,
        fuelCost: row.fuelCost || 0,
        workshopCost: row.workshopCost || 0,
        totalCost: row.totalCost || 0,
      })),
    );
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Reports & Costing</h1>
            <p className="muted">
              Finance and Director visibility for fuel cost, workshop cost, defect load, trip activity and vehicle-level costing.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/dashboard">Dashboard</Link>
            <button className="btn-secondary" type="button" onClick={handleExportCsv}>Export CSV</button>
            <button className="btn-secondary" type="button" onClick={loadReports}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <div className="summary-grid">
          <div className="leave-summary-card"><span>Vehicles</span><strong>{asNumber(summary.vehicles)}</strong></div>
          <div className="leave-summary-card"><span>Active Vehicles</span><strong>{asNumber(summary.activeVehicles)}</strong></div>
          <div className="leave-summary-card"><span>Defects</span><strong>{asNumber(summary.defects)}</strong></div>
          <div className="leave-summary-card"><span>Open Defects</span><strong>{asNumber(summary.openDefects)}</strong></div>
          <div className="leave-summary-card"><span>Trips</span><strong>{asNumber(summary.trips)}</strong></div>
          <div className="leave-summary-card"><span>Fuel Logs</span><strong>{asNumber(summary.fuelLogs)}</strong></div>
          <div className="leave-summary-card"><span>Workshop Jobs</span><strong>{asNumber(summary.workshopJobs)}</strong></div>
          <div className="leave-summary-card"><span>Open Workshop</span><strong>{asNumber(summary.openWorkshopJobs)}</strong></div>
          <div className="leave-summary-card"><span>Fuel Cost</span><strong>{formatMoney(summary.totalFuelCost || totals.fuel)}</strong></div>
          <div className="leave-summary-card"><span>Workshop Cost</span><strong>{formatMoney(summary.totalWorkshopCost || totals.workshop)}</strong></div>
          <div className="leave-summary-card"><span>Total Fleet Cost</span><strong>{formatMoney(summary.totalFleetCost || totals.total)}</strong></div>
        </div>

        <section className="finance-dashboard-grid">
          <div className="finance-card">
            <h2>Cost Control Position</h2>
            <p className="muted">
              Fleet costs shown here should be reviewed by Finance before monthly reporting. Fuel and workshop costs can later post into the Finance module as approved operating costs.
            </p>
            <div className="notice">
              Recommended control: driver submits on Android → Fleet Manager verifies → Finance reviews costs → Director dashboard receives monthly cost view.
            </div>
          </div>

          <div className="finance-card">
            <h2>Integration with Asset & Finance</h2>
            <p className="muted">
              Vehicles can remain linked to Asset Management for asset register control, while fuel and workshop costs are consumed by Finance for costing, evidence and reporting.
            </p>
            <div className="action-row">
              <Link className="btn-secondary" href="/assets/dashboard">Asset Dashboard</Link>
              <Link className="btn-secondary" href="/finance/dashboard">Finance Dashboard</Link>
            </div>
          </div>
        </section>

        <div className="finance-card">
          <h2>Costs by Vehicle</h2>
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Fuel Logs</th>
                  <th>Workshop Jobs</th>
                  <th>Defects</th>
                  <th>Trips</th>
                  <th>Fuel Cost</th>
                  <th>Workshop Cost</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {!costs.length ? (
                  <tr><td colSpan={10}>No vehicle cost records found.</td></tr>
                ) : (
                  costs.map((row) => (
                    <tr key={row.vehicleId}>
                      <td>{row.registrationNo || '-'}</td>
                      <td>{[row.make, row.model].filter(Boolean).join(' ') || '-'}</td>
                      <td><span className={statusClass(row.status)}>{row.status || '-'}</span></td>
                      <td>{row.fuelLogs || 0}</td>
                      <td>{row.workshopJobs || 0}</td>
                      <td>{row.defects || 0}</td>
                      <td>{row.trips || 0}</td>
                      <td>{formatMoney(row.fuelCost)}</td>
                      <td>{formatMoney(row.workshopCost)}</td>
                      <td><strong>{formatMoney(row.totalCost)}</strong></td>
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

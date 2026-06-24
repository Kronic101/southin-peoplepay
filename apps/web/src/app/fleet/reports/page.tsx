'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  exportFleetCsv,
  financeReviewFleetCost,
  FleetCostByVehicleRecord,
  FleetCostPostingRecord,
  FleetReportSummary,
  getFleetCostsByVehicle,
  getFleetReportSummary,
  getPendingFleetCosts,
  getPostedFleetCosts,
  postFleetCostToFinance,
} from '@/lib/fleet-api';

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    maximumFractionDigits: 2,
  }).format(asNumber(value));
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['POSTED_TO_FINANCE', 'APPROVED_FOR_FINANCE', 'POSTED', 'APPROVED', 'PAID'].includes(value)) {
    return 'status-pill success';
  }

  if (['PENDING_FINANCE_REVIEW', 'PENDING', 'OPEN', 'IN_PROGRESS', 'WAITING_PARTS'].includes(value)) {
    return 'status-pill warning';
  }

  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

function readableStatus(status?: string | null) {
  return String(status || '-').replaceAll('_', ' ');
}

function sourceLabel(sourceType?: string | null) {
  const value = String(sourceType || '').toUpperCase();

  if (value === 'FUEL_LOG') return 'Fuel Log';
  if (value === 'WORKSHOP_JOB') return 'Workshop Job';
  if (value === 'DEFECT') return 'Defect';
  if (value === 'TRIP') return 'Trip';

  return sourceType || '-';
}

const emptySummary: FleetReportSummary = {
  vehicles: 0,
  activeVehicles: 0,
  defects: 0,
  openDefects: 0,
  trips: 0,
  fuelLogs: 0,
  workshopJobs: 0,
  openWorkshopJobs: 0,
  totalFuelCost: 0,
  totalWorkshopCost: 0,
  totalFleetCost: 0,
};

export default function FleetReportsPage() {
  const [summary, setSummary] = useState<FleetReportSummary>(emptySummary);
  const [costsByVehicle, setCostsByVehicle] = useState<FleetCostByVehicleRecord[]>([]);
  const [pendingCosts, setPendingCosts] = useState<FleetCostPostingRecord[]>([]);
  const [postedCosts, setPostedCosts] = useState<FleetCostPostingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadReports() {
    setLoading(true);
    setError('');

    try {
      const [summaryResponse, vehicleCosts, pending, posted] = await Promise.all([
        getFleetReportSummary(),
        getFleetCostsByVehicle(),
        getPendingFleetCosts(),
        getPostedFleetCosts(),
      ]);

      setSummary(summaryResponse?.summary || emptySummary);
      setCostsByVehicle(vehicleCosts || []);
      setPendingCosts(pending || []);
      setPostedCosts(posted || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const pendingTotal = useMemo(() => {
    return pendingCosts.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }, [pendingCosts]);

  const postedTotal = useMemo(() => {
    return postedCosts.reduce((sum, row) => sum + asNumber(row.amount), 0);
  }, [postedCosts]);

  async function handleFinanceReview(cost: FleetCostPostingRecord, decision: 'APPROVED' | 'REJECTED') {
    const comments =
      decision === 'REJECTED'
        ? window.prompt('Enter rejection reason:', 'Rejected by Finance.')
        : window.prompt('Enter finance review comment:', 'Fleet cost verified.');

    if (comments === null) {
      return;
    }

    setActionLoadingId(cost.id);
    setError('');
    setMessage('');

    try {
      const updated = await financeReviewFleetCost(cost.id, {
        decision,
        reviewedBy: 'Finance Manager',
        comments,
        rejectionReason: decision === 'REJECTED' ? comments : undefined,
      });

      setPendingCosts((current) =>
        current.map((item) => (item.id === cost.id ? updated : item)),
      );

      setMessage(
        decision === 'APPROVED'
          ? `Fleet cost ${cost.costNo || ''} approved for Finance.`
          : `Fleet cost ${cost.costNo || ''} rejected by Finance.`,
      );

      await loadReports();
    } catch (err: any) {
      setError(err?.message || 'Unable to complete finance review.');
    } finally {
      setActionLoadingId('');
    }
  }

  async function handlePostToFinance(cost: FleetCostPostingRecord) {
    const confirmed = window.confirm(
      `Post ${cost.costNo || 'this fleet cost'} to Finance?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoadingId(cost.id);
    setError('');
    setMessage('');

    try {
      await postFleetCostToFinance(cost.id, {
        postedBy: 'Finance Manager',
        comments: 'Posted to monthly fleet cost review.',
      });

      setMessage(`Fleet cost ${cost.costNo || ''} posted to Finance.`);
      await loadReports();
    } catch (err: any) {
      setError(err?.message || 'Unable to post fleet cost to Finance.');
    } finally {
      setActionLoadingId('');
    }
  }

  function handleExportCostSummary() {
    const rows = costsByVehicle.map((row) => ({
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
    }));

    exportFleetCsv('southin-fleet-costs-by-vehicle.csv', rows);
  }

  function handleExportFleetCosts() {
    const allCosts = [...pendingCosts, ...postedCosts];

    const rows = allCosts.map((row) => ({
      costNo: row.costNo || '',
      sourceType: row.sourceType || '',
      vehicleRegistration: row.vehicleRegistration || row.vehicle?.registrationNo || '',
      category: row.category || '',
      description: row.description || '',
      amount: row.amount || 0,
      costDate: row.costDate || '',
      month: row.month || '',
      department: row.department || '',
      site: row.site || '',
      status: row.status || '',
      postedBy: row.postedBy || '',
      postedAt: row.postedAt || '',
      financeExpenseId: row.financeExpenseId || '',
      rejectionReason: row.rejectionReason || '',
    }));

    exportFleetCsv('southin-fleet-cost-postings.csv', rows);
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Reports & Costing</h1>
            <p className="muted">
              Finance and Director visibility for fuel cost, workshop cost, defect load, trip
              activity and vehicle-level operating cost.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/dashboard">
              Dashboard
            </Link>

            <button className="btn-secondary" type="button" onClick={handleExportFleetCosts}>
              Export Costs CSV
            </button>

            <button className="btn-secondary" type="button" onClick={handleExportCostSummary}>
              Export Vehicle CSV
            </button>

            <button className="btn-secondary" type="button" onClick={loadReports}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Vehicles</span>
            <strong>{summary.vehicles || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Active Vehicles</span>
            <strong>{summary.activeVehicles || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Defects</span>
            <strong>{summary.defects || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Open Defects</span>
            <strong>{summary.openDefects || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Trips</span>
            <strong>{summary.trips || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Fuel Logs</span>
            <strong>{summary.fuelLogs || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Workshop Jobs</span>
            <strong>{summary.workshopJobs || 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Pending Finance Review</span>
            <strong>{pendingCosts.length}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Pending Fleet Cost</span>
            <strong>{money(pendingTotal)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Posted Fleet Cost</span>
            <strong>{money(postedTotal)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Total Fuel Cost</span>
            <strong>{money(summary.totalFuelCost)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Total Workshop Cost</span>
            <strong>{money(summary.totalWorkshopCost)}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Total Fleet Cost</span>
            <strong>{money(summary.totalFleetCost)}</strong>
          </div>
        </div>

        <section className="finance-dashboard-grid">
          <div className="finance-card">
            <h2>Cost Control Position</h2>
            <p className="muted">
              Fuel and workshop costs are captured by Fleet, reviewed by Finance, and posted into the
              monthly cost control process.
            </p>

            <div className="notice">
              Recommended control: Driver submits from Android → Fleet Manager verifies → Finance
              reviews and posts → Director sees monthly summary.
            </div>
          </div>

          <div className="finance-card">
            <h2>Integration with Asset & Finance</h2>
            <p className="muted">
              Vehicles remain linked to Asset Management for asset register control. Fuel and workshop
              costs are consumed by Finance for cost visibility, payment evidence and reporting.
            </p>

            <div className="action-row">
              <Link className="btn-secondary" href="/assets/dashboard">
                Asset Dashboard
              </Link>

              <Link className="btn-secondary" href="/finance/dashboard">
                Finance Dashboard
              </Link>
            </div>
          </div>
        </section>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Finance Review Queue</h2>
              <p className="muted">
                Pending fleet costs awaiting Finance verification before monthly posting.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={loadReports}>
              Refresh Queue
            </button>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Cost No.</th>
                  <th>Source</th>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Month</th>
                  <th>Status</th>
                  <th>Finance Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingCosts.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No pending fleet costs found.</td>
                  </tr>
                ) : (
                  pendingCosts.map((cost) => (
                    <tr key={cost.id}>
                      <td>{cost.costNo || '-'}</td>
                      <td>{sourceLabel(cost.sourceType)}</td>
                      <td>{cost.vehicleRegistration || cost.vehicle?.registrationNo || '-'}</td>
                      <td>{cost.category || '-'}</td>
                      <td>{cost.description || '-'}</td>
                      <td>{money(cost.amount)}</td>
                      <td>{cost.month || '-'}</td>
                      <td>
                        <span className={statusClass(cost.status)}>
                          {readableStatus(cost.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-row">
                          {cost.status === 'PENDING_FINANCE_REVIEW' ? (
                            <>
                              <button
                                className="btn-secondary"
                                type="button"
                                disabled={actionLoadingId === cost.id}
                                onClick={() => handleFinanceReview(cost, 'APPROVED')}
                              >
                                Approve
                              </button>

                              <button
                                className="btn-secondary"
                                type="button"
                                disabled={actionLoadingId === cost.id}
                                onClick={() => handleFinanceReview(cost, 'REJECTED')}
                              >
                                Reject
                              </button>
                            </>
                          ) : null}

                          {cost.status === 'APPROVED_FOR_FINANCE' ? (
                            <button
                              className="btn"
                              type="button"
                              disabled={actionLoadingId === cost.id}
                              onClick={() => handlePostToFinance(cost)}
                            >
                              Post to Finance
                            </button>
                          ) : null}

                          {cost.status === 'REJECTED' ? (
                            <span className="status-pill danger">Rejected</span>
                          ) : null}
                        </div>
                      </td>
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
              <h2>Posted Fleet Costs</h2>
              <p className="muted">
                Fleet costs already posted to Finance for monthly review and reporting.
              </p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Cost No.</th>
                  <th>Source</th>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Posted By</th>
                  <th>Posted Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {postedCosts.length === 0 ? (
                  <tr>
                    <td colSpan={9}>No posted fleet costs found.</td>
                  </tr>
                ) : (
                  postedCosts.map((cost) => (
                    <tr key={cost.id}>
                      <td>{cost.costNo || '-'}</td>
                      <td>{sourceLabel(cost.sourceType)}</td>
                      <td>{cost.vehicleRegistration || cost.vehicle?.registrationNo || '-'}</td>
                      <td>{cost.category || '-'}</td>
                      <td>{cost.description || '-'}</td>
                      <td>{money(cost.amount)}</td>
                      <td>{cost.postedBy || '-'}</td>
                      <td>{formatDateTime(cost.postedAt)}</td>
                      <td>
                        <span className={statusClass(cost.status)}>
                          {readableStatus(cost.status)}
                        </span>
                      </td>
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
              <h2>Costs by Vehicle</h2>
              <p className="muted">
                Vehicle-level costing view for Finance and Director oversight.
              </p>
            </div>
          </div>

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
                {costsByVehicle.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No vehicle cost records found.</td>
                  </tr>
                ) : (
                  costsByVehicle.map((row) => (
                    <tr key={row.vehicleId}>
                      <td>{row.registrationNo || '-'}</td>
                      <td>{[row.make, row.model].filter(Boolean).join(' ') || '-'}</td>
                      <td>
                        <span className={statusClass(row.status)}>{row.status || '-'}</span>
                      </td>
                      <td>{row.fuelLogs || 0}</td>
                      <td>{row.workshopJobs || 0}</td>
                      <td>{row.defects || 0}</td>
                      <td>{row.trips || 0}</td>
                      <td>{money(row.fuelCost)}</td>
                      <td>{money(row.workshopCost)}</td>
                      <td>
                        <strong>{money(row.totalCost)}</strong>
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
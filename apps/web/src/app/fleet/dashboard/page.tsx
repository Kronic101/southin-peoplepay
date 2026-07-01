'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { getFleetDashboard } from '@/lib/fleet-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type ApprovalWorkflowRecord = Record<string, any>;

async function apiJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed: ${path}`);
  }

  return data as T;
}

async function getApprovalWorkflows(): Promise<ApprovalWorkflowRecord[]> {
  const data: any = await apiJson('/approvals/workflows');
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.workflows)) return data.workflows;
  return [];
}

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `K ${asNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();

  if (['ACTIVE', 'COMPLETED', 'CLOSED', 'RESOLVED', 'APPROVED', 'POSTED', 'POSTED_TO_FINANCE'].includes(value)) {
    return 'status-pill success';
  }

  if (
    [
      'OPEN',
      'REPORTED',
      'IN_PROGRESS',
      'OVERDUE',
      'WAITING_PARTS',
      'SUBMITTED',
      'IN_REVIEW',
      'PENDING_APPROVAL',
      'PENDING_FINANCE_REVIEW',
      'APPROVED_FOR_FINANCE',
    ].includes(value)
  ) {
    return 'status-pill warning';
  }

  if (['DAMAGED', 'FAILED', 'REJECTED', 'APPROVER_NOT_CONFIGURED'].includes(value)) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function getWorkflowReference(item: any) {
  return item.requestReference || item.requestNo || item.sourceEntityId || item.sourceId || item.id;
}

function getWorkflowApprover(item: any) {
  return (
    item.currentApproverEmail ||
    item.assignedToEmail ||
    item.approverEmail ||
    item.payload?.resolvedApprover?.approver?.email ||
    item.payload?.resolvedApprover?.originalApprover?.email ||
    '-'
  );
}

function isPendingApproval(item: any) {
  return ['SUBMITTED', 'IN_REVIEW', 'PENDING_APPROVAL'].includes(String(item.status || '').toUpperCase());
}

export default function FleetDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [approvalWorkflows, setApprovalWorkflows] = useState<ApprovalWorkflowRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const [fleetResult, workflowResult] = await Promise.all([
        getFleetDashboard(),
        getApprovalWorkflows(),
      ]);

      setData(fleetResult);
      setApprovalWorkflows(Array.isArray(workflowResult) ? workflowResult : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet dashboard.');
      setData(null);
      setApprovalWorkflows([]);
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
      inspections: asNumber(data?.summary?.inspections),
      openDefects: asNumber(data?.summary?.openDefects),
      trips: asNumber(data?.summary?.trips),
      fuelLogs: asNumber(data?.summary?.fuelLogs),
      workshopJobs: asNumber(data?.summary?.workshopJobs),
      openWorkshopJobs: asNumber(data?.summary?.openWorkshopJobs),
      openDueItems: asNumber(data?.summary?.openDueItems),
      overdueDueItems: asNumber(data?.summary?.overdueDueItems),
    };
  }, [data]);

  const approvalSummary = useMemo(() => {
    const pending = approvalWorkflows.filter(isPendingApproval);

    return {
      total: approvalWorkflows.length,
      pending: pending.length,
      approved: approvalWorkflows.filter((item) => String(item.status).toUpperCase() === 'APPROVED').length,
      rejected: approvalWorkflows.filter((item) => String(item.status).toUpperCase() === 'REJECTED').length,
      asset: approvalWorkflows.filter((item) => item.module === 'ASSET_MANAGEMENT').length,
      fleet: approvalWorkflows.filter((item) => item.module === 'FLEET').length,
      finance: approvalWorkflows.filter((item) => item.module === 'FINANCE').length,
      procurement: approvalWorkflows.filter((item) => item.module === 'PROCUREMENT').length,
      recentPending: pending.slice(0, 8),
    };
  }, [approvalWorkflows]);

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Dashboard</h1>
            <p className="muted">
              Control centre for vehicles, defects, trips, fuel, workshop jobs, compliance reminders,
              approval workflows and fleet cost visibility.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/fleet/vehicles">Vehicles</Link>
            <Link className="btn-secondary" href="/fleet/reports">Reports</Link>
            <Link className="btn-secondary" href="/approvals/inbox">Approval Inbox</Link>
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
          <div className="finance-summary-card"><span>Inspections</span><strong>{summary.inspections}</strong></div>
          <div className="finance-summary-card"><span>Open Defects</span><strong>{summary.openDefects}</strong></div>
          <div className="finance-summary-card"><span>Trips</span><strong>{summary.trips}</strong></div>
          <div className="finance-summary-card"><span>Fuel Logs</span><strong>{summary.fuelLogs}</strong></div>
          <div className="finance-summary-card"><span>Workshop Jobs</span><strong>{summary.workshopJobs}</strong></div>
          <div className="finance-summary-card"><span>Open Workshop</span><strong>{summary.openWorkshopJobs}</strong></div>
          <div className="finance-summary-card"><span>Open Due Items</span><strong>{summary.openDueItems}</strong></div>
          <div className="finance-summary-card"><span>Overdue Items</span><strong>{summary.overdueDueItems}</strong></div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Approval Control Centre</h2>
              <p className="muted">Live approval status across Asset Movements, Fleet Costs, Finance Expenses and Procurement Requests.</p>
            </div>
            <Link className="btn" href="/approvals/inbox">Open Approval Inbox</Link>
          </div>

          <div className="finance-summary-grid">
            <div className="finance-summary-card"><span>Total Workflows</span><strong>{approvalSummary.total}</strong></div>
            <div className="finance-summary-card"><span>Pending Approval</span><strong>{approvalSummary.pending}</strong></div>
            <div className="finance-summary-card"><span>Approved</span><strong>{approvalSummary.approved}</strong></div>
            <div className="finance-summary-card"><span>Rejected</span><strong>{approvalSummary.rejected}</strong></div>
            <div className="finance-summary-card"><span>Asset Movements</span><strong>{approvalSummary.asset}</strong></div>
            <div className="finance-summary-card"><span>Fleet Costs</span><strong>{approvalSummary.fleet}</strong></div>
            <div className="finance-summary-card"><span>Finance Expenses</span><strong>{approvalSummary.finance}</strong></div>
            <div className="finance-summary-card"><span>Procurement</span><strong>{approvalSummary.procurement}</strong></div>
          </div>
        </div>

        <section className="finance-dashboard-grid">
          <div className="finance-card">
            <div className="section-heading-row">
              <div>
                <h2>Pending Approvals</h2>
                <p className="muted">Requests waiting for action from configured approvers.</p>
              </div>
              <Link className="btn-secondary" href="/approvals/inbox">Review</Link>
            </div>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Module</th>
                    <th>Workflow</th>
                    <th>Approver</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!approvalSummary.recentPending.length ? (
                    <tr><td colSpan={6}>No pending approvals found.</td></tr>
                  ) : (
                    approvalSummary.recentPending.map((item: any) => (
                      <tr key={item.id}>
                        <td>{getWorkflowReference(item)}</td>
                        <td>{cleanStatus(item.module)}</td>
                        <td>{cleanStatus(item.workflowType)}</td>
                        <td>{getWorkflowApprover(item)}</td>
                        <td>{money(item.amount)}</td>
                        <td><span className={statusClass(item.status)}>{cleanStatus(item.status)}</span></td>
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
                  <tr><th>Vehicle</th><th>Defect</th><th>Severity</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {!data?.recentDefects?.length ? (
                    <tr><td colSpan={4}>No recent defects found.</td></tr>
                  ) : (
                    data.recentDefects.map((defect: any) => (
                      <tr key={defect.id}>
                        <td>{defect.vehicle?.registrationNo || '-'}</td>
                        <td>{defect.title || defect.description || '-'}</td>
                        <td>{defect.severity || defect.priority || '-'}</td>
                        <td><span className={statusClass(defect.status)}>{cleanStatus(defect.status)}</span></td>
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
              <h2>Recent Vehicles</h2>
              <p className="muted">Fleet master register summary.</p>
            </div>
            <Link className="btn-secondary" href="/fleet/vehicles">Open Register</Link>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr><th>Registration</th><th>Vehicle</th><th>Type</th><th>Site</th><th>Status</th></tr>
              </thead>
              <tbody>
                {!data?.recentVehicles?.length ? (
                  <tr><td colSpan={5}>No vehicles found.</td></tr>
                ) : (
                  data.recentVehicles.map((vehicle: any) => (
                    <tr key={vehicle.id}>
                      <td>{vehicle.registrationNo || '-'}</td>
                      <td>{[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '-'}</td>
                      <td>{vehicle.vehicleType || '-'}</td>
                      <td>{vehicle.site || '-'}</td>
                      <td><span className={statusClass(vehicle.status)}>{cleanStatus(vehicle.status)}</span></td>
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
              <h2>Compliance and Due Items</h2>
              <p className="muted">Service, road tax, insurance, fitness and other scheduled controls.</p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr><th>Vehicle</th><th>Due Type</th><th>Title</th><th>Due Date</th><th>Priority</th><th>Status</th></tr>
              </thead>
              <tbody>
                {!data?.recentDueItems?.length ? (
                  <tr><td colSpan={6}>No due items found.</td></tr>
                ) : (
                  data.recentDueItems.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.vehicle?.registrationNo || '-'}</td>
                      <td>{item.dueType || '-'}</td>
                      <td>{item.title || '-'}</td>
                      <td>{formatDate(item.dueDate)}</td>
                      <td>{item.priority || '-'}</td>
                      <td><span className={statusClass(item.status)}>{cleanStatus(item.status)}</span></td>
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

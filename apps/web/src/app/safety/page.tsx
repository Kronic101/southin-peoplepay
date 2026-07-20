import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getSafetyDashboard } from '@/lib/safety-api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatDate(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString('en-ZM', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function display(value: any, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export default async function SafetyDashboardPage() {
  const data = await getSafetyDashboard();
  const summary = data?.summary || {};
  const recentObservations = data?.recentObservations || [];
  const recentIncidents = data?.recentIncidents || [];
  const recentActions = data?.recentActions || [];

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>Safety Dashboard</h1>
            <p className="muted">
              Track observations, incidents, near misses, corrective actions, and high-risk safety activity.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">
              Approval Inbox
            </Link>

            <Link className="btn-secondary" href="/safety/actions">
              Corrective Actions
            </Link>

            <Link className="btn-secondary" href="/safety/incidents/new">
              Report Incident
            </Link>

            <Link className="btn" href="/safety/observations/new">
              New Observation
            </Link>
          </div>
        </div>

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Total Observations</span>
            <strong>{summary.totalObservations ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Open Observations</span>
            <strong>{summary.openObservations ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>High/Critical Observations</span>
            <strong>{summary.highRiskObservations ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Total Incidents</span>
            <strong>{summary.totalIncidents ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Open Incidents</span>
            <strong>{summary.openIncidents ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Near Misses</span>
            <strong>{summary.nearMisses ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Open Actions</span>
            <strong>{summary.openActions ?? 0}</strong>
          </div>

          <div className="finance-summary-card">
            <span>Overdue Actions</span>
            <strong>{summary.overdueActions ?? 0}</strong>
          </div>
        </div>

        <div className="finance-notice warning">
          High and critical safety observations are routed for review. All incidents and near misses are routed
          through the Safety approval workflow.
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Recent Safety Observations</h2>
              <p className="muted">
                Field observations, unsafe acts, unsafe conditions, and PPE compliance findings.
              </p>
            </div>

            <Link className="btn-secondary" href="/safety/observations">
              View All
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Observation</th>
                  <th>Type</th>
                  <th>Risk</th>
                  <th>Site</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Reported</th>
                </tr>
              </thead>

              <tbody>
                {recentObservations.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No safety observations captured yet.</td>
                  </tr>
                ) : (
                  recentObservations.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.observationNo}</strong>
                        <br />
                        <span className="muted">{display(record.description)}</span>
                      </td>
                      <td>{display(record.observationType)}</td>
                      <td>
                        <StatusPill status={display(record.riskLevel)} />
                      </td>
                      <td>{display(record.siteName)}</td>
                      <td>{display(record.exactLocation)}</td>
                      <td>
                        <StatusPill status={display(record.status)} />
                      </td>
                      <td>{formatDate(record.observationDate || record.createdAt)}</td>
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
              <h2>Recent Incidents & Near Misses</h2>
              <p className="muted">
                Reported safety incidents, near misses, injuries, property damage, and environmental events.
              </p>
            </div>

            <Link className="btn-secondary" href="/safety/incidents">
              View All
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Site</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Reported</th>
                </tr>
              </thead>

              <tbody>
                {recentIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No incidents reported yet.</td>
                  </tr>
                ) : (
                  recentIncidents.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.incidentNo}</strong>
                        <br />
                        <span className="muted">{display(record.description)}</span>
                      </td>
                      <td>{display(record.incidentType)}</td>
                      <td>
                        <StatusPill status={display(record.severity)} />
                      </td>
                      <td>{display(record.siteName)}</td>
                      <td>{display(record.exactLocation)}</td>
                      <td>
                        <StatusPill status={display(record.status)} />
                      </td>
                      <td>{formatDate(record.incidentDate || record.createdAt)}</td>
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
              <h2>Recent Corrective Actions</h2>
              <p className="muted">
                Open and overdue actions raised from observations, incidents, inspections, and audits.
              </p>
            </div>

            <Link className="btn-secondary" href="/safety/actions">
              View Actions
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Source</th>
                  <th>Priority</th>
                  <th>Assigned To</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentActions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No corrective actions created yet.</td>
                  </tr>
                ) : (
                  recentActions.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.actionNo}</strong>
                        <br />
                        <span className="muted">{display(record.title)}</span>
                      </td>
                      <td>{display(record.sourceType)}</td>
                      <td>
                        <StatusPill status={display(record.priority)} />
                      </td>
                      <td>
                        <strong>{display(record.assignedToName)}</strong>
                        <br />
                        <span className="muted">{display(record.assignedToEmail)}</span>
                      </td>
                      <td>{formatDate(record.dueDate)}</td>
                      <td>
                        <StatusPill status={display(record.status)} />
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
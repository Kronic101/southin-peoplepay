import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getSafetyIncidents } from '@/lib/safety-api';

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

export default async function SafetyIncidentsPage() {
  const records = await getSafetyIncidents();

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>Incidents & Near Misses</h1>
            <p className="muted">
              Report and investigate incidents, near misses, injuries, damage, and environmental events.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety">
              Dashboard
            </Link>

            <Link className="btn" href="/safety/incidents/new">
              Report Incident
            </Link>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Incident Register</h2>
              <p className="muted">
                All incidents and near misses are routed to Safety Officer review.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Site</th>
                  <th>Location</th>
                  <th>Reported By</th>
                  <th>Status</th>
                  <th>Sync</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No safety incidents found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.incidentNo}</strong>
                        <br />
                        <span className="muted">{display(record.description)}</span>
                      </td>

                      <td>{formatDate(record.incidentDate)}</td>

                      <td>{display(record.incidentType)}</td>

                      <td>
                        <StatusPill status={display(record.severity)} />
                      </td>

                      <td>{display(record.siteName)}</td>

                      <td>{display(record.exactLocation)}</td>

                      <td>
                        <strong>{display(record.reportedBy)}</strong>
                        <br />
                        <span className="muted">{display(record.reportedByEmail)}</span>
                      </td>

                      <td>
                        <StatusPill status={display(record.status)} />
                      </td>

                      <td>
                        <StatusPill status={display(record.syncStatus, 'SYNCED')} />
                      </td>

                      <td>
                        <Link
                          className="btn-secondary"
                          href={`/safety/actions/new?sourceType=SAFETY_INCIDENT&sourceId=${record.id}&sourceNo=${encodeURIComponent(record.incidentNo)}`}
                        >
                          Add Action
                        </Link>
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
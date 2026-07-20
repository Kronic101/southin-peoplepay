import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getSafetyObservations } from '@/lib/safety-api';

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

export default async function SafetyObservationsPage() {
  const records = await getSafetyObservations();

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>Safety Observations</h1>
            <p className="muted">
              Capture unsafe acts, unsafe conditions, PPE non-compliance, and positive safety observations.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety">
              Dashboard
            </Link>

            <Link className="btn" href="/safety/observations/new">
              New Observation
            </Link>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Observation Register</h2>
              <p className="muted">
                High and critical observations are automatically routed for Safety Officer review.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Observation</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Risk</th>
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
                    <td colSpan={10}>No safety observations found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.observationNo}</strong>
                        <br />
                        <span className="muted">{display(record.description)}</span>
                      </td>

                      <td>{formatDate(record.observationDate)}</td>

                      <td>{display(record.observationType)}</td>

                      <td>
                        <StatusPill status={display(record.riskLevel)} />
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
                          href={`/safety/actions/new?sourceType=SAFETY_OBSERVATION&sourceId=${record.id}&sourceNo=${encodeURIComponent(record.observationNo)}`}
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
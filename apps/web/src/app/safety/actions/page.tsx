import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { StatusPill } from '@/components/ui/StatusPill';
import { getSafetyCorrectiveActions } from '@/lib/safety-api';

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

function isOverdue(record: any) {
  if (!record?.dueDate) return false;

  const due = new Date(record.dueDate).getTime();
  const now = new Date().getTime();

  return (
    Number.isFinite(due) &&
    due < now &&
    !['COMPLETED', 'VERIFIED', 'CANCELLED'].includes(String(record.status || '').toUpperCase())
  );
}

function sourceLabel(record: any) {
  if (record?.observation?.observationNo) {
    return record.observation.observationNo;
  }

  if (record?.incident?.incidentNo) {
    return record.incident.incidentNo;
  }

  return record?.sourceId || '-';
}

function sourceDescription(record: any) {
  return (
    record?.observation?.description ||
    record?.incident?.description ||
    record?.sourceType ||
    '-'
  );
}

export default async function SafetyCorrectiveActionsPage() {
  const records = await getSafetyCorrectiveActions();

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>Corrective Actions</h1>
            <p className="muted">
              Track corrective and preventive actions raised from observations, incidents, inspections, and audits.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety">
              Dashboard
            </Link>
            <Link className="btn" href="/safety/actions/new">
              New Corrective Action
            </Link>
          </div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Corrective Action Register</h2>
              <p className="muted">
                Open actions must be assigned, completed, and verified before final closeout.
              </p>
            </div>
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
                  <th>Closeout</th>
                </tr>
              </thead>

              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No corrective actions found.</td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.actionNo}</strong>
                        <br />
                        <span className="muted">{display(record.title)}</span>
                      </td>

                      <td>
                        <strong>{sourceLabel(record)}</strong>
                        <br />
                        <span className="muted">{sourceDescription(record)}</span>
                      </td>

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

                      <td>
                        {isOverdue(record) ? (
                          <StatusPill status="OVERDUE" />
                        ) : (
                          <span className="muted">On track</span>
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
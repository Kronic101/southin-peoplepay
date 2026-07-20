import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { SafetyIncidentForm } from '@/components/safety/SafetyIncidentForm';
import { getPeopleOpsContext } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewSafetyIncidentPage() {
  const context = await getPeopleOpsContext('');
  const sites = context?.sites || [];

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>Report Incident / Near Miss</h1>
            <p className="muted">
              Report incidents, near misses, injuries, property damage, and environmental events.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety/incidents">
              Back to Incidents
            </Link>
          </div>
        </div>

        <SafetyIncidentForm sites={sites} />
      </section>
    </AppShell>
  );
}
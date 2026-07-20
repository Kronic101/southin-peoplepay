import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { SafetyObservationForm } from '@/components/safety/SafetyObservationForm';
import { getPeopleOpsContext } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewSafetyObservationPage() {
  const context = await getPeopleOpsContext('');
  const sites = context?.sites || [];

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>New Safety Observation</h1>
            <p className="muted">
              Capture unsafe acts, unsafe conditions, PPE non-compliance, or positive safety observations.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety/observations">
              Back to Observations
            </Link>
          </div>
        </div>

        <SafetyObservationForm sites={sites} />
      </section>
    </AppShell>
  );
}
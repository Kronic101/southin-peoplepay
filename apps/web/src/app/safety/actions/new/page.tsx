import Link from 'next/link';

import { AppShell } from '@/components/AppShell';
import { SafetyCorrectiveActionForm } from '@/components/safety/SafetyCorrectiveActionForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<{
    sourceType?: string;
    sourceId?: string;
    sourceNo?: string;
  }>;
};

export default async function NewSafetyCorrectiveActionPage({
  searchParams,
}: PageProps) {
  const params = searchParams ? await searchParams : {};

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Health & Safety</p>
            <h1>New Corrective Action</h1>
            <p className="muted">
              Create a corrective or preventive action linked to a safety observation or incident.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/safety/actions">
              Back to Actions
            </Link>
          </div>
        </div>

        <SafetyCorrectiveActionForm
          sourceType={params?.sourceType}
          sourceId={params?.sourceId}
          sourceNo={params?.sourceNo}
        />
      </section>
    </AppShell>
  );
}
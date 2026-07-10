import Link from 'next/link';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/auth';
import { AppShell } from '@/components/AppShell';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { SummaryGrid } from '@/components/ui/SummaryGrid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const API_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000/api';

type DashboardMetric = {
  label: string;
  value: string | number;
  helper?: string;
};

type DashboardLink = {
  label: string;
  href: string;
};

type DashboardSection = {
  title: string;
  description: string;
  links: DashboardLink[];
};

type DashboardSummary = {
  generatedAt: string;
  user: {
    email?: string | null;
    role?: string | null;
  };
  metrics: DashboardMetric[];
  sections: DashboardSection[];
};

async function getDashboardSummary(role: string, email: string): Promise<DashboardSummary> {
  try {
    const response = await fetch(`${API_URL}/dashboard/summary`, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'x-user-role': role,
        'x-user-email': email,
      },
    });

    if (!response.ok) {
      throw new Error('Dashboard API failed.');
    }

    return response.json();
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      user: {
        email,
        role,
      },
      metrics: [
        {
          label: 'Dashboard',
          value: 'Offline',
          helper: 'Unable to load dashboard API data.',
        },
      ],
      sections: [
        {
          title: 'Quick Links',
          description: 'Use the menu on the left while dashboard data is unavailable.',
          links: [
            { label: 'Employees', href: '/employees' },
            { label: 'Stores Dashboard', href: '/stores' },
            { label: 'Approval Inbox', href: '/approvals/inbox' },
          ],
        },
      ],
    };
  }
}

function cleanRole(role?: string | null) {
  return String(role || 'ADMIN')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function displayRole(role?: string | null) {
  return cleanRole(role).replaceAll('_', ' ');
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const email = session?.user?.email || '';
  const role = cleanRole((session?.user as any)?.staffRole || 'ADMIN');

  const dashboard = await getDashboardSummary(role, email);

  return (
    <AppShell>
      <section className="dashboard-centre">
        <PageHeader
          eyebrow="Operations Hub"
          title="System Dashboard"
          description="Your role-based control centre for the work assigned to your Microsoft 365 access profile."
          actions={
            <Link className="btn-secondary" href="/approvals/inbox">
              Approval Inbox
            </Link>
          }
        />

        <SummaryGrid items={dashboard.metrics} />

        <Notice>
          Signed in as <strong>{email || 'local development user'}</strong>. Current role:{' '}
          <strong>{displayRole(dashboard.user?.role || role)}</strong>. The dashboard only shows
          operational summaries; detailed records remain controlled by each module.
        </Notice>

        <section className="dashboard-action-grid">
          {dashboard.sections.map((section) => (
            <article className="dashboard-action-card" key={section.title}>
              <div>
                <h2>{section.title}</h2>
                <p>{section.description}</p>
              </div>

              <div className="dashboard-link-list">
                {section.links.map((item) => (
                  <Link key={item.href} href={item.href}>
                    {item.label}
                    <span>Open →</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
    </AppShell>
  );
}
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LeavePage() {
  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="People Operations"
          title="Leave Management"
          description="Staff leave management area for HR, supervisors, line managers, directors, and administrators."
        />

        <Notice>
          General employees should use the Employee Self-Service portal to apply for leave, view
          payslips, and check statutory records. This staff page is for HR review, supervisor
          approvals, leave dashboards, and leave balance monitoring.
        </Notice>

        <div className="role-card-grid">
          <article className="role-card">
            <div>
              <span className="role-card-badge">Employee</span>
              <h2>Employee Leave Request Centre</h2>
              <p>
                Employee-facing leave request page. Employees submit leave from the self-service
                portal after logging in.
              </p>
            </div>

            <Link className="btn-secondary" href="/me/leave">
              Open Employee Leave
            </Link>
          </article>

          <article className="role-card">
            <div>
              <span className="role-card-badge">Approvals</span>
              <h2>Supervisor Leave Approvals</h2>
              <p>
                Supervisors and line managers review, approve, or reject leave requests assigned to
                them.
              </p>
            </div>

            <Link className="btn-secondary" href="/hr/leave-approvals">
              Open Approvals
            </Link>
          </article>

          <article className="role-card">
            <div>
              <span className="role-card-badge">HR</span>
              <h2>HR Leave Dashboard</h2>
              <p>
                HR can review leave request totals, approved days, rejected requests, and estimated
                employee leave balances.
              </p>
            </div>

            <Link className="btn-secondary" href="/hr/leave-dashboard">
              Open Dashboard
            </Link>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
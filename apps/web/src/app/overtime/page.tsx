import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function OvertimePage() {
  return (
    <AppShell>
      <section className="finance-live-page">
        <div className="page-stack">
          <div className="finance-live-card finance-hero-card">
            <div>
              <p className="eyebrow">People Operations</p>
              <h1>Overtime</h1>
              <p className="muted">
                Overtime requests, approvals, department review, and payroll readiness control.
              </p>
            </div>
          </div>

          <div className="finance-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Submitted</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Approved</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Rejected</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Payroll Ready</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="finance-live-card">
            <h2>Overtime Request Register</h2>
            <p className="muted">
              This page is prepared for overtime capture, approval routing, and payroll integration.
            </p>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Approver</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6}>No overtime requests captured yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
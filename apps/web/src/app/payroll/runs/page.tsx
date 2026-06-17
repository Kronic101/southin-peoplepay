import { AppShell } from '@/components/AppShell';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PayrollRunsPage() {
  return (
    <AppShell>
      <section className="finance-live-page">
        <div className="page-stack">
          <div className="finance-live-card finance-hero-card">
            <div>
              <p className="eyebrow">Payroll Control</p>
              <h1>Payroll Runs</h1>
              <p className="muted">
                Prepare, review, approve, lock, and report payroll runs.
              </p>
            </div>
          </div>

          <div className="finance-summary-grid">
            <div className="summary-card">
              <span className="summary-label">Draft runs</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">In approval</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Locked runs</span>
              <strong>0</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Reported</span>
              <strong>0</strong>
            </div>
          </div>

          <div className="finance-live-card">
            <h2>Payroll Run Register</h2>
            <p className="muted">
              This page will list payroll runs created from approved payroll periods and payroll-ready
              employees.
            </p>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Run Name</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Employees</th>
                    <th>Prepared By</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6}>Payroll run workflow placeholder is ready for live data.</td>
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
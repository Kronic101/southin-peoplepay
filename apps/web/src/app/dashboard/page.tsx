import { AppShell } from '@/components/AppShell';

export default function DashboardPage() {
  return (
    <AppShell>
      <h1>System Dashboard</h1>
      <div className="grid grid-3">
        <div className="card"><h3>Employees</h3><p className="muted">Employee register summary.</p></div>
        <div className="card"><h3>Payroll</h3><p className="muted">Current payroll run status.</p></div>
        <div className="card"><h3>Compliance</h3><p className="muted">PAYE, NAPSA, NHIMA and statutory readiness.</p></div>
      </div>
    </AppShell>
  );
}

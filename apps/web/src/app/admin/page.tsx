import { AppShell } from '@/components/AppShell';

export default function Page() {
  return (
    <AppShell>
      <section className="card">
        <h1>System Admin</h1>
        <p className="muted">Users, roles, permissions, integrations, audit logs, and settings.</p>
      </section>
    </AppShell>
  );
}

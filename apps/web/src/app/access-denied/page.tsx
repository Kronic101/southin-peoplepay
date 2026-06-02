import { AppShell } from '@/components/AppShell';

export default function Page() {
  return (
    <AppShell>
      <section className="card">
        <h1>Access Denied</h1>
        <p className="muted">You do not have permission to access this page.</p>
      </section>
    </AppShell>
  );
}

import { AppShell } from '@/components/AppShell';

export default function Page() {
  return (
    <AppShell>
      <section className="card">
        <h1>Change Temporary PIN</h1>
        <p className="muted">Employees must change their temporary PIN on first login.</p>
      </section>
    </AppShell>
  );
}

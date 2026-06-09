import Link from 'next/link';


export default function HomePage() {
  return (
    <main className="page">
      <section className="card">
        <h1>Southin PeoplePay</h1>
        <p className="muted">
          Independent HR and Payroll Management System for Southin Contracting Limited.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link className="button" href="/login">Microsoft 365 Login</Link>
          <Link className="button" href="/employee-login">Employee Login</Link>
        </div>
      </section>
    </main>
  );
}

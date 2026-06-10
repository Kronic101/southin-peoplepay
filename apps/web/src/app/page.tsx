import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="hero-kicker">Staff Access</div>

        <h1>Microsoft 365 Login</h1>

        <p>
          For HR, Finance, Payroll, Directors, Line Managers, and System Administrators. Production
          access will use Microsoft Entra ID.
        </p>

        <div className="auth-form">
          <button className="btn" type="button">
            Continue with Microsoft
          </button>
        </div>

        <div className="auth-footer">
          <Link href="/">Back home</Link>
          <Link href="/workbench">Use demo workbench</Link>
        </div>
      </section>
    </main>
  );
}
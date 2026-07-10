'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleMicrosoftLogin() {
    setLoading(true);

    await signIn('azure-ad', {
      callbackUrl: '/dashboard',
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand-row">
          <div className="auth-logo">SP</div>

          <div>
            <strong>Southin PeoplePay</strong>
            <span>Operations Hub</span>
          </div>
        </div>

        <div className="hero-kicker">Staff Access</div>

        <h1>Microsoft 365 Login</h1>

        <p>
          For HR, Finance, Payroll, Directors, Line Managers, Asset Managers, Fleet Managers,
          Stores Officers, Procurement Officers, and System Administrators. Production access is
          controlled through Microsoft Entra ID.
        </p>

        <div className="auth-action-grid">
          <button className="btn" type="button" onClick={handleMicrosoftLogin} disabled={loading}>
            {loading ? 'Opening Microsoft login...' : 'Continue with Microsoft'}
          </button>

          <Link className="btn-secondary" href="/employee-login">
            Employee Login
          </Link>
        </div>

        <div className="auth-note">
          Staff users must use Microsoft 365. Employees without Microsoft 365 accounts must use
          Employee Login with their employee number and PIN.
        </div>
      </section>
    </main>
  );
}
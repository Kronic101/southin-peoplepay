'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { isDemoEnabledForBrowser } from '@/lib/demo';

export default function StaffLoginPage() {
  const [demoVisible, setDemoVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDemoVisible(isDemoEnabledForBrowser());
  }, []);

  async function handleMicrosoftLogin() {
    setLoading(true);

    await signIn('azure-ad', {
      callbackUrl: '/stores',
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

        <div className="auth-form">
          <button className="btn" type="button" onClick={handleMicrosoftLogin} disabled={loading}>
            {loading ? 'Opening Microsoft login...' : 'Continue with Microsoft'}
          </button>
        </div>

        <div className="auth-footer">
          <Link href="/">Back home</Link>

          {demoVisible ? (
            <>
              <Link href="/workbench">Use demo workbench</Link>
              <Link href="/demo">Open Demo Guide</Link>
            </>
          ) : null}
        </div>

        <div className="auth-note">
          Use your Southin Microsoft 365 account. Access after login depends on your Entra group
          membership.
        </div>
      </section>
    </main>
  );
}
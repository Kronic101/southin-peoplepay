'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { isDemoEnabledForBrowser } from '@/lib/demo';

export default function LoginPage() {
  const [demoVisible, setDemoVisible] = useState(false);

  useEffect(() => {
    setDemoVisible(isDemoEnabledForBrowser());
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="hero-kicker">Staff Access</div>

        <h1>Microsoft 365 Login</h1>

        <p>
          For HR, Finance, Payroll, Directors, Line Managers, Asset Managers, Fleet Managers,
          and System Administrators. Production access will use Microsoft Entra ID.
        </p>

        <div className="auth-form">
          <button className="btn" type="button">
            Continue with Microsoft
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
      </section>
    </main>
  );
}
'use client';

import { signIn } from 'next-auth/react';

export default function StaffLoginPage() {
  return (
    <main className="login-page">
      <span className="eyebrow">Staff Access</span>
      <h1>Microsoft 365 Login</h1>
      <p>
        For HR, Finance, Payroll, Directors, Line Managers, Asset Managers,
        Fleet Managers, and System Administrators.
      </p>

      <button
        className="btn"
        type="button"
        onClick={() => signIn('azure-ad', { callbackUrl: '/stores' })}
      >
        Continue with Microsoft
      </button>
    </main>
  );
}
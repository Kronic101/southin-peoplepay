'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { isDemoEnabledForBrowser } from '@/lib/demo';

type StaffRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'HR_OFFICER'
  | 'FINANCE_MANAGER'
  | 'FINANCE_OFFICER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'ASSET_OFFICER'
  | 'STORES_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER'
  | 'AUDITOR';

function normaliseRole(value: unknown): StaffRole | '' {
  const role = String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (role === 'ADMIN' || role === 'SYSTEM_ADMIN' || role === 'SYSTEM_ADMINISTRATOR') return 'ADMIN';
  if (role === 'DIRECTOR' || role === 'EXECUTIVE') return 'DIRECTOR';
  if (role === 'HR' || role === 'HR_MANAGER' || role === 'HUMAN_RESOURCES') return 'HR_MANAGER';
  if (role === 'HR_OFFICER') return 'HR_OFFICER';
  if (role === 'PAYROLL' || role === 'PAYROLL_OFFICER') return 'PAYROLL_OFFICER';
  if (role === 'FINANCE' || role === 'FINANCE_MANAGER') return 'FINANCE_MANAGER';
  if (role === 'FINANCE_OFFICER') return 'FINANCE_OFFICER';
  if (role === 'LINE_MANAGER') return 'LINE_MANAGER';
  if (role === 'SUPERVISOR') return 'SUPERVISOR';
  if (role === 'ASSET_MANAGER' || role === 'ASSET_CONTROLLER') return 'ASSET_MANAGER';
  if (role === 'ASSET_OFFICER') return 'ASSET_OFFICER';
  if (role === 'STORES' || role === 'STORE_OFFICER' || role === 'STORES_OFFICER') return 'STORES_OFFICER';
  if (role === 'PROCUREMENT' || role === 'PROCUREMENT_OFFICER') return 'PROCUREMENT_OFFICER';
  if (role === 'FLEET' || role === 'FLEET_MANAGER' || role === 'TRANSPORT_MANAGER') return 'FLEET_MANAGER';
  if (role === 'FLEET_DISPATCH' || role === 'FLEET_DISPATCH_OFFICER' || role === 'DISPATCH_OFFICER') {
    return 'FLEET_DISPATCH_OFFICER';
  }
  if (role === 'AUDITOR') return 'AUDITOR';

  return '';
}

function getDemoRole(): StaffRole | '' {
  if (typeof window === 'undefined') return '';

  const roleKeys = [
    'southin-dev-role',
    'southinDevRole',
    'southin_dev_role',
    'southinRole',
    'southin-role',
    'peoplepay-dev-role',
    'peoplepayDevRole',
    'selectedDevRole',
    'devRole',
    'role',
    'x-user-role',
  ];

  for (const key of roleKeys) {
    const value = normaliseRole(localStorage.getItem(key));
    if (value) return value;
  }

  return '';
}

export function RequireStaffRole({
  allowedRoles,
  children,
  title = 'Restricted Staff Area',
  message = 'You do not have permission to access this page.',
}: {
  allowedRoles: StaffRole[];
  children: React.ReactNode;
  title?: string;
  message?: string;
}) {
  const { data: session, status } = useSession();

  const demoVisible = typeof window !== 'undefined' && isDemoEnabledForBrowser();

  const sessionRole = normaliseRole((session?.user as any)?.staffRole);
  const demoRole = demoVisible ? getDemoRole() : '';

  const role = sessionRole || demoRole;

  const allowed =
    role === 'ADMIN' ||
    (!!role && allowedRoles.includes(role));

  if (status === 'loading') {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Southin Hub Access Control</p>
          <h1>Checking Access</h1>
          <p className="muted">Please wait while we verify your Microsoft 365 session.</p>
        </section>
      </main>
    );
  }

  if (!session?.user?.email && !demoVisible) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Southin Hub Access Control</p>
          <h1>Login Required</h1>
          <p className="muted">Please sign in using your Southin Microsoft 365 account.</p>
          <Link className="btn" href="/api/auth/signin">
            Sign in
          </Link>
        </section>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <p className="eyebrow">Southin Hub Access Control</p>
          <h1>{title}</h1>
          <p className="muted">{message}</p>

          <div className="info-grid" style={{ marginTop: '1rem' }}>
            <div>
              <span className="muted">Signed in as</span>
              <strong>{session?.user?.email || 'Demo user'}</strong>
            </div>
            <div>
              <span className="muted">Detected role</span>
              <strong>{role || 'No staff role detected'}</strong>
            </div>
            <div>
              <span className="muted">Allowed roles</span>
              <strong>{allowedRoles.join(', ')}</strong>
            </div>
          </div>

          <div className="action-row" style={{ marginTop: '1rem' }}>
            <Link className="btn-secondary" href="/">
              Return to Login
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
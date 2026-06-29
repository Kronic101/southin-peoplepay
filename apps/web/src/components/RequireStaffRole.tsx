'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { isDemoEnabledForBrowser } from '@/lib/demo';

type StaffRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR'
  | 'ASSET_MANAGER'
  | 'ASSET_OFFICER'
  | 'STORES_OFFICER'
  | 'PROCUREMENT_OFFICER'
  | 'FLEET_MANAGER'
  | 'FLEET_DISPATCH_OFFICER';

const ROLE_KEYS = [
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

function normaliseRole(value: unknown): StaffRole | '' {
  const role = String(value || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');

  if (role === 'HR' || role === 'HR_MANAGER' || role === 'HUMAN_RESOURCES') return 'HR_MANAGER';
  if (role === 'PAYROLL' || role === 'PAYROLL_OFFICER') return 'PAYROLL_OFFICER';
  if (role === 'FINANCE' || role === 'FINANCE_MANAGER') return 'FINANCE_MANAGER';
  if (role === 'DIRECTOR' || role === 'EXECUTIVE') return 'DIRECTOR';
  if (role === 'ADMIN' || role === 'SYSTEM_ADMIN' || role === 'SYSTEM_ADMINISTRATOR') return 'ADMIN';
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

  return '';
}

function getRoleFromLocalStorage(demoVisible: boolean) {
  if (typeof window === 'undefined') return '';

  if (!demoVisible) {
    return 'ADMIN';
  }

  for (const key of ROLE_KEYS) {
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
  const [demoVisible, setDemoVisible] = useState(false);
  const [role, setRole] = useState<StaffRole | ''>('');

  useEffect(() => {
    const enabled = isDemoEnabledForBrowser();
    setDemoVisible(enabled);

    function refreshRole() {
      setRole(getRoleFromLocalStorage(enabled));
    }

    refreshRole();

    if (!enabled) {
      return;
    }

    const interval = window.setInterval(refreshRole, 500);

    window.addEventListener('storage', refreshRole);
    window.addEventListener('focus', refreshRole);
    window.addEventListener('click', refreshRole);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refreshRole);
      window.removeEventListener('focus', refreshRole);
      window.removeEventListener('click', refreshRole);
    };
  }, []);

  const allowed = useMemo(() => {
    if (role === 'ADMIN') return true;
    if (!role) return false;
    return allowedRoles.includes(role);
  }, [allowedRoles, role]);

  if (!allowed) {
    return (
      <main className="employee-portal-page">
        <section className="employee-portal-shell">
          <nav className="employee-portal-nav">
            <div>
              <strong>Southin PeoplePay</strong>
              <span>Access Control</span>
            </div>

            <div className="employee-portal-nav-links">
              <Link href="/">Login</Link>

              {demoVisible ? (
                <>
                  <Link href="/workbench">Workbench</Link>
                  <Link href="/demo">Demo Guide</Link>
                </>
              ) : null}
            </div>
          </nav>

          <section className="employee-hero-card">
            <div>
              <div className="hero-kicker">Access Restricted</div>
              <h1>{title}</h1>
              <p>{message}</p>
            </div>

            <Link className="btn-secondary" href="/">
              Return to Login
            </Link>
          </section>

          <section className="employee-panel">
            <h2>Current Access</h2>

            <div className="mini-detail-grid">
              <div>
                <span>Detected Role</span>
                <strong>{role || 'No staff role detected'}</strong>
              </div>

              <div>
                <span>Allowed Roles</span>
                <strong>{allowedRoles.join(', ')}</strong>
              </div>
            </div>

            {demoVisible ? (
              <>
                <div className="notice" style={{ marginTop: '1rem' }}>
                  Local demo mode is enabled. Use the floating Dev Role selector or choose a quick
                  demo role below.
                </div>

                <div className="action-row" style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      localStorage.setItem('southinDevRole', 'HR_MANAGER');
                      localStorage.setItem('devRole', 'HR_MANAGER');
                      window.location.reload();
                    }}
                  >
                    Use HR Manager Demo Role
                  </button>

                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => {
                      localStorage.setItem('southinDevRole', 'ADMIN');
                      localStorage.setItem('devRole', 'ADMIN');
                      window.location.reload();
                    }}
                  >
                    Use Admin Demo Role
                  </button>
                </div>
              </>
            ) : (
              <div className="notice" style={{ marginTop: '1rem' }}>
                Please sign in using your Microsoft 365 account, or use Employee / Field Login if
                you do not have a Microsoft 365 account.
              </div>
            )}
          </section>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
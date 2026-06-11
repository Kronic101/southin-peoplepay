'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StaffRole =
  | 'PAYROLL_OFFICER'
  | 'HR_MANAGER'
  | 'FINANCE_MANAGER'
  | 'DIRECTOR'
  | 'ADMIN'
  | 'LINE_MANAGER'
  | 'SUPERVISOR';

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

  if (role === 'HR') return 'HR_MANAGER';
  if (role === 'HR_MANAGER') return 'HR_MANAGER';
  if (role === 'HUMAN_RESOURCES') return 'HR_MANAGER';

  if (role === 'PAYROLL') return 'PAYROLL_OFFICER';
  if (role === 'PAYROLL_OFFICER') return 'PAYROLL_OFFICER';

  if (role === 'FINANCE') return 'FINANCE_MANAGER';
  if (role === 'FINANCE_MANAGER') return 'FINANCE_MANAGER';

  if (role === 'DIRECTOR') return 'DIRECTOR';
  if (role === 'EXECUTIVE') return 'DIRECTOR';

  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'SYSTEM_ADMIN') return 'ADMIN';
  if (role === 'SYSTEM_ADMINISTRATOR') return 'ADMIN';

  if (role === 'LINE_MANAGER') return 'LINE_MANAGER';
  if (role === 'SUPERVISOR') return 'SUPERVISOR';

  return '';
}

function getRoleFromLocalStorage() {
  if (typeof window === 'undefined') return '';

  for (const key of ROLE_KEYS) {
    const value = normaliseRole(localStorage.getItem(key));

    if (value) return value;
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key) continue;

    const rawValue = localStorage.getItem(key);
    const value = normaliseRole(rawValue);

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
  const [role, setRole] = useState<StaffRole | ''>('');

  useEffect(() => {
    function refreshRole() {
      setRole(getRoleFromLocalStorage());
    }

    refreshRole();

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
              <Link href="/workbench">Workbench</Link>
              <Link href="/demo">Demo Guide</Link>
            </div>
          </nav>

          <section className="employee-hero-card">
            <div>
              <div className="hero-kicker">Access Restricted</div>
              <h1>{title}</h1>
              <p>{message}</p>
            </div>

            <Link className="btn-secondary" href="/workbench">
              Back to Workbench
            </Link>
          </section>

          <section className="employee-panel">
            <h2>Current Role</h2>

            <div className="mini-detail-grid">
              <div>
                <span>Detected Role</span>
                <strong>{role || 'No staff role selected'}</strong>
              </div>

              <div>
                <span>Allowed Roles</span>
                <strong>{allowedRoles.join(', ')}</strong>
              </div>
            </div>

            <div className="notice" style={{ marginTop: '1rem' }}>
              For demo testing, use the floating Dev Role selector and select HR Manager, Director,
              Admin, Line Manager, or Supervisor before opening this page.
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
          </section>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
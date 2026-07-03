'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { clearEmployeePortalToken } from '@/lib/employee-auth';

type Props = {
  children: ReactNode;
};

export function EmployeePortalShell({ children }: Props) {
  function logout() {
    clearEmployeePortalToken();
    window.location.href = '/employee-login';
  }

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <nav className="employee-portal-nav">
          <div>
            <strong>Southin PeoplePay</strong>
            <span>Employee Self-Service</span>
          </div>

          <div className="employee-portal-nav-links">
            <Link href="/me">Home</Link>
            <Link href="/me/details">My Details</Link>
            <Link href="/me/leave">Leave</Link>
            <Link href="/me/time">My Time</Link>
            <Link href="/me/payslips">Payslips</Link>
            <Link href="/me/statutory-certificates">Statutory</Link>

            <button type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </nav>

        {children}
      </section>
    </main>
  );
}
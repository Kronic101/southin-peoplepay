'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearEmployeePortalToken } from '@/lib/employee-auth';

const navItems = [
  { href: '/me', label: 'Home' },
  { href: '/me/details', label: 'My Details' },
  { href: '/me/leave', label: 'Leave' },
  { href: '/me/time', label: 'My Time' },
  { href: '/me/payslips', label: 'Payslips' },
  { href: '/me/statutory-certificates', label: 'Statutory' },
];

export function EmployeePortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/me' && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? 'active' : ''}
                >
                  {item.label}
                </Link>
              );
            })}

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
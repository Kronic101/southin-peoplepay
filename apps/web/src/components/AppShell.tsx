'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = {
  label: string;
  href: string;
};

type NavGroup = {
  title: string;
  links: NavLink[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Core',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Employees', href: '/employees' },
      { label: 'HR Dashboard', href: '/hr/dashboard' },
    ],
  },
  {
    title: 'Payroll',
    links: [
      { label: 'Payroll', href: '/payroll' },
      { label: 'Payroll Readiness', href: '/hr/payroll-readiness' },
      { label: 'Readiness Gates', href: '/hr/payroll-readiness-gates' },
      { label: 'Payroll Audit', href: '/reports/payroll-audit' },
      { label: 'Statutory', href: '/statutory' },
    ],
  },
  {
    title: 'People Operations',
    links: [
      { label: 'Attendance', href: '/attendance' },
      { label: 'Leave', href: '/leave' },
    ],
  },
  {
    title: 'Finance',
    links: [
      { label: 'Finance Dashboard', href: '/finance/dashboard' },
      { label: 'Bank Payment Prep', href: '/reports/bank-payment-preparation' },
      { label: 'Payment Batches', href: '/reports/payment-batches' },
      { label: 'Finance Evidence', href: '/reports/finance-evidence' },
    ],
  },
  {
    title: 'Executive',
    links: [
      { label: 'Executive Dashboard', href: '/executive/dashboard' },
      { label: 'Reports Centre', href: '/reports' },
      { label: 'Public Summary', href: '/reports/public-summary' },
    ],
  },
  {
    title: 'Administration',
    links: [
      { label: 'SharePoint Integration', href: '/admin/sharepoint-integration' },
      { label: 'Graph Setup Guide', href: '/admin/sharepoint-graph-setup' },
      { label: 'Admin', href: '/admin' },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">SP</div>

          <div>
            <h2>Southin PeoplePay</h2>
            <p className="muted">HR & Payroll Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>

              {group.links.map((link) => {
                const active = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={active ? 'nav-link active' : 'nav-link'}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>
    </div>
  );
}
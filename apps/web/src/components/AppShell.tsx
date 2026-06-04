import Link from 'next/link';

const links = [
  ['Dashboard', '/dashboard'],
  ['Employees', '/employees'],

  ['HR Dashboard', '/hr/dashboard'],
  ['Payroll Readiness', '/hr/payroll-readiness'],

  ['Attendance', '/attendance'],
  ['Leave', '/leave'],

  ['Payroll', '/payroll'],
  ['Statutory', '/statutory'],

  ['Finance', '/finance/dashboard'],
  ['Executive', '/executive/dashboard'],

  ['Reports Centre', '/reports'],
  ['Payroll Audit', '/reports/payroll-audit'],

  ['SharePoint Integration', '/admin/sharepoint-integration'],
  ['Graph Setup Guide', '/admin/sharepoint-graph-setup'],

  ['Admin', '/admin'],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <h2>Southin PeoplePay</h2>
        <p className="muted">HR & Payroll Portal</p>

        <nav>
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
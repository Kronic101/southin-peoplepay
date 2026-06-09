import Link from 'next/link';
import { DevRoleSelector } from '@/components/DevRoleSelector';

const links = [
  ['Dashboard', '/dashboard'],
  ['Employees', '/employees'],

  ['HR Dashboard', '/hr/dashboard'],
  ['Payroll Readiness', '/hr/payroll-readiness'],
  ['Readiness Gates', '/hr/payroll-readiness-gates'],

  ['Attendance', '/attendance'],
  ['Leave', '/leave'],

  ['Payroll', '/payroll'],
  ['Statutory', '/statutory'],

  ['Finance', '/finance/dashboard'],
  ['Executive', '/executive/dashboard'],

  ['Reports Centre', '/reports'],
  ['Payroll Readiness Gates', '/reports/payroll-readiness'],
  ['Payroll Audit', '/reports/payroll-audit'],
  ['Finance Evidence', '/reports/finance-evidence'],
  ['Bank Payment Prep', '/reports/bank-payment-preparation'],
  ['Payment Batches', '/reports/payment-batches'],
  ['Public Summary', '/reports/public-summary'],

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
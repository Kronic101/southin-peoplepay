import Link from 'next/link';

export function EmployeePortalShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="employee-portal-page">
      <div className="employee-portal-topbar">
        <div>
          <strong>Southin PeoplePay</strong>
          <span>Employee Self-Service</span>
        </div>

        <nav>
          <Link href="/me">Home</Link>
          <Link href="/me/payslips">Payslips</Link>
          <Link href="/employee-login">Logout</Link>
        </nav>
      </div>

      {children}
    </main>
  );
}
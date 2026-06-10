import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const accessCards = [
  {
    title: 'Employee Self-Service',
    label: 'Employee Portal',
    description: 'View personal profile information, payslips, and employee self-service records.',
    href: '/me',
    buttonLabel: 'Open Employee Portal',
  },
  {
    title: 'Human Resources',
    label: 'HR',
    description: 'Manage employee profiles, contracts, service conditions, and readiness checks.',
    href: '/hr/dashboard',
    buttonLabel: 'Open HR Dashboard',
  },
  {
    title: 'Payroll Office',
    label: 'Payroll',
    description: 'Create payroll runs, enter gross pay, submit payroll, and generate payslips.',
    href: '/payroll',
    buttonLabel: 'Open Payroll',
  },
  {
    title: 'Finance',
    label: 'Finance',
    description: 'Validate bank details, review deductions, prepare payment batches, and export evidence.',
    href: '/finance/dashboard',
    buttonLabel: 'Open Finance',
  },
  {
    title: 'Director / Executive',
    label: 'Executive',
    description: 'Review dashboards, approve payroll, approve payment batches, and view executive reports.',
    href: '/executive/dashboard',
    buttonLabel: 'Open Executive Dashboard',
  },
  {
    title: 'Administration',
    label: 'Admin',
    description: 'Manage system settings, SharePoint integration, Graph setup, and administrative controls.',
    href: '/admin',
    buttonLabel: 'Open Admin',
  },
];

const quickLinks = [
  { label: 'Payroll Readiness Gates', href: '/hr/payroll-readiness-gates' },
  { label: 'Payment Batches', href: '/reports/payment-batches' },
  { label: 'Payroll Audit', href: '/reports/payroll-audit' },
  { label: 'SharePoint Integration', href: '/admin/sharepoint-integration' },
];

export default function WorkbenchPage() {
  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Unified Access"
          title="Southin PeoplePay Workbench"
          description="A single access point for employees, HR, payroll, finance, directors, and system administrators."
        />

        <Notice>
          Use this page as the general link for the organisation. Each user can open the section that
          matches their responsibility. In production, Microsoft 365 will redirect staff
          automatically based on their approved role.
        </Notice>

        <div className="role-card-grid">
          {accessCards.map((card) => (
            <article className="role-card" key={card.title}>
              <div>
                <span className="role-card-badge clean">{card.label}</span>
                <h2>{card.title}</h2>
                <p>{card.description}</p>
              </div>

              <Link className="btn-secondary" href={card.href}>
                {card.buttonLabel}
              </Link>
            </article>
          ))}
        </div>

        <div className="table-wrap">
          <h3>Quick Demo Links</h3>

          <div className="quick-link-grid">
            {quickLinks.map((link) => (
              <Link className="quick-link-card" href={link.href} key={link.href}>
                {link.label}
                <span>Open →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const accessCards = [
  {
    title: 'Employee Self-Service',
    description: 'View your personal profile, payslips, leave requests, statutory records, and employee self-service records.',
    href: '/me',
    role: 'EMPLOYEE',
    buttonLabel: 'Open Employee Portal',
  },
  {
    title: 'Human Resources',
    description: 'Manage employee profiles, contracts, service conditions, readiness checks, leave approvals, and leave balances.',
    href: '/hr/dashboard',
    role: 'HR_MANAGER',
    buttonLabel: 'Open HR Dashboard',
  },
  {
    title: 'Payroll Office',
    description: 'Create payroll runs, enter gross pay, submit payroll, and generate payslips.',
    href: '/payroll',
    role: 'PAYROLL_OFFICER',
    buttonLabel: 'Open Payroll',
  },
  {
    title: 'Finance',
    description: 'Validate bank details, review deductions, prepare payment batches, and export evidence.',
    href: '/finance/dashboard',
    role: 'FINANCE_MANAGER',
    buttonLabel: 'Open Finance',
  },
  {
    title: 'Director / Executive',
    description: 'Review dashboards, approve payroll, approve payment batches, and view executive reports.',
    href: '/executive/dashboard',
    role: 'DIRECTOR',
    buttonLabel: 'Open Executive Dashboard',
  },
  {
    title: 'Administration',
    description: 'Manage system settings, SharePoint integration, Graph setup, and administrative controls.',
    href: '/admin',
    role: 'ADMIN',
    buttonLabel: 'Open Admin',
  },
];

const quickLinks = [
  { label: 'Demo Testing Guide', href: '/demo' },
  { label: 'Employee Portal Login', href: '/employee-login' },
  { label: 'Employee Dashboard', href: '/me' },
  { label: 'Employee Leave Request Centre', href: '/me/leave' },
  { label: 'Statutory Records Centre', href: '/me/statutory-certificates' },
  { label: 'Supervisor Leave Approvals', href: '/hr/leave-approvals' },
  { label: 'HR Leave Dashboard', href: '/hr/leave-dashboard' },
  { label: 'Payroll Readiness Gates', href: '/hr/payroll-readiness-gates' },
  { label: 'Payment Batches', href: '/reports/payment-batches' },
  { label: 'Payroll Audit', href: '/reports/payroll-audit' },
  { label: 'SharePoint Integration', href: '/admin/sharepoint-integration' },
];

const hrLinks = [
  {
    title: 'HR Leave Dashboard',
    description: 'View leave request totals, approval status, and employee leave balance estimates.',
    href: '/hr/leave-dashboard',
    tag: 'HR',
  },
  {
    title: 'Supervisor Leave Approvals',
    description: 'Review, approve, and reject employee leave requests submitted from the employee portal.',
    href: '/hr/leave-approvals',
    tag: 'Approvals',
  },
  {
    title: 'Payroll Readiness Gates',
    description: 'Check which employees are ready for payroll processing and which records are incomplete.',
    href: '/hr/payroll-readiness-gates',
    tag: 'Readiness',
  },
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
          matches their responsibility. In production, Microsoft 365 will redirect staff automatically
          based on their approved role.
        </Notice>

        <div className="role-card-grid">
          {accessCards.map((card) => (
            <article className="role-card" key={card.title}>
              <div>
                <span className="role-card-badge">{card.role}</span>
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
          <h3>Human Resources Workflow Links</h3>

          <div className="role-card-grid">
            {hrLinks.map((link) => (
              <article className="role-card" key={link.href}>
                <div>
                  <span className="role-card-badge">{link.tag}</span>
                  <h2>{link.title}</h2>
                  <p>{link.description}</p>
                </div>

                <Link className="btn-secondary" href={link.href}>
                  Open →
                </Link>
              </article>
            ))}
          </div>
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
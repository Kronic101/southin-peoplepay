import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { SummaryGrid } from '@/components/ui/SummaryGrid';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Reports Centre
 * ------------------------------------------------------------
 * Purpose:
 * Central reporting entry point for Finance, Payroll, Executive,
 * SharePoint publishing, and audit evidence.
 */
const reportLinks = [
  {
    title: 'Payroll Audit Reports',
    description: 'Audit payroll runs, approval timeline, deductions, payslips, and employee payroll lines.',
    href: '/reports/payroll-audit',
    area: 'Payroll',
  },
  {
    title: 'Payment Batches',
    description: 'Review Finance payment batches prepared from locked payroll runs.',
    href: '/reports/payment-batches',
    area: 'Finance',
  },
  {
    title: 'Bank Payment Preparation',
    description: 'Confirm readiness before manual payment processing and bank evidence preparation.',
    href: '/reports/bank-payment-preparation',
    area: 'Finance',
  },
  {
    title: 'Finance Evidence',
    description: 'Review payroll approval evidence, statutory evidence, and payment evidence packages.',
    href: '/finance/approval-evidence',
    area: 'Finance',
  },
  {
    title: 'Payroll Readiness',
    description: 'Check HR and Finance readiness gates before payroll processing.',
    href: '/reports/payroll-readiness',
    area: 'HR / Payroll',
  },
  {
    title: 'Public Dashboard Summary',
    description: 'View safe non-confidential indicators prepared for SharePoint dashboard publishing.',
    href: '/reports/public-summary',
    area: 'SharePoint',
  },
];

export default function ReportsCentrePage() {
  return (
    <AppShell>
      <ReportPageFrame
        eyebrow="Reports Centre"
        title="Southin Operations Reports"
        description="Central access point for payroll audit, Finance evidence, payment batches, readiness checks, and SharePoint-safe summaries."
        actions={[
            {
              label: 'Workbench',
              href: "/workbench",
              variant: 'secondary',
            },
            {
              label: 'Finance Dashboard',
              href: "/finance/dashboard",
              variant: 'secondary',
            },
            {
              label: 'Executive Dashboard',
              href: "/executive/dashboard",
              variant: 'secondary',
            },
        ]}
      >

        <SummaryGrid
          items={[
            {
              label: 'Report Areas',
              value: '6',
            },
            {
              label: 'Finance Reports',
              value: '3',
            },
            {
              label: 'Payroll Reports',
              value: '2',
            },
            {
              label: 'SharePoint Safe View',
              value: '1',
            },
          ]}
        />

        <Notice>
          Reports should be used for review, audit, approval evidence, and SharePoint publishing.
          Payroll and Finance data must remain controlled and should not be exposed on public dashboards.
        </Notice>

        <div className="quick-link-grid">
          {reportLinks.map((item) => (
            <Link className="quick-link-card" href={item.href} key={item.href}>
              <span className="role-card-badge">{item.area}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span>Open →</span>
            </Link>
          ))}
        </div>
      </ReportPageFrame>
    </AppShell>
  );
}
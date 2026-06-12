import Link from 'next/link';
import { ReactNode } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';

type ReportAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary';
};

type ReportPageFrameProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReportAction[];
  children: ReactNode;
};

/**
 * Shared report page frame.
 * --------------------------------------------------------------------
 * All /reports pages should use this wrapper so report pages remain
 * consistent with the Finance dashboard, Payroll dashboard, and Workbench.
 */
export function ReportPageFrame({
  eyebrow,
  title,
  description,
  actions = [],
  children,
}: ReportPageFrameProps) {
  return (
    <AppShell>
      <section className="card report-page-card">
        <PageHeader eyebrow={eyebrow} title={title} description={description} />

        {actions.length > 0 && (
          <div className="report-header-actions">
            {actions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                className={action.variant === 'primary' ? 'btn' : 'btn-secondary'}
                href={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}

        {children}
      </section>
    </AppShell>
  );
}
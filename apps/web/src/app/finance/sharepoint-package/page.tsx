import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const evidencePackages = [
  {
    area: 'Payroll Audit Package',
    source: 'Payroll runs, approval timeline, generated payslips',
    targetLibrary: 'Finance → Payroll Audit Reports',
    documentControl: 'Locked payroll only',
    status: 'Ready for controlled export',
  },
  {
    area: 'Payment Batch Package',
    source: 'Approved payment batches and payment preparation evidence',
    targetLibrary: 'Finance Restricted Library',
    documentControl: 'Finance and Director approval required',
    status: 'Ready for controlled export',
  },
  {
    area: 'Statutory Evidence Package',
    source: 'PAYE, NAPSA, NHIMA obligations and employee statutory records',
    targetLibrary: 'Finance Statutory Records',
    documentControl: 'Approved payroll figures only',
    status: 'Planned',
  },
  {
    area: 'Procurement Payment Package',
    source: 'Procurement tracker, invoices, PO stages, POP evidence',
    targetLibrary: 'Finance Procurement Payments',
    documentControl: 'Finance approval required',
    status: 'Planned',
  },
  {
    area: 'Expense Approval Package',
    source: 'Expense capture, approval status, payment confirmation',
    targetLibrary: 'Finance Expense Approvals',
    documentControl: 'Approved expenses only',
    status: 'Planned',
  },
];

const publishingControls = [
  {
    control: 'Single Source of Truth',
    description:
      'PeoplePay remains the source system. SharePoint receives published records for document control and review.',
  },
  {
    control: 'No Draft Payroll Publishing',
    description:
      'Payroll-related evidence must only be published after payroll has been approved, locked, and payslips generated.',
  },
  {
    control: 'Approval Evidence Required',
    description:
      'Finance packages must include approval trail records before being treated as final finance evidence.',
  },
  {
    control: 'Restricted Access',
    description:
      'Finance evidence libraries should be restricted to authorised Finance, HR, Director, and Admin users.',
  },
];

function StatusPill({ value }: { value: string }) {
  const status = value.toLowerCase();

  let className = 'employee-status neutral';

  if (status.includes('ready')) {
    className = 'employee-status success';
  }

  if (status.includes('planned')) {
    className = 'employee-status warning';
  }

  return <span className={className}>{value}</span>;
}

export default function FinanceSharePointPackagePage() {
  return (
    <AppShell>
      <section className="card finance-wide-page">
        <PageHeader
          eyebrow="Finance SharePoint"
          title="Finance SharePoint Publishing Package"
          description="Prepare controlled Finance evidence packages for SharePoint document control, review, and departmental reporting."
        />

        <div className="finance-page-actions">
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            SharePoint Integration
          </Link>

          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
        </div>

        <Notice>
          This page defines the Finance publishing model. PeoplePay should remain the operational
          system and single source of truth. SharePoint should be used for controlled document
          storage, departmental dashboards, audit evidence, and management review.
        </Notice>

        <section className="finance-kpi-grid finance-kpi-grid-wide">
          <div className="employee-panel">
            <h2>Packages</h2>
            <div className="leave-summary-card">
              <div>
                <span>Finance evidence areas</span>
                <strong>{evidencePackages.length}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Ready</h2>
            <div className="leave-summary-card">
              <div>
                <span>Controlled exports</span>
                <strong>
                  {evidencePackages.filter((item) => item.status.includes('Ready')).length}
                </strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Planned</h2>
            <div className="leave-summary-card">
              <div>
                <span>Future publishing areas</span>
                <strong>
                  {evidencePackages.filter((item) => item.status.includes('Planned')).length}
                </strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Target</h2>
            <div className="leave-summary-card">
              <div>
                <span>Document control</span>
                <strong>SharePoint</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Source</h2>
            <div className="leave-summary-card">
              <div>
                <span>Operational data</span>
                <strong>PeoplePay</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel finance-register-panel">
          <div className="section-heading-row">
            <div>
              <h2>Publishing Package Register</h2>
              <p className="muted">
                Finance evidence groups that will be published or referenced in SharePoint once
                Graph publishing is enabled.
              </p>
            </div>
          </div>

          <div className="procurement-register-list">
            {evidencePackages.map((item) => (
              <article className="procurement-register-card" key={item.area}>
                <div className="procurement-main">
                  <div>
                    <span className="field-label">Package Area</span>
                    <strong>{item.area}</strong>
                  </div>

                  <div className="procurement-description">
                    <span className="field-label">Source Data</span>
                    <strong>{item.source}</strong>
                  </div>

                  <div>
                    <span className="field-label">Target Library</span>
                    <strong>{item.targetLibrary}</strong>
                  </div>

                  <div>
                    <span className="field-label">Control Rule</span>
                    <strong>{item.documentControl}</strong>
                  </div>

                  <div>
                    <span className="field-label">Status</span>
                    <StatusPill value={item.status} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Publishing Controls</h2>

            <div className="procurement-register-list">
              {publishingControls.map((item) => (
                <div className="leave-summary-card" key={item.control}>
                  <div>
                    <span>{item.control}</span>
                    <strong>{item.description}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="employee-panel">
            <h2>Next Implementation Steps</h2>

            <div className="procurement-register-list">
              <div className="leave-summary-card">
                <div>
                  <span>Step 1</span>
                  <strong>Keep Graph publishing in safe log mode until local testing is complete.</strong>
                </div>
              </div>

              <div className="leave-summary-card">
                <div>
                  <span>Step 2</span>
                  <strong>Add document upload references for payment evidence and approvals.</strong>
                </div>
              </div>

              <div className="leave-summary-card">
                <div>
                  <span>Step 3</span>
                  <strong>Publish final packages to SharePoint once approvals are locked.</strong>
                </div>
              </div>

              <div className="leave-summary-card">
                <div>
                  <span>Step 4</span>
                  <strong>Expose SharePoint dashboard pages for Finance and management review.</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
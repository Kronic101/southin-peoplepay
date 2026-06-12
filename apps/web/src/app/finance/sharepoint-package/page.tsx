import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const packageItems = [
  {
    name: 'Payroll Audit CSV',
    destination: 'Finance → Payroll Audit Reports',
    readiness: 'Ready after payroll lock',
  },
  {
    name: 'Payment Batch Evidence',
    destination: 'Finance Restricted Library',
    readiness: 'Ready after Finance preparation',
  },
  {
    name: 'Approval Evidence JSON',
    destination: 'Finance Restricted Library',
    readiness: 'Ready after Director approval',
  },
  {
    name: 'Statutory Summary',
    destination: 'Finance Statutory Records',
    readiness: 'Ready after statutory validation',
  },
  {
    name: 'Procurement Payment Tracker Export',
    destination: 'Finance Procurement Records',
    readiness: 'Planned',
  },
];

export default function FinanceSharePointPackagePage() {
  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="SharePoint Publishing"
          title="Finance SharePoint Publishing Package"
          description="Prepare controlled Finance records for publication to the Southin SharePoint Finance and HR pages."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>
          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            SharePoint Integration
          </Link>
          <Link className="btn" href="/finance/approval-evidence">
            Finance Evidence Centre
          </Link>
        </div>

        <Notice>
          This package will publish Finance evidence to SharePoint only after the records have passed
          PeoplePay workflow controls. For now, it shows the controlled publishing structure before
          live Microsoft Graph writes are enabled.
        </Notice>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Finance SharePoint Package Items</h2>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Package Item</th>
                  <th>SharePoint Destination</th>
                  <th>Readiness</th>
                </tr>
              </thead>

              <tbody>
                {packageItems.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <strong>{item.name}</strong>
                    </td>
                    <td>{item.destination}</td>
                    <td>
                      <span className="employee-status warning">{item.readiness}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Publishing Controls</h2>

            <div className="mini-detail-grid finance-detail-grid">
              <div>
                <span>Graph mode</span>
                <strong>Safe mode first</strong>
              </div>
              <div>
                <span>Document control</span>
                <strong>SharePoint libraries</strong>
              </div>
              <div>
                <span>Audit trail</span>
                <strong>PeoplePay export logs</strong>
              </div>
              <div>
                <span>Approval check</span>
                <strong>Required before publish</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Next Microsoft Graph Step</h2>
            <p className="muted">
              Once we are ready, we will configure the Microsoft Graph application permissions,
              confirm SharePoint site/library IDs, and enable controlled publishing from PeoplePay
              to Southin SharePoint pages.
            </p>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
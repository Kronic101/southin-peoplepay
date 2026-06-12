'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

const evidenceItems = [
  {
    id: 'ev-001',
    title: 'Payroll Approval Evidence',
    source: 'Payroll Run / Director Approval',
    storage: 'Finance → Payroll Audit Reports',
    status: 'Required',
  },
  {
    id: 'ev-002',
    title: 'Payment Batch Evidence',
    source: 'Finance Payment Batch',
    storage: 'Finance Restricted Library',
    status: 'Required',
  },
  {
    id: 'ev-003',
    title: 'Bank Confirmation / POP',
    source: 'Manual Bank Payment',
    storage: 'Finance Restricted Library',
    status: 'Manual Upload',
  },
  {
    id: 'ev-004',
    title: 'Statutory Payment Evidence',
    source: 'PAYE / NAPSA / NHIMA',
    storage: 'Finance Statutory Records',
    status: 'Planned',
  },
];

export default function FinanceApprovalEvidencePage() {
  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Finance Evidence"
          title="Finance Approval Evidence Centre"
          description="A controlled register for payroll approvals, payment evidence, statutory evidence, and audit-ready records."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>
          <Link className="btn-secondary" href="/reports/payment-batches">
            Open Payment Batches
          </Link>
          <Link className="btn" href="/admin/sharepoint-integration">
            SharePoint Integration
          </Link>
        </div>

        <Notice>
          This page will become the Finance audit evidence centre. For now it shows the required
          evidence categories. The next phase will allow uploads, approval linking, SharePoint
          publishing, and audit export.
        </Notice>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Evidence Register</h2>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Evidence</th>
                  <th>Source</th>
                  <th>Storage Location</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {evidenceItems.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <strong>{item.title}</strong>
                    </td>
                    <td>{item.source}</td>
                    <td>{item.storage}</td>
                    <td>
                      <span className="employee-status warning">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Evidence Controls</h2>
            <div className="mini-detail-grid finance-detail-grid">
              <div>
                <span>Payroll approval</span>
                <strong>Must be locked</strong>
              </div>
              <div>
                <span>Payment batch</span>
                <strong>Must be approved</strong>
              </div>
              <div>
                <span>Bank proof</span>
                <strong>Manual upload</strong>
              </div>
              <div>
                <span>SharePoint storage</span>
                <strong>Controlled library</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Next Build</h2>
            <p className="muted">
              We will add upload buttons, document reference numbers, reviewer comments, and
              SharePoint document links. This will make Finance evidence traceable from request to
              payment.
            </p>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Finance Approval Evidence Centre
 * --------------------------------------------------------------------
 * Purpose:
 * This page acts as the controlled evidence register for Finance approvals.
 *
 * Current phase:
 * - Demo evidence records are stored in local React state.
 *
 * Future phase:
 * - Evidence will be stored in Supabase/PostgreSQL.
 * - Files will be stored in SharePoint document libraries.
 * - Microsoft Graph will publish approved evidence links to the Finance SharePoint page.
 * - Audit events will be linked to payroll, expenses, payment batches, and procurement workflows.
 */

type EvidenceStatus = 'Required' | 'Uploaded' | 'Approved' | 'Published' | 'Manual Upload';

type EvidenceItem = {
  id: string;
  evidenceName: string;
  source: string;
  owner: string;
  storageLocation: string;
  status: EvidenceStatus;
  notes: string;
};

const seedEvidence: EvidenceItem[] = [
  {
    id: 'ev-001',
    evidenceName: 'Payroll Approval Evidence',
    source: 'Payroll Run / Director Approval',
    owner: 'Payroll / Director',
    storageLocation: 'Finance → Payroll Audit Reports',
    status: 'Required',
    notes: 'Required before payment preparation can be finalised.',
  },
  {
    id: 'ev-002',
    evidenceName: 'Payment Batch Evidence',
    source: 'Finance Payment Batch',
    owner: 'Finance Manager',
    storageLocation: 'Finance Restricted Library',
    status: 'Required',
    notes: 'Batch approval evidence required before manual bank payment.',
  },
  {
    id: 'ev-003',
    evidenceName: 'Bank Confirmation / POP',
    source: 'Manual Bank Payment',
    owner: 'Finance Officer',
    storageLocation: 'Finance Restricted Library',
    status: 'Manual Upload',
    notes: 'Proof of payment will be uploaded after payment has been processed.',
  },
  {
    id: 'ev-004',
    evidenceName: 'Statutory Payment Evidence',
    source: 'PAYE / NAPSA / NHIMA',
    owner: 'Finance / Payroll',
    storageLocation: 'Finance Statutory Records',
    status: 'Required',
    notes: 'Used for statutory compliance and audit readiness.',
  },
];

function statusClass(status: EvidenceStatus) {
  if (status === 'Published' || status === 'Approved') return 'employee-status success';
  if (status === 'Uploaded') return 'employee-status neutral';
  if (status === 'Manual Upload') return 'employee-status warning';
  return 'employee-status danger';
}

export default function FinanceApprovalEvidencePage() {
  const [items, setItems] = useState(seedEvidence);

  const totals = useMemo(() => {
    return {
      total: items.length,
      required: items.filter((item) => item.status === 'Required').length,
      uploaded: items.filter((item) => item.status === 'Uploaded').length,
      approved: items.filter((item) => item.status === 'Approved').length,
      published: items.filter((item) => item.status === 'Published').length,
    };
  }, [items]);

  function moveStatus(id: string, status: EvidenceStatus) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
  }

  return (
    <AppShell>
      <section className="card wide-page-card">
        <PageHeader
          eyebrow="Finance Evidence"
          title="Finance Approval Evidence Centre"
          description="A controlled register for payroll approvals, payment evidence, statutory evidence, and audit-ready Finance records."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/reports/payment-batches">
            Open Payment Batches
          </Link>

          <Link className="btn" href="/finance/sharepoint-package">
            SharePoint Package
          </Link>
        </div>

        <Notice>
          This page will become the Finance audit evidence centre. For now, it demonstrates the
          evidence categories and control stages. The next API phase will attach files, reviewer
          names, timestamps, and SharePoint document references.
        </Notice>

        <section className="finance-kpi-grid">
          <div className="employee-panel">
            <h2>Total Evidence</h2>
            <div className="leave-summary-card">
              <span>Evidence records</span>
              <strong>{totals.total}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Required</h2>
            <div className="leave-summary-card">
              <span>Awaiting upload</span>
              <strong>{totals.required}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Uploaded</h2>
            <div className="leave-summary-card">
              <span>Pending approval</span>
              <strong>{totals.uploaded}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Approved</h2>
            <div className="leave-summary-card">
              <span>Ready for publishing</span>
              <strong>{totals.approved}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Published</h2>
            <div className="leave-summary-card">
              <span>SharePoint ready</span>
              <strong>{totals.published}</strong>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Evidence Register</h2>

          <div className="record-card-list">
            {items.map((item) => (
              <article className="workflow-record-card" key={item.id}>
                <div className="workflow-record-grid">
                  <div className="leave-summary-card wide-field">
                    <span>Evidence</span>
                    <strong>{item.evidenceName}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Source</span>
                    <strong>{item.source}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Owner</span>
                    <strong>{item.owner}</strong>
                  </div>

                  <div className="leave-summary-card wide-field">
                    <span>Storage Location</span>
                    <strong>{item.storageLocation}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Status</span>
                    <strong>
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </strong>
                  </div>
                </div>

                <div className="notice" style={{ marginTop: '1rem' }}>
                  {item.notes}
                </div>

                <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => moveStatus(item.id, 'Uploaded')}
                  >
                    Mark Uploaded
                  </button>

                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => moveStatus(item.id, 'Approved')}
                  >
                    Approve Evidence
                  </button>

                  <button className="btn" type="button" onClick={() => moveStatus(item.id, 'Published')}>
                    Mark Published
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
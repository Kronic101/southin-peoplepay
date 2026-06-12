'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Finance SharePoint Publishing Package
 * --------------------------------------------------------------------
 * Purpose:
 * This page prepares controlled Finance records for future SharePoint
 * publishing using Microsoft Graph.
 *
 * Current phase:
 * - Demo package checklist.
 *
 * Future phase:
 * - The API will produce a publishing package containing:
 *   - Payroll audit CSV
 *   - Payment batch evidence
 *   - Statutory obligations
 *   - Expense approvals
 *   - Procurement payment evidence
 * - Microsoft Graph will publish approved records to SharePoint libraries/pages.
 */

type PackageStatus = 'Pending' | 'Ready' | 'Published' | 'Blocked';

type PackageItem = {
  id: string;
  title: string;
  source: string;
  destination: string;
  status: PackageStatus;
  notes: string;
};

const seedItems: PackageItem[] = [
  {
    id: 'pkg-001',
    title: 'Payroll Audit Pack',
    source: 'Payroll Audit Reports',
    destination: 'Finance → Payroll Audit Reports',
    status: 'Ready',
    notes: 'Includes payroll run totals, approval timeline, and employee payroll line summary.',
  },
  {
    id: 'pkg-002',
    title: 'Payment Batch Pack',
    source: 'Payment Batches',
    destination: 'Finance Restricted Library',
    status: 'Ready',
    notes: 'Includes payment batch status, employee payment readiness, and manual payment evidence checklist.',
  },
  {
    id: 'pkg-003',
    title: 'Expense Approval Pack',
    source: 'Finance Expenses',
    destination: 'Finance → Expense Approvals',
    status: 'Pending',
    notes: 'Will include approved expenses, paid status, and proof-of-payment documents.',
  },
  {
    id: 'pkg-004',
    title: 'Procurement Payment Pack',
    source: 'Procurement Tracker',
    destination: 'Finance → Procurement Payments',
    status: 'Pending',
    notes: 'Will include supplier invoice status, PO references, and proof-of-payment tracking.',
  },
  {
    id: 'pkg-005',
    title: 'Statutory Evidence Pack',
    source: 'PAYE / NAPSA / NHIMA',
    destination: 'Finance → Statutory Records',
    status: 'Blocked',
    notes: 'Blocked until statutory payment files and certificates are introduced.',
  },
];

function statusClass(status: PackageStatus) {
  if (status === 'Published' || status === 'Ready') return 'employee-status success';
  if (status === 'Blocked') return 'employee-status danger';
  return 'employee-status warning';
}

export default function FinanceSharePointPackagePage() {
  const [items, setItems] = useState(seedItems);

  const totals = useMemo(() => {
    return {
      total: items.length,
      ready: items.filter((item) => item.status === 'Ready').length,
      pending: items.filter((item) => item.status === 'Pending').length,
      blocked: items.filter((item) => item.status === 'Blocked').length,
      published: items.filter((item) => item.status === 'Published').length,
    };
  }, [items]);

  function markReady(id: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, status: 'Ready' } : item)));
  }

  function markPublished(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'Published' } : item)),
    );
  }

  function resetPackage() {
    setItems(seedItems);
  }

  return (
    <AppShell>
      <section className="card wide-page-card">
        <PageHeader
          eyebrow="Finance Document Control"
          title="SharePoint Finance Publishing Package"
          description="Prepare approved Finance records for future SharePoint document control, audit evidence, and departmental dashboard publishing."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/finance/approval-evidence">
            Finance Evidence
          </Link>

          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            SharePoint Integration
          </Link>

          <button className="btn" type="button" onClick={resetPackage}>
            Reset Demo Package
          </button>
        </div>

        <Notice>
          This page does not publish live data yet. It prepares the control structure for future
          Microsoft Graph publishing. Once enabled, only approved and locked Finance records should
          be published to SharePoint.
        </Notice>

        <section className="finance-kpi-grid">
          <div className="employee-panel">
            <h2>Total Items</h2>
            <div className="leave-summary-card">
              <span>Package records</span>
              <strong>{totals.total}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Ready</h2>
            <div className="leave-summary-card">
              <span>Ready to publish</span>
              <strong>{totals.ready}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending</h2>
            <div className="leave-summary-card">
              <span>Needs completion</span>
              <strong>{totals.pending}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Blocked</h2>
            <div className="leave-summary-card">
              <span>Cannot publish</span>
              <strong>{totals.blocked}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Published</h2>
            <div className="leave-summary-card">
              <span>Sent to SharePoint</span>
              <strong>{totals.published}</strong>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Publishing Package Register</h2>

          <div className="record-card-list">
            {items.map((item) => (
              <article className="workflow-record-card" key={item.id}>
                <div className="workflow-record-grid">
                  <div className="leave-summary-card wide-field">
                    <span>Package Item</span>
                    <strong>{item.title}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Source</span>
                    <strong>{item.source}</strong>
                  </div>

                  <div className="leave-summary-card wide-field">
                    <span>Destination</span>
                    <strong>{item.destination}</strong>
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
                  {item.status === 'Pending' && (
                    <button className="btn-secondary" type="button" onClick={() => markReady(item.id)}>
                      Mark Ready
                    </button>
                  )}

                  {item.status === 'Ready' && (
                    <button className="btn" type="button" onClick={() => markPublished(item.id)}>
                      Mark Published
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
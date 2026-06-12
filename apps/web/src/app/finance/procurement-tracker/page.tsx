'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

type ProcurementRecord = {
  id: string;
  requisitionNo: string;
  department: string;
  supplier: string;
  description: string;
  amount: number;
  procurementStage: string;
  financeStage: string;
  invoiceStatus: string;
  paymentStatus: string;
  popStatus: string;
  responsibleOfficer: string;
};

const seedRecords: ProcurementRecord[] = [
  {
    id: 'proc-001',
    requisitionNo: 'REQ-2026-001',
    department: 'Operations',
    supplier: 'Demo Supplier Zambia',
    description: 'PPE and field consumables for project team',
    amount: 18500,
    procurementStage: 'PO Issued',
    financeStage: 'Awaiting Invoice',
    invoiceStatus: 'Pending',
    paymentStatus: 'Not Paid',
    popStatus: 'Not Uploaded',
    responsibleOfficer: 'Procurement / Finance',
  },
  {
    id: 'proc-002',
    requisitionNo: 'REQ-2026-002',
    department: 'HR',
    supplier: 'Training Vendor',
    description: 'Employee training support provision',
    amount: 9200,
    procurementStage: 'Approved Requisition',
    financeStage: 'Finance Review',
    invoiceStatus: 'Received',
    paymentStatus: 'Pending Approval',
    popStatus: 'Not Uploaded',
    responsibleOfficer: 'Finance Manager',
  },
];

function money(value: number) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function getStatusClass(value: string) {
  const status = value.toLowerCase();

  if (status.includes('paid') && !status.includes('not')) return 'success';
  if (status.includes('received')) return 'success';
  if (status.includes('approved')) return 'success';
  if (status.includes('pending')) return 'warning';
  if (status.includes('awaiting')) return 'warning';
  if (status.includes('not')) return 'danger';

  return 'neutral';
}

export default function ProcurementTrackerPage() {
  const [records, setRecords] = useState(seedRecords);

  const totals = useMemo(() => {
    const totalValue = records.reduce((sum, item) => sum + item.amount, 0);
    const pendingPayment = records.filter((item) => item.paymentStatus !== 'Paid').length;
    const pendingInvoice = records.filter((item) => item.invoiceStatus !== 'Received').length;
    const pendingPop = records.filter((item) => item.popStatus !== 'Uploaded').length;

    return {
      totalValue,
      pendingPayment,
      pendingInvoice,
      pendingPop,
      totalRecords: records.length,
    };
  }, [records]);

  function addDemoRecord() {
    const nextNo = String(records.length + 1).padStart(3, '0');

    setRecords((current) => [
      {
        id: crypto.randomUUID(),
        requisitionNo: `REQ-2026-${nextNo}`,
        department: 'Projects',
        supplier: 'New Demo Supplier',
        description: 'Demo procurement payment item for project-related operational support',
        amount: 5000,
        procurementStage: 'Requisition Submitted',
        financeStage: 'Not Reviewed',
        invoiceStatus: 'Pending',
        paymentStatus: 'Not Paid',
        popStatus: 'Not Uploaded',
        responsibleOfficer: 'Procurement',
      },
      ...current,
    ]);
  }

  return (
    <AppShell>
      <section className="card finance-wide-page">
        <PageHeader
          eyebrow="Finance Control"
          title="Procurement Payment Tracker"
          description="Track requisitions, purchase orders, supplier invoices, finance review, payment approval, and proof-of-payment readiness."
        />

        <div className="finance-page-actions">
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>

          <button className="btn" type="button" onClick={addDemoRecord}>
            Add Demo Procurement Item
          </button>
        </div>

        <Notice>
          This page prepares the Finance side of procurement tracking. Later, this will connect to
          the Procurement module and the Southin Asset Management system so asset purchases,
          inventory, tools, scaffold items, and supplier payments are visible in one workflow.
        </Notice>

        <section className="finance-kpi-grid finance-kpi-grid-wide">
          <div className="employee-panel">
            <h2>Total Items</h2>
            <div className="leave-summary-card">
              <div>
                <span>Tracked records</span>
                <strong>{totals.totalRecords}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Total Value</h2>
            <div className="leave-summary-card">
              <div>
                <span>Procurement value</span>
                <strong>{money(totals.totalValue)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending Invoices</h2>
            <div className="leave-summary-card">
              <div>
                <span>Invoice required</span>
                <strong>{totals.pendingInvoice}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending Payment</h2>
            <div className="leave-summary-card">
              <div>
                <span>Awaiting payment</span>
                <strong>{totals.pendingPayment}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>POP Required</h2>
            <div className="leave-summary-card">
              <div>
                <span>Proof not uploaded</span>
                <strong>{totals.pendingPop}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel finance-register-panel">
          <div className="section-heading-row">
            <div>
              <h2>Procurement Payment Register</h2>
              <p className="muted">
                Finance view of procurement items requiring invoice review, payment control, and
                payment evidence tracking.
              </p>
            </div>
          </div>

          <div className="procurement-register-list">
            {records.map((record) => (
              <article className="procurement-register-card" key={record.id}>
                <div className="procurement-main">
                  <div>
                    <span className="field-label">Requisition</span>
                    <strong>{record.requisitionNo}</strong>
                  </div>

                  <div>
                    <span className="field-label">Department</span>
                    <strong>{record.department}</strong>
                  </div>

                  <div>
                    <span className="field-label">Supplier</span>
                    <strong>{record.supplier}</strong>
                  </div>

                  <div className="procurement-description">
                    <span className="field-label">Description</span>
                    <strong>{record.description}</strong>
                  </div>

                  <div>
                    <span className="field-label">Amount</span>
                    <strong>{money(record.amount)}</strong>
                  </div>
                </div>

                <div className="procurement-status-grid">
                  <div>
                    <span className="field-label">Procurement</span>
                    <span className={`employee-status ${getStatusClass(record.procurementStage)}`}>
                      {record.procurementStage}
                    </span>
                  </div>

                  <div>
                    <span className="field-label">Finance</span>
                    <span className={`employee-status ${getStatusClass(record.financeStage)}`}>
                      {record.financeStage}
                    </span>
                  </div>

                  <div>
                    <span className="field-label">Invoice</span>
                    <span className={`employee-status ${getStatusClass(record.invoiceStatus)}`}>
                      {record.invoiceStatus}
                    </span>
                  </div>

                  <div>
                    <span className="field-label">Payment</span>
                    <span className={`employee-status ${getStatusClass(record.paymentStatus)}`}>
                      {record.paymentStatus}
                    </span>
                  </div>

                  <div>
                    <span className="field-label">POP</span>
                    <span className={`employee-status ${getStatusClass(record.popStatus)}`}>
                      {record.popStatus}
                    </span>
                  </div>

                  <div>
                    <span className="field-label">Officer</span>
                    <strong>{record.responsibleOfficer}</strong>
                  </div>

                  <div className="procurement-action-cell">
                    <button className="btn-secondary" type="button">
                      Review
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Next Build</h2>
            <p className="muted">
              The next version should add procurement item detail pages, invoice upload, POP upload,
              Finance Manager approval, Director approval, and SharePoint evidence publishing.
            </p>
          </div>

          <div className="employee-panel">
            <h2>Future Integration</h2>
            <p className="muted">
              This tracker will eventually receive approved procurement records from the Procurement
              module and asset-linked purchases from the Southin Asset Management platform.
            </p>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
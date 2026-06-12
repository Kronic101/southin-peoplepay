'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Finance Procurement Payment Tracker
 * --------------------------------------------------------------------
 * This page is the Finance-side view of procurement payments.
 *
 * Current phase:
 * - Uses local demo records so Finance can understand the workflow.
 *
 * Future phase:
 * - This will connect to the Procurement module.
 * - Procurement will capture requisitions, PO details, supplier invoices,
 *   GRNs, delivery notes, and POP records.
 * - Asset purchases will later flow into the Southin Asset Management system.
 * - Approved finance records will be published to SharePoint for document control.
 */

type ProcurementRecord = {
  id: string;
  requisitionNo: string;
  department: string;
  supplier: string;
  description: string;
  amount: number;
  procurementStage: string;
  financeStage: string;
  invoiceStatus: 'Pending' | 'Received';
  paymentStatus: 'Not Paid' | 'Pending Approval' | 'Paid';
  popStatus: 'Not Uploaded' | 'Uploaded';
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

function statusClass(value: string) {
  const text = value.toLowerCase();

  if (text.includes('paid') && !text.includes('not')) return 'employee-status success';
  if (text.includes('received') || text.includes('uploaded')) return 'employee-status success';
  if (text.includes('pending') || text.includes('awaiting')) return 'employee-status warning';
  if (text.includes('not')) return 'employee-status danger';

  return 'employee-status neutral';
}

export default function ProcurementTrackerPage() {
  const [records, setRecords] = useState(seedRecords);

  const totals = useMemo(() => {
    const totalValue = records.reduce((sum, item) => sum + item.amount, 0);
    const pendingPayment = records.filter((item) => item.paymentStatus !== 'Paid').length;
    const pendingInvoice = records.filter((item) => item.invoiceStatus !== 'Received').length;
    const popRequired = records.filter((item) => item.popStatus !== 'Uploaded').length;

    return {
      totalValue,
      pendingPayment,
      pendingInvoice,
      popRequired,
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
        description: 'Demo procurement payment item awaiting Finance review',
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

  function markInvoiceReceived(id: string) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              invoiceStatus: 'Received',
              financeStage: 'Invoice Received',
            }
          : item,
      ),
    );
  }

  function markPaymentPaid(id: string) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              paymentStatus: 'Paid',
              popStatus: 'Uploaded',
              financeStage: 'Payment Completed',
            }
          : item,
      ),
    );
  }

  return (
    <AppShell>
      <section className="card wide-page-card">
        <PageHeader
          eyebrow="Finance Control"
          title="Procurement Payment Tracker"
          description="Track requisitions, purchase orders, supplier invoices, Finance review, payment approval, and proof-of-payment readiness."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
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
          the Procurement module and Southin Asset Management so asset purchases, inventory,
          tools, scaffold items, supplier invoices, and payments are visible in one workflow.
        </Notice>

        <section className="finance-kpi-grid">
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
                <strong>{totals.popRequired}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Procurement Payment Register</h2>
          <p className="muted">
            Finance view of procurement items requiring invoice review, payment control, and
            payment evidence tracking.
          </p>

          <div className="record-card-list">
            {records.map((record) => (
              <article className="workflow-record-card" key={record.id}>
                <div className="workflow-record-grid">
                  <div className="leave-summary-card">
                    <span>Requisition</span>
                    <strong>{record.requisitionNo}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Department</span>
                    <strong>{record.department}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Supplier</span>
                    <strong>{record.supplier}</strong>
                  </div>

                  <div className="leave-summary-card wide-field">
                    <span>Description</span>
                    <strong>{record.description}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Amount</span>
                    <strong>{money(record.amount)}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Procurement</span>
                    <strong>{record.procurementStage}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Finance</span>
                    <strong>{record.financeStage}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Invoice</span>
                    <strong>
                      <span className={statusClass(record.invoiceStatus)}>
                        {record.invoiceStatus}
                      </span>
                    </strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Payment</span>
                    <strong>
                      <span className={statusClass(record.paymentStatus)}>
                        {record.paymentStatus}
                      </span>
                    </strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>POP</span>
                    <strong>
                      <span className={statusClass(record.popStatus)}>{record.popStatus}</span>
                    </strong>
                  </div>
                </div>

                <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                  {record.invoiceStatus !== 'Received' && (
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => markInvoiceReceived(record.id)}
                    >
                      Mark Invoice Received
                    </button>
                  )}

                  {record.paymentStatus !== 'Paid' && (
                    <button className="btn" type="button" onClick={() => markPaymentPaid(record.id)}>
                      Mark Paid + POP
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
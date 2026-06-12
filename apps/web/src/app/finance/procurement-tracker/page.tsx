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

export default function ProcurementTrackerPage() {
  const [records, setRecords] = useState(seedRecords);

  const totals = useMemo(() => {
    const totalValue = records.reduce((sum, item) => sum + item.amount, 0);
    const pendingPayment = records.filter((item) => item.paymentStatus !== 'Paid').length;
    const pendingInvoice = records.filter((item) => item.invoiceStatus !== 'Received').length;

    return {
      totalValue,
      pendingPayment,
      pendingInvoice,
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
        description: 'Demo procurement payment item',
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
      <section className="card">
        <PageHeader
          eyebrow="Finance Control"
          title="Procurement Payment Tracker"
          description="Track requisitions, purchase orders, invoices, payment approval, and proof of payment from one Finance view."
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
          the Procurement module and the Southin Asset Management system so asset purchases,
          inventory, tools, scaffold items, and supplier payments are visible in one workflow.
        </Notice>

        <section className="finance-kpi-grid">
          <div className="employee-panel">
            <h2>Total Items</h2>
            <div className="leave-summary-card">
              <div>
                <span>Tracked procurement records</span>
                <strong>{totals.totalRecords}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Total Value</h2>
            <div className="leave-summary-card">
              <div>
                <span>Current procurement value</span>
                <strong>{money(totals.totalValue)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending Invoices</h2>
            <div className="leave-summary-card">
              <div>
                <span>Invoice still required</span>
                <strong>{totals.pendingInvoice}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending Payment</h2>
            <div className="leave-summary-card">
              <div>
                <span>Awaiting payment completion</span>
                <strong>{totals.pendingPayment}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Procurement Payment Register</h2>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Requisition</th>
                  <th>Department</th>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Procurement Stage</th>
                  <th>Finance Stage</th>
                  <th>Invoice</th>
                  <th>Payment</th>
                  <th>POP</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <strong>{record.requisitionNo}</strong>
                    </td>
                    <td>{record.department}</td>
                    <td>{record.supplier}</td>
                    <td>{record.description}</td>
                    <td>{money(record.amount)}</td>
                    <td>{record.procurementStage}</td>
                    <td>{record.financeStage}</td>
                    <td>
                      <span className="employee-status warning">{record.invoiceStatus}</span>
                    </td>
                    <td>
                      <span className="employee-status neutral">{record.paymentStatus}</span>
                    </td>
                    <td>
                      <span className="employee-status danger">{record.popStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
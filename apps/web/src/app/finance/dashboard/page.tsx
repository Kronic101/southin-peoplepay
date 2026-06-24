'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../../components/AppShell';
import { getFinanceDashboard } from '../../../lib/api';

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

type FinanceDashboardData = {
  summary?: {
    expenses?: {
      totalRecords: number;
      submitted: number;
      approved: number;
      paid: number;
      totalValue: number;
      paidValue: number;
    };
    fleetExpenses?: {
      totalRecords: number;
      totalValue: number;
    };
    procurement?: {
      totalRecords: number;
      totalValue: number;
      paid: number;
      invoiceReceived: number;
    };
    evidence?: {
      totalRecords: number;
      required: number;
      approved: number;
      published: number;
    };
    paymentBatches?: {
      totalRecords: number;
      totalNetPay: number;
      approved: number;
    };
    sharePointPackages?: {
      totalRecords: number;
      ready: number;
      published: number;
    };
  };
  recent?: {
    expenses?: any[];
    procurementRequests?: any[];
  };
};

const emptyData: FinanceDashboardData = {
  summary: {
    expenses: {
      totalRecords: 0,
      submitted: 0,
      approved: 0,
      paid: 0,
      totalValue: 0,
      paidValue: 0,
    },
    fleetExpenses: {
      totalRecords: 0,
      totalValue: 0,
    },
    procurement: {
      totalRecords: 0,
      totalValue: 0,
      paid: 0,
      invoiceReceived: 0,
    },
    evidence: {
      totalRecords: 0,
      required: 0,
      approved: 0,
      published: 0,
    },
    paymentBatches: {
      totalRecords: 0,
      totalNetPay: 0,
      approved: 0,
    },
    sharePointPackages: {
      totalRecords: 0,
      ready: 0,
      published: 0,
    },
  },
  recent: {
    expenses: [],
    procurementRequests: [],
  },
};

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');

    try {
      const response = await getFinanceDashboard();
      setData(response || emptyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const summary = data.summary || emptyData.summary!;
  const expenses = summary.expenses || emptyData.summary!.expenses!;
  const fleetExpenses = summary.fleetExpenses || emptyData.summary!.fleetExpenses!;
  const procurement = summary.procurement || emptyData.summary!.procurement!;
  const evidence = summary.evidence || emptyData.summary!.evidence!;
  const paymentBatches = summary.paymentBatches || emptyData.summary!.paymentBatches!;
  const sharePointPackages =
    summary.sharePointPackages || emptyData.summary!.sharePointPackages!;

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Finance Workflow</p>
              <h1>Finance Dashboard</h1>
              <p className="muted">
                Live finance dashboard pulling from expenses, fleet operating costs, procurement
                payments, evidence, payment batches and SharePoint package preparation records.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadDashboard} type="button">
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && <div className="finance-notice danger">{error}</div>}
          {loading && <div className="finance-notice">Loading finance dashboard...</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Expense Records</span>
              <strong>{expenses.totalRecords}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Total Expenses</span>
              <strong>{money(expenses.totalValue)}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Fleet Posted Expenses</span>
              <strong>{money(fleetExpenses.totalValue)}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Fleet Expense Records</span>
              <strong>{fleetExpenses.totalRecords}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Procurement Value</span>
              <strong>{money(procurement.totalValue)}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Payroll Payment Batches</span>
              <strong>{paymentBatches.totalRecords}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Net Pay in Batches</span>
              <strong>{money(paymentBatches.totalNetPay)}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Finance Control Summary</h2>

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Submitted Expenses</span>
              <strong>{expenses.submitted}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Approved Expenses</span>
              <strong>{expenses.approved}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Paid Expenses</span>
              <strong>{expenses.paid}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Evidence Required</span>
              <strong>{evidence.required}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Evidence Published</span>
              <strong>{evidence.published}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Procurement Records</span>
              <strong>{procurement.totalRecords}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Invoices Received</span>
              <strong>{procurement.invoiceReceived}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Procurement Paid</span>
              <strong>{procurement.paid}</strong>
            </div>

            <div className="finance-summary-card">
              <span>SP Packages Ready</span>
              <strong>{sharePointPackages.ready}</strong>
            </div>

            <div className="finance-summary-card">
              <span>SP Packages Published</span>
              <strong>{sharePointPackages.published}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Recent Expense Records</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Expense No.</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Department</th>
                  <th>Site</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>

              <tbody>
                {(data.recent?.expenses || []).length === 0 ? (
                  <tr>
                    <td colSpan={8}>No recent expenses found.</td>
                  </tr>
                ) : (
                  (data.recent?.expenses || []).map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.expenseNo}</td>
                      <td>{expense.category}</td>
                      <td>{expense.description}</td>
                      <td>{expense.department || '-'}</td>
                      <td>{expense.site || '-'}</td>
                      <td>{money(expense.amount)}</td>
                      <td>{expense.status}</td>
                      <td>{expense.evidenceStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Recent Procurement Records</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Requisition No.</th>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Department</th>
                  <th>Site</th>
                  <th>Amount</th>
                  <th>Invoice</th>
                  <th>Payment</th>
                </tr>
              </thead>

              <tbody>
                {(data.recent?.procurementRequests || []).length === 0 ? (
                  <tr>
                    <td colSpan={8}>No recent procurement records found.</td>
                  </tr>
                ) : (
                  (data.recent?.procurementRequests || []).map((record) => (
                    <tr key={record.id}>
                      <td>{record.requisitionNo}</td>
                      <td>{record.supplierName || '-'}</td>
                      <td>{record.description}</td>
                      <td>{record.department}</td>
                      <td>{record.site || '-'}</td>
                      <td>{money(record.amount)}</td>
                      <td>{record.invoiceStatus}</td>
                      <td>{record.paymentStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
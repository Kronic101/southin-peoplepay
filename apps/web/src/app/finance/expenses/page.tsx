'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

type Expense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  requestedBy: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
};

const initialExpenses: Expense[] = [
  {
    id: 'exp-001',
    category: 'Transport',
    description: 'Monthly transport provision',
    amount: 2500,
    requestedBy: 'Finance Manager',
    status: 'SUBMITTED',
  },
  {
    id: 'exp-002',
    category: 'PPE / Uniforms',
    description: 'PPE replacement provision',
    amount: 1800,
    requestedBy: 'HR / Operations',
    status: 'APPROVED',
  },
];

function money(value: number) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

export default function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState(initialExpenses);

  const totals = useMemo(() => {
    return {
      total: expenses.reduce((sum, item) => sum + item.amount, 0),
      submitted: expenses.filter((item) => item.status === 'SUBMITTED').length,
      approved: expenses.filter((item) => item.status === 'APPROVED').length,
      paid: expenses.filter((item) => item.status === 'PAID').length,
    };
  }, [expenses]);

  function approveExpense(id: string) {
    setExpenses((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'APPROVED' } : item)),
    );
  }

  function markPaid(id: string) {
    setExpenses((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'PAID' } : item)),
    );
  }

  function addDemoExpense() {
    setExpenses((current) => [
      {
        id: crypto.randomUUID(),
        category: 'Administration',
        description: 'Demo finance operational expense',
        amount: 950,
        requestedBy: 'Finance Manager',
        status: 'SUBMITTED',
      },
      ...current,
    ]);
  }

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Finance Workflow"
          title="Expense Capture and Approval"
          description="Capture non-payroll operational expenses, route approvals, and prepare finance evidence."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>
          <Link className="btn-secondary" href="/finance/approval-evidence">
            Finance Evidence
          </Link>
          <button className="btn" type="button" onClick={addDemoExpense}>
            Add Demo Expense
          </button>
        </div>

        <Notice>
          This page starts the controlled expense workflow. The next API phase will store these
          records in Supabase and route approvals to Finance Manager, Director, and SharePoint
          evidence storage.
        </Notice>

        <section className="finance-kpi-grid">
          <div className="employee-panel">
            <h2>Total Expenses</h2>
            <div className="leave-summary-card">
              <div>
                <span>Registered value</span>
                <strong>{money(totals.total)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Submitted</h2>
            <div className="leave-summary-card">
              <div>
                <span>Awaiting approval</span>
                <strong>{totals.submitted}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Approved</h2>
            <div className="leave-summary-card">
              <div>
                <span>Approved expenses</span>
                <strong>{totals.approved}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Paid</h2>
            <div className="leave-summary-card">
              <div>
                <span>Payment completed</span>
                <strong>{totals.paid}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Expense Register</h2>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.category}</strong>
                    </td>
                    <td>{expense.description}</td>
                    <td>{money(expense.amount)}</td>
                    <td>{expense.requestedBy}</td>
                    <td>
                      <span className="employee-status warning">{expense.status}</span>
                    </td>
                    <td>
                      {expense.status === 'SUBMITTED' && (
                        <button className="btn-secondary" type="button" onClick={() => approveExpense(expense.id)}>
                          Approve
                        </button>
                      )}

                      {expense.status === 'APPROVED' && (
                        <button className="btn" type="button" onClick={() => markPaid(expense.id)}>
                          Mark Paid
                        </button>
                      )}

                      {(expense.status === 'PAID' || expense.status === 'REJECTED') && (
                        <span className="muted">Closed</span>
                      )}
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
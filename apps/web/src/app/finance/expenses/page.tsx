'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import {
  createFinanceExpense,
  getFinanceExpenses,
  markFinanceExpensePaid,
} from '@/lib/api';

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown) {
  return `K ${asNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-ZM', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanStatus(value?: string | null) {
  return String(value || '-').replaceAll('_', ' ');
}

function statusClass(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (['APPROVED', 'READY_FOR_PAYMENT', 'PAID', 'POSTED'].includes(value)) return 'status-pill success';
  if (['REJECTED', 'CANCELLED', 'FAILED', 'APPROVER_NOT_CONFIGURED'].includes(value)) return 'status-pill danger';
  return 'status-pill warning';
}

function normalizeExpensesResponse(data: any) {
  if (Array.isArray(data)) {
    return {
      summary: {
        totalRecords: data.length,
        totalValue: data.reduce((sum: number, item: any) => sum + asNumber(item.amount), 0),
        submitted: data.filter((item: any) => item.status === 'SUBMITTED').length,
        approved: data.filter((item: any) => item.status === 'APPROVED').length,
        rejected: data.filter((item: any) => item.status === 'REJECTED').length,
        paid: data.filter((item: any) => item.status === 'PAID').length,
      },
      expenses: data,
    };
  }

  return {
    summary: data?.summary || {
      totalRecords: data?.expenses?.length || 0,
      totalValue: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
    },
    expenses: data?.expenses || data?.items || data?.records || [],
  };
}

function canMarkPaid(expense: any) {
  return ['APPROVED', 'READY_FOR_PAYMENT'].includes(String(expense.status || '').toUpperCase());
}

export default function FinanceExpensesPage() {
  const [data, setData] = useState<any>({
    summary: { totalRecords: 0, totalValue: 0, submitted: 0, approved: 0, rejected: 0, paid: 0 },
    expenses: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadExpenses() {
    setLoading(true);
    setError('');

    try {
      const result = await getFinanceExpenses();
      setData(normalizeExpensesResponse(result));
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance expenses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const expenses = useMemo(() => data.expenses || [], [data.expenses]);
  const summary = useMemo(() => {
    return {
      totalRecords: expenses.length,
      totalValue: expenses.reduce((sum: number, item: any) => sum + asNumber(item.amount), 0),
      submitted: expenses.filter((item: any) => item.status === 'SUBMITTED').length,
      approved: expenses.filter((item: any) => ['APPROVED', 'READY_FOR_PAYMENT'].includes(item.status)).length,
      rejected: expenses.filter((item: any) => item.status === 'REJECTED').length,
      paid: expenses.filter((item: any) => item.status === 'PAID').length,
      missingApprover: expenses.filter((item: any) => item.status === 'APPROVER_NOT_CONFIGURED').length,
    };
  }, [expenses]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await createFinanceExpense({
        category: String(formData.get('category') || ''),
        description: String(formData.get('description') || ''),
        amount: Number(formData.get('amount') || 0),
        department: String(formData.get('department') || ''),
        site: String(formData.get('site') || ''),
        payee: String(formData.get('payee') || ''),
        requestedBy: String(formData.get('requestedBy') || 'Finance Manager'),
        requestedByEmail: String(formData.get('requestedByEmail') || 'finance@southincon.com'),
      });

      event.currentTarget.reset();
      setMessage('Finance expense submitted to approval workflow.');
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to create expense.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(expense: any) {
    setPayingId(expense.id);
    setMessage('');
    setError('');

    try {
      await markFinanceExpensePaid(expense.id, {
        paidBy: 'finance@southincon.com',
        paymentReference: `PAY-${expense.expenseNo || expense.id}`,
        financeComment: 'Expense paid from Finance Expenses page.',
      });

      setMessage(`${expense.expenseNo || 'Expense'} marked as paid.`);
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark expense as paid.');
    } finally {
      setPayingId('');
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Finance Workflow</p>
            <h1>Finance Expenses</h1>
            <p className="muted">
              Finance expense register connected to the unified approval workflow. Payments are only available after approval.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">Approval Inbox</Link>
            <button className="btn-secondary" onClick={loadExpenses} type="button">{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Records</span><strong>{summary.totalRecords}</strong></div>
          <div className="finance-summary-card"><span>Total Value</span><strong>{money(summary.totalValue)}</strong></div>
          <div className="finance-summary-card"><span>Submitted</span><strong>{summary.submitted}</strong></div>
          <div className="finance-summary-card"><span>Approved / Ready</span><strong>{summary.approved}</strong></div>
          <div className="finance-summary-card"><span>Rejected</span><strong>{summary.rejected}</strong></div>
          <div className="finance-summary-card"><span>Paid</span><strong>{summary.paid}</strong></div>
          <div className="finance-summary-card"><span>Missing Approver</span><strong>{summary.missingApprover}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Submit Expense</h2>

          <form className="finance-form-grid" onSubmit={handleSubmit}>
            <label>Category<input name="category" placeholder="Transport, Fuel, Accommodation" required /></label>
            <label>Description<input name="description" placeholder="Expense description" required /></label>
            <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
            <label>Department<input name="department" defaultValue="Finance" required /></label>
            <label>Site<input name="site" defaultValue="Solwezi Head Office" /></label>
            <label>Payee<input name="payee" placeholder="Supplier / employee / payee" /></label>
            <label>Requested By<input name="requestedBy" defaultValue="Finance Manager" /></label>
            <label>Requester Email<input name="requestedByEmail" defaultValue="finance@southincon.com" /></label>
            <div className="form-actions full-span"><button className="btn" type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit for Approval'}</button></div>
          </form>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Expense Register</h2>
              <p className="muted">Approval status and payment actions are controlled from the workflow.</p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Payee</th>
                  <th>Amount</th>
                  <th>Approval</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!expenses.length ? (
                  <tr><td colSpan={9}>{loading ? 'Loading finance expenses...' : 'No finance expenses found.'}</td></tr>
                ) : (
                  expenses.map((expense: any) => {
                    const approved = canMarkPaid(expense);
                    const paid = String(expense.status || '').toUpperCase() === 'PAID';
                    const hasApproval = Boolean(expense.approvalRequestId);

                    return (
                      <tr key={expense.id}>
                        <td><strong>{expense.expenseNo || expense.referenceNo || '-'}</strong></td>
                        <td>{cleanStatus(expense.category)}</td>
                        <td>{expense.description || '-'}</td>
                        <td>{expense.payee || expense.supplierName || '-'}</td>
                        <td>{money(expense.amount)}</td>
                        <td>
                          <span className={statusClass(expense.status)}>{cleanStatus(expense.status)}</span><br />
                          <span className="muted">{expense.approvalRequestId || 'No approval link'}</span>
                        </td>
                        <td>{paid ? <span className="status-pill success">Paid</span> : <span className="status-pill warning">Not Paid</span>}</td>
                        <td>{formatDate(expense.expenseDate || expense.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            {hasApproval && !approved && !paid ? <Link className="btn-secondary" href="/approvals/inbox">Open Approval</Link> : null}
                            {approved && !paid ? (
                              <button className="btn" type="button" disabled={payingId === expense.id} onClick={() => handleMarkPaid(expense)}>
                                {payingId === expense.id ? 'Marking...' : 'Mark Paid'}
                              </button>
                            ) : null}
                            {paid ? <span className="status-pill success">Complete</span> : null}
                            {!hasApproval && !paid ? <span className="status-pill warning">Approval not linked</span> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

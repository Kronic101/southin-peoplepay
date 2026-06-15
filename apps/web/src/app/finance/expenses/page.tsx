'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../../components/AppShell';

import {
  approveFinanceExpense,
  createFinanceExpense,
  getFinanceExpenses,
  markFinanceExpensePaid,
  rejectFinanceExpense,
  type FinanceExpense,
  type FinanceExpensesResponse,
} from '../../../lib/api';

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  const normalised = status.toUpperCase();

  if (['APPROVED', 'PAID', 'READY_FOR_PAYMENT'].includes(normalised)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'CANCELLED'].includes(normalised)) {
    return 'status-pill danger';
  }

  if (['SUBMITTED', 'IN_REVIEW', 'REQUIRED'].includes(normalised)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

const emptyResponse: FinanceExpensesResponse = {
  summary: {
    totalRecords: 0,
    totalValue: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
  },
  expenses: [],
};

export default function FinanceExpensesPage() {
  const [data, setData] = useState<FinanceExpensesResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadExpenses() {
    setLoading(true);
    setError('');

    try {
      const response = await getFinanceExpenses();
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance expenses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const latestExpenses = useMemo(() => data.expenses || [], [data.expenses]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      setMessage('Expense submitted successfully.');
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit expense.');
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove(expense: FinanceExpense) {
    setMessage('');
    setError('');

    try {
      await approveFinanceExpense(expense.id, 'Approved by Finance for payment preparation.');
      setMessage(`${expense.expenseNo} approved.`);
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve expense.');
    }
  }

  async function handleReject(expense: FinanceExpense) {
    setMessage('');
    setError('');

    try {
      await rejectFinanceExpense(expense.id, 'Rejected by Finance.');
      setMessage(`${expense.expenseNo} rejected.`);
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject expense.');
    }
  }

  async function handleMarkPaid(expense: FinanceExpense) {
    setMessage('');
    setError('');

    try {
      await markFinanceExpensePaid(expense.id, {
        paidBy: 'finance@southincon.com',
        paymentReference: `PAY-${expense.expenseNo}`,
        financeComment: 'Expense paid and ready for evidence filing.',
      });

      setMessage(`${expense.expenseNo} marked as paid.`);
      await loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark expense as paid.');
    }
  }

  return (
    <AppShell>
    <section className="page-stack finance-live-page">
      <div className="finance-live-card">
        <div className="finance-live-header">
          <div>
            <p className="eyebrow">Finance Workflow</p>
            <h1>Expense Approvals</h1>
            <p className="muted">
              Database-backed finance expense register with approval, rejection, payment status and
              evidence readiness.
            </p>
          </div>

          <button className="btn-secondary" onClick={loadExpenses} type="button">
            Refresh
          </button>
        </div>

        {message && <div className="notice">{message}</div>}
        {error && <div className="notice danger">{error}</div>}

        <div className="finance-summary-grid">
          <div className="finance-summary-card">
            <span>Total Records</span>
            <strong>{data.summary.totalRecords}</strong>
          </div>
          <div className="finance-summary-card">
            <span>Total Value</span>
            <strong>{money(data.summary.totalValue)}</strong>
          </div>
          <div className="finance-summary-card">
            <span>Submitted</span>
            <strong>{data.summary.submitted}</strong>
          </div>
          <div className="finance-summary-card">
            <span>Approved</span>
            <strong>{data.summary.approved}</strong>
          </div>
          <div className="finance-summary-card">
            <span>Rejected</span>
            <strong>{data.summary.rejected}</strong>
          </div>
          <div className="finance-summary-card">
            <span>Paid</span>
            <strong>{data.summary.paid}</strong>
          </div>
        </div>
      </div>

      <div className="finance-live-card">
        <h2>Submit Expense</h2>

        <form className="finance-form-grid" onSubmit={handleSubmit}>
          <label>
            Category
            <input name="category" placeholder="Transport, Fuel, Accommodation" required />
          </label>

          <label>
            Amount
            <input name="amount" min="1" step="0.01" type="number" required />
          </label>

          <label>
            Department
            <input name="department" defaultValue="Operations" />
          </label>

          <label>
            Site
            <input name="site" defaultValue="Kitwe Main Distribution Centre" />
          </label>

          <label>
            Payee
            <input name="payee" defaultValue="Employee" />
          </label>

          <label>
            Requested By
            <input name="requestedBy" defaultValue="Finance Manager" />
          </label>

          <label>
            Requested By Email
            <input name="requestedByEmail" defaultValue="finance@southincon.com" type="email" />
          </label>

          <label className="span-2">
            Description
            <textarea
              name="description"
              placeholder="Describe the expense and reason for payment."
              required
            />
          </label>

          <button className="btn" disabled={saving} type="submit">
            {saving ? 'Submitting...' : 'Submit Expense'}
          </button>
        </form>
      </div>

      <div className="finance-live-card">
        <h2>Expense Register</h2>

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
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>Loading finance expenses...</td>
                </tr>
              ) : latestExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10}>No finance expenses found.</td>
                </tr>
              ) : (
                latestExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expenseNo}</td>
                    <td>{expense.category}</td>
                    <td>{expense.description}</td>
                    <td>{expense.department || '-'}</td>
                    <td>{expense.site || '-'}</td>
                    <td>{money(expense.amount)}</td>
                    <td>
                      <span className={statusClass(expense.status)}>{expense.status}</span>
                    </td>
                    <td>
                      <span className={statusClass(expense.evidenceStatus)}>
                        {expense.evidenceStatus}
                      </span>
                    </td>
                    <td>{formatDate(expense.createdAt)}</td>
                    <td>
                      <div className="finance-inline-actions">
                        {expense.status === 'SUBMITTED' && (
                          <>
                            <button
                              className="btn-secondary"
                              onClick={() => handleApprove(expense)}
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              className="btn-secondary danger"
                              onClick={() => handleReject(expense)}
                              type="button"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {expense.status === 'APPROVED' && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleMarkPaid(expense)}
                            type="button"
                          >
                            Mark Paid
                          </button>
                        )}

                        {!['SUBMITTED', 'APPROVED'].includes(expense.status) && (
                          <span className="muted">No action</span>
                        )}
                      </div>
                    </td>
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
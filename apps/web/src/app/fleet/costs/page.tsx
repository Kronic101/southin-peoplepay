'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed: ${path}`);
  }

  return data as T;
}

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
  if (['APPROVED', 'APPROVED_FOR_FINANCE', 'POSTED_TO_FINANCE', 'PAID'].includes(value)) return 'status-pill success';
  if (['REJECTED', 'CANCELLED', 'FAILED', 'APPROVER_NOT_CONFIGURED'].includes(value)) return 'status-pill danger';
  return 'status-pill warning';
}

function approvedForFinance(cost: any) {
  return ['APPROVED', 'APPROVED_FOR_FINANCE'].includes(String(cost.status || '').toUpperCase());
}

function postedToFinance(cost: any) {
  return String(cost.status || '').toUpperCase() === 'POSTED_TO_FINANCE';
}

export default function FleetCostsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [postingId, setPostingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const result: any = await apiJson('/fleet/costs');
      setRecords(Array.isArray(result) ? result : result?.records || result?.items || result?.costs || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load fleet costs.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    return {
      total: records.length,
      submitted: records.filter((item) => ['SUBMITTED', 'PENDING', 'PENDING_APPROVAL'].includes(String(item.status).toUpperCase())).length,
      approved: records.filter(approvedForFinance).length,
      posted: records.filter(postedToFinance).length,
      rejected: records.filter((item) => String(item.status).toUpperCase() === 'REJECTED').length,
      value: records.reduce((sum, item) => sum + asNumber(item.amount), 0),
    };
  }, [records]);

  async function handlePostToFinance(cost: any) {
    setPostingId(cost.id);
    setMessage('');
    setError('');

    try {
      await apiJson(`/fleet/costs/${cost.id}/post-to-finance`, {
        method: 'PATCH',
        body: JSON.stringify({ postedBy: 'Finance Manager' }),
      });

      setMessage(`${cost.costNo || 'Fleet cost'} posted to Finance.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to post fleet cost to Finance.');
    } finally {
      setPostingId('');
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Fleet Management</p>
            <h1>Fleet Costs</h1>
            <p className="muted">Fleet operating costs routed through approvals before they are posted to Finance.</p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">Approval Inbox</Link>
            <Link className="btn-secondary" href="/finance/expenses">Finance Expenses</Link>
            <button className="btn-secondary" type="button" onClick={loadData}>{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Costs</span><strong>{summary.total}</strong></div>
          <div className="finance-summary-card"><span>Submitted</span><strong>{summary.submitted}</strong></div>
          <div className="finance-summary-card"><span>Approved</span><strong>{summary.approved}</strong></div>
          <div className="finance-summary-card"><span>Posted to Finance</span><strong>{summary.posted}</strong></div>
          <div className="finance-summary-card"><span>Rejected</span><strong>{summary.rejected}</strong></div>
          <div className="finance-summary-card"><span>Total Value</span><strong>{money(summary.value)}</strong></div>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Fleet Cost Register</h2>
              <p className="muted">Only approved fleet costs can be posted to Finance.</p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Cost No.</th>
                  <th>Vehicle</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Approval</th>
                  <th>Finance Expense</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!records.length ? (
                  <tr><td colSpan={9}>{loading ? 'Loading fleet costs...' : 'No fleet costs found.'}</td></tr>
                ) : (
                  records.map((cost) => {
                    const approved = approvedForFinance(cost);
                    const posted = postedToFinance(cost);
                    const hasApproval = Boolean(cost.approvalRequestId);

                    return (
                      <tr key={cost.id}>
                        <td><strong>{cost.costNo || '-'}</strong></td>
                        <td>{cost.vehicle?.registrationNo || cost.vehicleRegistration || '-'}</td>
                        <td>{cleanStatus(cost.category)}</td>
                        <td>{cost.description || '-'}</td>
                        <td>{money(cost.amount)}</td>
                        <td>
                          <span className={statusClass(cost.status)}>{cleanStatus(cost.status)}</span><br />
                          <span className="muted">{cost.approvalRequestId || 'No approval link'}</span>
                        </td>
                        <td>{cost.financeExpense?.expenseNo || cost.financeExpenseId || '-'}</td>
                        <td>{formatDate(cost.costDate || cost.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            {hasApproval && !approved && !posted ? <Link className="btn-secondary" href="/approvals/inbox">Open Approval</Link> : null}
                            {approved && !posted ? (
                              <button className="btn" type="button" disabled={postingId === cost.id} onClick={() => handlePostToFinance(cost)}>
                                {postingId === cost.id ? 'Posting...' : 'Post to Finance'}
                              </button>
                            ) : null}
                            {posted ? <span className="status-pill success">Posted</span> : null}
                            {!hasApproval && !posted ? <span className="status-pill warning">Approval not linked</span> : null}
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

'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSession } from "next-auth/react";

import AppShell from '@/components/AppShell';
import {
  createProcurementPayment,
  getProcurementPayments,
  markProcurementInvoiceReceived,
  markProcurementPaid,
  markProcurementPopUploaded,
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
  if (['PAID', 'APPROVED', 'GOODS_RECEIVED', 'INVOICE_RECEIVED', 'POP_UPLOADED'].includes(value)) return 'status-pill success';
  if (['REJECTED', 'CANCELLED', 'FAILED', 'APPROVER_NOT_CONFIGURED'].includes(value)) return 'status-pill danger';
  return 'status-pill warning';
}

function normalizeResponse(data: any) {
  if (Array.isArray(data)) {
    return {
      summary: {
        totalRecords: data.length,
        totalValue: data.reduce((sum: number, item: any) => sum + asNumber(item.amount), 0),
        invoicePending: data.filter((item: any) => item.invoiceStatus !== 'INVOICE_RECEIVED').length,
        paymentPending: data.filter((item: any) => item.paymentStatus !== 'PAID').length,
        paid: data.filter((item: any) => item.paymentStatus === 'PAID' || item.status === 'PAID').length,
      },
      records: data,
    };
  }

  return {
    summary: data?.summary || {
      totalRecords: data?.records?.length || 0,
      totalValue: 0,
      invoicePending: 0,
      paymentPending: 0,
      paid: 0,
    },
    records: data?.records || data?.items || data?.payments || [],
  };
}

function isApproved(record: any) {
  return String(record.status || '').toUpperCase() === 'APPROVED';
}

function invoiceReceived(record: any) {
  return String(record.invoiceStatus || '').toUpperCase() === 'INVOICE_RECEIVED';
}

function popUploaded(record: any) {
  return String(record.popStatus || '').toUpperCase() === 'POP_UPLOADED';
}

function paid(record: any) {
  return String(record.paymentStatus || record.status || '').toUpperCase() === 'PAID';
}

export default function ProcurementTrackerPage() {
  const [data, setData] = useState<any>({
    summary: { totalRecords: 0, totalValue: 0, invoicePending: 0, paymentPending: 0, paid: 0 },
    records: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { data: session, status } = useSession();

  const signedInName =
    session?.user?.name ??
    session?.user?.email ??
    '';

  const signedInEmail =
    session?.user?.email ??
    '';

  const signedInEntraId =
    (session?.user as any)?.entraObjectId ??
    '';

  const signedInRole =
    (session?.user as any)?.staffRole ??
    '';

  async function loadRecords() {
    setLoading(true);
    setError('');

    try {
      const result = await getProcurementPayments();
      setData(normalizeResponse(result));
    } catch (err: any) {
      setError(err?.message || 'Failed to load procurement tracker.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, []);

  const records = useMemo(() => data.records || [], [data.records]);
  const summary = useMemo(() => {
    return {
      totalRecords: records.length,
      totalValue: records.reduce((sum: number, item: any) => sum + asNumber(item.amount), 0),
      submitted: records.filter((item: any) => String(item.status).toUpperCase() === 'SUBMITTED').length,
      approved: records.filter(isApproved).length,
      invoicePending: records.filter((item: any) => !invoiceReceived(item)).length,
      paymentPending: records.filter((item: any) => !paid(item)).length,
      paid: records.filter(paid).length,
    };
  }, [records]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    if (status !== 'authenticated' || !session?.user?.email) {
      setSaving(false);
      setError('You must sign in with your Southin Microsoft 365 account before submitting a procurement request.');
      return;
    }

    const formData = new FormData(event.currentTarget);

    const requestedBy =
      session.user.name ??
      session.user.email ??
      'Unknown User';

    const requestedByEmail =
      session.user.email ??
      '';

    const requestedByEntraId =
      (session.user as any)?.entraObjectId ??
      '';
    const requestedByRole = 
      (session.user as any)?.staffRole ?? 
      '';

    try {
      await createProcurementPayment({
        department: String(formData.get('department') || ''),
        site: String(formData.get('site') || ''),
        supplierName: String(formData.get('supplierName') || ''),
        description: String(formData.get('description') || ''),
        amount: Number(formData.get('amount') || 0),
        requestedBy,
        requestedByEmail,
        requestedByEntraId,
        requestedByRole,
      });

      event.currentTarget.reset();
      setMessage('Procurement request submitted to approval workflow.');
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to create procurement record.');
    } finally {
      setSaving(false);
    }
  }

  async function runAction(record: any, action: 'invoice' | 'pop' | 'paid') {
    setActionId(`${record.id}-${action}`);
    setMessage('');
    setError('');

    try {
      if (action === 'invoice') {
        await markProcurementInvoiceReceived(record.id, record.invoiceNo || `INV-${record.requisitionNo || record.id}`);
        setMessage(`${record.requisitionNo || 'Procurement record'} invoice marked as received.`);
      }

      if (action === 'pop') {
        await markProcurementPopUploaded(record.id);
        setMessage(`${record.requisitionNo || 'Procurement record'} proof of payment marked as uploaded.`);
      }

      if (action === 'paid') {
        await markProcurementPaid(record.id);
        setMessage(`${record.requisitionNo || 'Procurement record'} marked as paid.`);
      }

      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to update procurement record.');
    } finally {
      setActionId('');
    }
  }

  return (
    <AppShell>
      <section className="finance-page">
        <div className="finance-card finance-hero-card">
          <div>
            <p className="eyebrow">Procurement Workflow</p>
            <h1>Procurement Payment Tracker</h1>
            <p className="muted">
              Procurement requests routed through approvals before invoice, proof of payment and payment completion are recorded.
            </p>
          </div>

          <div className="action-row">
            <Link className="btn-secondary" href="/approvals/inbox">Approval Inbox</Link>
            <button className="btn-secondary" onClick={loadRecords} type="button">{loading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
        </div>

        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <div className="finance-summary-grid">
          <div className="finance-summary-card"><span>Total Records</span><strong>{summary.totalRecords}</strong></div>
          <div className="finance-summary-card"><span>Total Value</span><strong>{money(summary.totalValue)}</strong></div>
          <div className="finance-summary-card"><span>Submitted</span><strong>{summary.submitted}</strong></div>
          <div className="finance-summary-card"><span>Approved</span><strong>{summary.approved}</strong></div>
          <div className="finance-summary-card"><span>Invoice Pending</span><strong>{summary.invoicePending}</strong></div>
          <div className="finance-summary-card"><span>Payment Pending</span><strong>{summary.paymentPending}</strong></div>
          <div className="finance-summary-card"><span>Paid</span><strong>{summary.paid}</strong></div>
        </div>

        <div className="finance-card">
          <h2>Create Procurement Request</h2>

          <form className="finance-form-grid" onSubmit={handleSubmit}>
            <label>Department<input name="department" defaultValue="Operations" required /></label>
            <label>Site<input name="site" defaultValue="Solwezi Head Office" /></label>
            <label>Supplier<input name="supplierName" placeholder="Supplier name" required /></label>
            <label>Description<input name="description" placeholder="Goods / services requested" required /></label>
            <label>Amount<input name="amount" type="number" min="0" step="0.01" required /></label>
            <div className="full-span">
              <div className="finance-card" style={{ margin: 0 }}>
                <p className="eyebrow">Requester Identity</p>
                {status === 'authenticated' ? (
                  <>
                    <p>
                      <strong>{signedInName || 'Signed-in user'}</strong>
                      <br />
                      <span className="muted">{signedInEmail}</span>
                      <br />
                      <span className="muted">Role: {signedInRole || 'Not mapped yet'}</span>
                    </p>
                  </>
                ) : (
                  <p className="muted">
                    Sign in with your Southin Microsoft 365 account before submitting procurement requests.
                  </p>
                )}
              </div>
            </div>

            <div className="form-actions full-span">
              <button className="btn" type="submit" disabled={saving || status !== 'authenticated'}>
                {saving ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>

        <div className="finance-card">
          <div className="section-heading-row">
            <div>
              <h2>Procurement Register</h2>
              <p className="muted">Approval must be complete before payment tracking actions are enabled.</p>
            </div>
          </div>

          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Supplier</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Approval</th>
                  <th>Invoice</th>
                  <th>POP</th>
                  <th>Payment</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!records.length ? (
                  <tr><td colSpan={10}>{loading ? 'Loading procurement records...' : 'No procurement records found.'}</td></tr>
                ) : (
                  records.map((record: any) => {
                    const approved = isApproved(record);
                    const invoiceDone = invoiceReceived(record);
                    const popDone = popUploaded(record);
                    const paidDone = paid(record);
                    const hasApproval = Boolean(record.approvalRequestId);

                    return (
                      <tr key={record.id}>
                        <td><strong>{record.requisitionNo || record.requestNo || '-'}</strong></td>
                        <td>{record.supplierName || '-'}</td>
                        <td>{record.description || '-'}</td>
                        <td>{money(record.amount)}</td>
                        <td>
                          <span className={statusClass(record.status)}>{cleanStatus(record.status)}</span><br />
                          <span className="muted">{record.approvalRequestId || 'No approval link'}</span>
                        </td>
                        <td><span className={statusClass(record.invoiceStatus)}>{cleanStatus(record.invoiceStatus || 'PENDING')}</span></td>
                        <td><span className={statusClass(record.popStatus)}>{cleanStatus(record.popStatus || 'PENDING')}</span></td>
                        <td><span className={statusClass(record.paymentStatus || record.status)}>{cleanStatus(record.paymentStatus || 'NOT PAID')}</span></td>
                        <td>{formatDate(record.createdAt)}</td>
                        <td>
                          <div className="action-row">
                            {hasApproval && !approved && !paidDone ? <Link className="btn-secondary" href="/approvals/inbox">Open Approval</Link> : null}
                            {approved && !invoiceDone ? (
                              <button className="btn-secondary" type="button" disabled={actionId === `${record.id}-invoice`} onClick={() => runAction(record, 'invoice')}>
                                {actionId === `${record.id}-invoice` ? 'Saving...' : 'Invoice Received'}
                              </button>
                            ) : null}
                            {approved && invoiceDone && !popDone ? (
                              <button className="btn-secondary" type="button" disabled={actionId === `${record.id}-pop`} onClick={() => runAction(record, 'pop')}>
                                {actionId === `${record.id}-pop` ? 'Saving...' : 'POP Uploaded'}
                              </button>
                            ) : null}
                            {approved && invoiceDone && popDone && !paidDone ? (
                              <button className="btn" type="button" disabled={actionId === `${record.id}-paid`} onClick={() => runAction(record, 'paid')}>
                                {actionId === `${record.id}-paid` ? 'Saving...' : 'Mark Paid'}
                              </button>
                            ) : null}
                            {paidDone ? <span className="status-pill success">Complete</span> : null}
                            {!hasApproval && !paidDone ? <span className="status-pill warning">Approval not linked</span> : null}
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

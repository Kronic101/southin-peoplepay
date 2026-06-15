'use client';

import { useEffect, useMemo, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  createProcurementPayment,
  getProcurementPayments,
  markProcurementInvoiceReceived,
  markProcurementPaid,
  markProcurementPopUploaded,
  type ProcurementPaymentRecord,
  type ProcurementPaymentsResponse,
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
  const value = String(status || '').toUpperCase();

  if (['PAID', 'APPROVED', 'GOODS_RECEIVED', 'INVOICE_RECEIVED'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'CANCELLED'].includes(value)) {
    return 'status-pill danger';
  }

  if (['SUBMITTED', 'PENDING', 'NOT_PAID', 'NOT_REVIEWED'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

const emptyResponse: ProcurementPaymentsResponse = {
  summary: {
    totalRecords: 0,
    totalValue: 0,
    invoicePending: 0,
    paymentPending: 0,
    paid: 0,
  },
  records: [],
};

export default function ProcurementTrackerPage() {
  const [data, setData] = useState<ProcurementPaymentsResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadRecords() {
    setLoading(true);
    setError('');

    try {
      const response = await getProcurementPayments();
      setData(response);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await createProcurementPayment({
        department: String(formData.get('department') || ''),
        site: String(formData.get('site') || ''),
        supplierName: String(formData.get('supplierName') || ''),
        description: String(formData.get('description') || ''),
        amount: Number(formData.get('amount') || 0),
        requestedBy: String(formData.get('requestedBy') || 'Procurement Officer'),
      });

      event.currentTarget.reset();
      setMessage('Procurement payment record created successfully.');
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to create procurement record.');
    } finally {
      setSaving(false);
    }
  }

  async function handleInvoiceReceived(record: ProcurementPaymentRecord) {
    setMessage('');
    setError('');

    try {
      await markProcurementInvoiceReceived(record.id, record.invoiceNo || `INV-${record.requisitionNo}`);
      setMessage(`${record.requisitionNo} invoice marked as received.`);
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to update invoice status.');
    }
  }

  async function handlePopUploaded(record: ProcurementPaymentRecord) {
    setMessage('');
    setError('');

    try {
      await markProcurementPopUploaded(record.id);
      setMessage(`${record.requisitionNo} proof of payment marked as uploaded.`);
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to update proof of payment.');
    }
  }

  async function handlePaid(record: ProcurementPaymentRecord) {
    setMessage('');
    setError('');

    try {
      await markProcurementPaid(record.id);
      setMessage(`${record.requisitionNo} marked as paid.`);
      await loadRecords();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark procurement record as paid.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Finance Workflow</p>
              <h1>Procurement Payment Tracker</h1>
              <p className="muted">
                Finance-controlled procurement payment register for invoices, proof of payment and payment status.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadRecords} type="button">
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
              <span>Invoice Pending</span>
              <strong>{data.summary.invoicePending}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Payment Pending</span>
              <strong>{data.summary.paymentPending}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Paid</span>
              <strong>{data.summary.paid}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Create Procurement Payment Record</h2>

          <form className="finance-form-grid" onSubmit={handleSubmit}>
            <label>
              Department
              <input name="department" defaultValue="Operations" required />
            </label>

            <label>
              Site
              <input name="site" defaultValue="Kitwe Main Distribution Centre" />
            </label>

            <label>
              Supplier
              <input name="supplierName" placeholder="Supplier name" required />
            </label>

            <label>
              Amount
              <input name="amount" min="1" step="0.01" type="number" required />
            </label>

            <label>
              Requested By
              <input name="requestedBy" defaultValue="Procurement Officer" />
            </label>

            <label className="span-2">
              Description
              <textarea name="description" placeholder="Describe the procurement item or invoice." required />
            </label>

            <button className="btn" disabled={saving} type="submit">
              {saving ? 'Creating...' : 'Create Record'}
            </button>
          </form>
        </div>

        <div className="finance-live-card">
          <h2>Procurement Register</h2>

          <div className="table-wrap">
            <table>
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
                  <th>Proof</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11}>Loading procurement records...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={11}>No procurement payment records found.</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.requisitionNo}</td>
                      <td>{record.supplierName || '-'}</td>
                      <td>{record.description}</td>
                      <td>{record.department}</td>
                      <td>{record.site || '-'}</td>
                      <td>{money(record.amount)}</td>
                      <td>
                        <span className={statusClass(record.invoiceStatus)}>
                          {record.invoiceStatus}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(record.paymentStatus)}>
                          {record.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(record.proofOfPaymentStatus)}>
                          {record.proofOfPaymentStatus}
                        </span>
                      </td>
                      <td>{formatDate(record.createdAt)}</td>
                      <td>
                        <div className="inline-actions">
                          {record.invoiceStatus !== 'RECEIVED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleInvoiceReceived(record)}
                              type="button"
                            >
                              Invoice Received
                            </button>
                          )}

                          {record.proofOfPaymentStatus !== 'UPLOADED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handlePopUploaded(record)}
                              type="button"
                            >
                              POP Uploaded
                            </button>
                          )}

                          {record.paymentStatus !== 'PAID' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handlePaid(record)}
                              type="button"
                            >
                              Mark Paid
                            </button>
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
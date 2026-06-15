'use client';

import { useEffect, useMemo, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  getFinanceSharePointPackage,
  markFinanceSharePointPackagePublished,
  markFinanceSharePointPackageReady,
  prepareFinanceSharePointPackage,
  type FinanceSharePointDocument,
  type FinanceSharePointPackageResponse,
} from '../../../lib/api';

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  const value = String(status || '').toUpperCase();

  if (['APPROVED', 'PUBLISHED_TO_SHAREPOINT'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'ARCHIVED'].includes(value)) {
    return 'status-pill danger';
  }

  if (['DRAFT', 'UPLOADED'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

const emptyResponse: FinanceSharePointPackageResponse = {
  summary: {
    totalRecords: 0,
    draft: 0,
    uploaded: 0,
    approved: 0,
    published: 0,
  },
  documents: [],
};

export default function FinanceSharePointPackagePage() {
  const [data, setData] = useState<FinanceSharePointPackageResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadPackages() {
    setLoading(true);
    setError('');

    try {
      const response = await getFinanceSharePointPackage();
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load SharePoint package records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, []);

  const documents = useMemo(() => data.documents || [], [data.documents]);

  async function handlePrepare(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const formData = new FormData(event.currentTarget);

    try {
      await prepareFinanceSharePointPackage({
        title: String(formData.get('title') || ''),
        documentType: String(formData.get('documentType') || 'FINANCE_EVIDENCE_PACKAGE'),
        sourceEntityType: String(formData.get('sourceEntityType') || 'FinanceExpense'),
        confidentiality: String(formData.get('confidentiality') || 'CONFIDENTIAL_FINANCE'),
        uploadedBy: String(formData.get('uploadedBy') || 'finance@southincon.com'),
      });

      event.currentTarget.reset();
      setMessage('Finance SharePoint package prepared.');
      await loadPackages();
    } catch (err: any) {
      setError(err?.message || 'Failed to prepare SharePoint package.');
    } finally {
      setSaving(false);
    }
  }

  async function handleReady(record: FinanceSharePointDocument) {
    setMessage('');
    setError('');

    try {
      await markFinanceSharePointPackageReady(record.id);
      setMessage(`${record.title} marked ready.`);
      await loadPackages();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark package ready.');
    }
  }

  async function handlePublished(record: FinanceSharePointDocument) {
    setMessage('');
    setError('');

    try {
      await markFinanceSharePointPackagePublished(
        record.id,
        record.sharePointUrl || 'https://southincon.sharepoint.com/sites/finance',
      );
      setMessage(`${record.title} marked as published.`);
      await loadPackages();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark package published.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Finance Workflow</p>
              <h1>Finance SharePoint Package</h1>
              <p className="muted">
                Prepares finance document packages for controlled SharePoint publishing. SharePoint
                is the publishing layer only; Supabase remains the source of truth.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadPackages} type="button">
              Refresh
            </button>
          </div>

          {message && <div className="finance-notice success">{message}</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Records</span>
              <strong>{data.summary.totalRecords}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Draft</span>
              <strong>{data.summary.draft}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Uploaded</span>
              <strong>{data.summary.uploaded}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approved</span>
              <strong>{data.summary.approved}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Published</span>
              <strong>{data.summary.published}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Prepare Package</h2>

          <form className="finance-form-grid" onSubmit={handlePrepare}>
            <label>
              Package Title
              <input
                name="title"
                defaultValue="Finance Expense Evidence Package"
                placeholder="Package title"
                required
              />
            </label>

            <label>
              Document Type
              <input name="documentType" defaultValue="FINANCE_EVIDENCE_PACKAGE" />
            </label>

            <label>
              Source Entity Type
              <input name="sourceEntityType" defaultValue="FinanceExpense" />
            </label>

            <label>
              Confidentiality
              <select name="confidentiality" defaultValue="CONFIDENTIAL_FINANCE">
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL_FINANCE">Confidential Finance</option>
                <option value="CONFIDENTIAL_EXECUTIVE">Confidential Executive</option>
              </select>
            </label>

            <label>
              Uploaded By
              <input name="uploadedBy" defaultValue="finance@southincon.com" />
            </label>

            <button className="btn" disabled={saving} type="submit">
              {saving ? 'Preparing...' : 'Prepare Package'}
            </button>
          </form>
        </div>

        <div className="finance-live-card">
          <h2>Package Register</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Document Type</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Confidentiality</th>
                  <th>Uploaded By</th>
                  <th>Approved By</th>
                  <th>SharePoint URL</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10}>Loading SharePoint package records...</td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No finance SharePoint package records found.</td>
                  </tr>
                ) : (
                  documents.map((record) => (
                    <tr key={record.id}>
                      <td>{record.title}</td>
                      <td>{record.documentType}</td>
                      <td>{record.sourceEntityType || '-'}</td>
                      <td>
                        <span className={statusClass(record.status)}>{record.status}</span>
                      </td>
                      <td>{record.confidentiality}</td>
                      <td>{record.uploadedBy || '-'}</td>
                      <td>{record.approvedBy || '-'}</td>
                      <td>{record.sharePointUrl || '-'}</td>
                      <td>{formatDate(record.createdAt)}</td>
                      <td>
                        <div className="finance-inline-actions">
                          {record.status === 'DRAFT' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleReady(record)}
                              type="button"
                            >
                              Mark Ready
                            </button>
                          )}

                          {record.status === 'APPROVED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handlePublished(record)}
                              type="button"
                            >
                              Mark Published
                            </button>
                          )}

                          {!['DRAFT', 'APPROVED'].includes(record.status) && (
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
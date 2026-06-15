'use client';

import { useEffect, useMemo, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  approveFinanceEvidence,
  getFinanceEvidence,
  markFinanceEvidencePublishReady,
  markFinanceEvidenceUploaded,
  type FinanceEvidenceRecord,
  type FinanceEvidenceResponse,
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

  if (['APPROVED', 'READY_FOR_SHAREPOINT', 'PUBLISHED'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED'].includes(value)) {
    return 'status-pill danger';
  }

  if (['REQUIRED', 'UPLOADED'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

const emptyResponse: FinanceEvidenceResponse = {
  summary: {
    totalRecords: 0,
    required: 0,
    uploaded: 0,
    approved: 0,
    published: 0,
  },
  evidence: [],
};

export default function FinanceApprovalEvidencePage() {
  const [data, setData] = useState<FinanceEvidenceResponse>(emptyResponse);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadEvidence() {
    setLoading(true);
    setError('');

    try {
      const response = await getFinanceEvidence();
      setData(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to load finance evidence.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvidence();
  }, []);

  const evidence = useMemo(() => data.evidence || [], [data.evidence]);

  async function handleUploaded(record: FinanceEvidenceRecord) {
    setMessage('');
    setError('');

    try {
      await markFinanceEvidenceUploaded(record.id, `DOC-${record.id.slice(0, 8).toUpperCase()}`);
      setMessage(`${record.title} marked as uploaded.`);
      await loadEvidence();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark evidence uploaded.');
    }
  }

  async function handleApprove(record: FinanceEvidenceRecord) {
    setMessage('');
    setError('');

    try {
      await approveFinanceEvidence(record.id);
      setMessage(`${record.title} approved.`);
      await loadEvidence();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve evidence.');
    }
  }

  async function handlePublishReady(record: FinanceEvidenceRecord) {
    setMessage('');
    setError('');

    try {
      await markFinanceEvidencePublishReady(record.id);
      setMessage(`${record.title} marked ready for SharePoint.`);
      await loadEvidence();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark evidence ready for publishing.');
    }
  }

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Finance Workflow</p>
              <h1>Finance Evidence Centre</h1>
              <p className="muted">
                Tracks finance approval evidence, payment evidence, procurement proof of payment,
                invoice support and SharePoint readiness.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadEvidence} type="button">
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
              <span>Required</span>
              <strong>{data.summary.required}</strong>
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
          <h2>Evidence Register</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Evidence Type</th>
                  <th>Title</th>
                  <th>Linked Expense</th>
                  <th>Linked Procurement</th>
                  <th>Status</th>
                  <th>Document ID</th>
                  <th>Notes</th>
                  <th>Created By</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10}>Loading finance evidence...</td>
                  </tr>
                ) : evidence.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No finance evidence records found.</td>
                  </tr>
                ) : (
                  evidence.map((record) => (
                    <tr key={record.id}>
                      <td>{record.evidenceType}</td>
                      <td>{record.title}</td>
                      <td>{record.expenseId || '-'}</td>
                      <td>{record.procurementId || '-'}</td>
                      <td>
                        <span className={statusClass(record.status)}>{record.status}</span>
                      </td>
                      <td>{record.documentId || '-'}</td>
                      <td>{record.notes || '-'}</td>
                      <td>{record.createdBy || '-'}</td>
                      <td>{formatDate(record.createdAt)}</td>
                      <td>
                        <div className="finance-inline-actions">
                          {record.status === 'REQUIRED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleUploaded(record)}
                              type="button"
                            >
                              Mark Uploaded
                            </button>
                          )}

                          {record.status === 'UPLOADED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleApprove(record)}
                              type="button"
                            >
                              Approve
                            </button>
                          )}

                          {record.status === 'APPROVED' && (
                            <button
                              className="btn-secondary"
                              onClick={() => handlePublishReady(record)}
                              type="button"
                            >
                              Publish Ready
                            </button>
                          )}

                          {!['REQUIRED', 'UPLOADED', 'APPROVED'].includes(record.status) && (
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
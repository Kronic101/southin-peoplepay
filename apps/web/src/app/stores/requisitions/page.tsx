'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  StoresRequisitionRecord,
  getStoresRequisitions,
} from '@/lib/stores-api';

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

function statusClass(value?: string | null) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED') return 'status-pill success';
  if (status === 'REJECTED') return 'status-pill danger';
  if (status === 'APPROVER_NOT_CONFIGURED') return 'status-pill danger';

  return 'status-pill warning';
}

export default function StoresRequisitionsPage() {
  const [records, setRecords] = useState<StoresRequisitionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const data = await getStoresRequisitions();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load stores requisitions.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      total: records.length,
      submitted: records.filter((item) => item.status === 'SUBMITTED').length,
      approved: records.filter((item) => item.status === 'APPROVED').length,
      rejected: records.filter((item) => item.status === 'REJECTED').length,
      approverMissing: records.filter((item) => item.status === 'APPROVER_NOT_CONFIGURED').length,
      value: records.reduce((sum, item) => sum + asNumber(item.totalValue), 0),
    };
  }, [records]);

  return (
    <AppShell>
      <RequireStaffRole
        allowedRoles={[
          'ADMIN',
          'DIRECTOR',
          'STORES_OFFICER',
          'PROCUREMENT_OFFICER',
          'ASSET_MANAGER',
          'LINE_MANAGER',
          'SUPERVISOR',
        ]}
      >
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Stores Management</p>
              <h1>Stores Requisitions</h1>
              <p className="muted">
                Create, track and approve stores requisitions through the Southin approval chain.
              </p>
            </div>

            <div className="action-row">
              <Link className="btn" href="/stores/requisitions/new">
                New Requisition
              </Link>

              <button className="btn-secondary" type="button" onClick={loadData}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {error ? <div className="alert error">{error}</div> : null}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Requests</span>
              <strong>{stats.total}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Submitted</span>
              <strong>{stats.submitted}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Approved</span>
              <strong>{stats.approved}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Rejected</span>
              <strong>{stats.rejected}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Missing Approver</span>
              <strong>{stats.approverMissing}</strong>
            </div>

            <div className="finance-summary-card">
              <span>Total Value</span>
              <strong>{money(stats.value)}</strong>
            </div>
          </div>

          <div className="finance-card">
            <h2>Requisition Register</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Requisition</th>
                    <th>Requester</th>
                    <th>Site / Branch</th>
                    <th>Reason</th>
                    <th>Lines</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!records.length ? (
                    <tr>
                      <td colSpan={8}>
                        {loading ? 'Loading stores requisitions...' : 'No stores requisitions found.'}
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <strong>{record.requisitionNo}</strong>
                          <br />
                          <span className="muted">{formatDate(record.submittedAt || record.createdAt)}</span>
                        </td>

                        <td>
                          <strong>{record.requestedBy || '-'}</strong>
                          <br />
                          <span className="muted">{record.requestedByEmail || '-'}</span>
                        </td>

                        <td>
                          <strong>{record.site || '-'}</strong>
                          <br />
                          <span className="muted">{record.branch || '-'}</span>
                        </td>

                        <td>{record.reason || record.description || '-'}</td>

                        <td>{record.lines?.length || 0}</td>

                        <td>{money(record.totalValue)}</td>

                        <td>
                          <span className={statusClass(record.status)}>
                            {record.status}
                          </span>
                        </td>

                        <td>
                          <div className="action-row">
                            <Link className="btn-secondary" href={`/stores/requisitions/${record.id}`}>
                              View
                            </Link>

                            {record.approvalRequestId ? (
                              <Link className="btn-secondary" href="/approvals/inbox">
                                Inbox
                              </Link>
                            ) : null}
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
      </RequireStaffRole>
    </AppShell>
  );
}
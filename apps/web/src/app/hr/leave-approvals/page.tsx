'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function formatDate(value: any) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-ZM', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function fullName(employee: any) {
  return `${employee?.firstName || ''} ${employee?.middleName || ''} ${employee?.lastName || ''}`
    .replace(/\s+/g, ' ')
    .trim();
}

function label(value: any) {
  return String(value || '-').replaceAll('_', ' ');
}

function statusClass(value: string) {
  const status = String(value || '').toUpperCase();

  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELLED') return 'neutral';

  return 'warning';
}

export default function LeaveApprovalsPage() {
  const [supervisorEmail, setSupervisorEmail] = useState('supervisor@southincon.com');
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const summary = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((item) => item.status === 'PENDING_SUPERVISOR').length,
      approved: requests.filter((item) => item.status === 'APPROVED').length,
      rejected: requests.filter((item) => item.status === 'REJECTED').length,
    };
  }, [requests]);

  async function loadRequests() {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/leave/supervisor/requests?email=${encodeURIComponent(supervisorEmail)}`,
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Unable to load leave requests.');
      }

      const returnedRequests =
        result?.requests ||
        result?.items ||
        result?.data ||
        result ||
        [];

      setRequests(Array.isArray(returnedRequests) ? returnedRequests : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load leave requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function reviewRequest(action: 'APPROVE' | 'REJECT') {
    if (!selectedRequest) {
      setError('Please select a leave request first.');
      return;
    }

    setReviewing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `${API_URL}/leave/supervisor/requests/${selectedRequest.id}/review`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            reviewedBy: supervisorEmail,
            reviewComment,
          }),
        },
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Unable to review leave request.');
      }

      setSuccess(result?.message || 'Leave request reviewed successfully.');
      setSelectedRequest(null);
      setReviewComment('');

      await loadRequests();
    } catch (err: any) {
      setError(err?.message || 'Unable to review leave request.');
    } finally {
      setReviewing(false);
    }
  }

  return (
    <main className="employee-portal-page">
      <section className="employee-portal-shell">
        <nav className="employee-portal-nav">
          <div>
            <strong>Southin PeoplePay</strong>
            <span>Supervisor Leave Approvals</span>
          </div>

          <div className="employee-portal-nav-links">
            <Link href="/workbench">Workbench</Link>
            <Link href="/hr/payroll-readiness">Payroll Readiness</Link>
          </div>
        </nav>

        <section className="employee-hero-card">
          <div>
            <div className="hero-kicker">Leave Approvals</div>
            <h1>Supervisor Approval Centre</h1>
            <p>
              Review employee leave requests submitted through the self-service portal. Approvals
              and rejections are recorded for HR and payroll audit reference.
            </p>
          </div>

          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
        </section>

        {error && (
          <div className="notice danger" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="notice success" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <section className="employee-panel" style={{ marginBottom: '1rem' }}>
          <h2>Supervisor Filter</h2>

          <div className="employee-form-grid">
            <label>
              Supervisor Email
              <input
                type="email"
                value={supervisorEmail}
                onChange={(event) => setSupervisorEmail(event.target.value)}
                placeholder="supervisor@southincon.com"
              />
            </label>

            <div className="form-actions" style={{ alignItems: 'end' }}>
              <button className="btn" type="button" onClick={loadRequests} disabled={loading}>
                {loading ? 'Loading...' : 'Load Requests'}
              </button>
            </div>
          </div>
        </section>

        <section className="employee-dashboard-grid">
          <div className="employee-panel">
            <h2>Total Requests</h2>
            <div className="leave-summary-card">
              <div>
                <span>All Requests</span>
                <strong>{summary.total}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Pending</h2>
            <div className="leave-summary-card">
              <div>
                <span>Awaiting Review</span>
                <strong>{summary.pending}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Completed</h2>
            <div className="leave-summary-card">
              <div>
                <span>Approved / Rejected</span>
                <strong>{summary.approved + summary.rejected}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Leave Requests</h2>

          {requests.length === 0 ? (
            <div className="notice">No leave requests found for this supervisor email.</div>
          ) : (
            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{fullName(request.employee)}</strong>
                        <br />
                        <span className="muted">{request.employee?.employeeNumber}</span>
                      </td>

                      <td>{label(request.leaveType)}</td>

                      <td>
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </td>

                      <td>{request.totalDays}</td>

                      <td>{request.reason || '-'}</td>

                      <td>
                        <span className={`employee-status ${statusClass(request.status)}`}>
                          {label(request.status)}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewComment(request.reviewComment || '');
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedRequest && (
          <section className="employee-panel" style={{ marginTop: '1rem' }}>
            <h2>Review Selected Request</h2>

            <div className="mini-detail-grid" style={{ marginBottom: '1rem' }}>
              <Detail label="Employee" value={fullName(selectedRequest.employee)} />
              <Detail label="Employee No." value={selectedRequest.employee?.employeeNumber} />
              <Detail label="Leave Type" value={label(selectedRequest.leaveType)} />
              <Detail label="Total Days" value={selectedRequest.totalDays} />
              <Detail
                label="Dates"
                value={`${formatDate(selectedRequest.startDate)} - ${formatDate(
                  selectedRequest.endDate,
                )}`}
              />
              <Detail label="Current Status" value={label(selectedRequest.status)} />
            </div>

            <div className="employee-form-grid">
              <label className="span-2">
                Review Comment
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Add a comment for HR/employee reference"
                  rows={4}
                />
              </label>

              <div className="span-2 form-actions" style={{ gap: '0.75rem' }}>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewComment('');
                  }}
                  disabled={reviewing}
                >
                  Cancel
                </button>

                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => reviewRequest('REJECT')}
                  disabled={reviewing || selectedRequest.status !== 'PENDING_SUPERVISOR'}
                >
                  Reject
                </button>

                <button
                  className="btn"
                  type="button"
                  onClick={() => reviewRequest('APPROVE')}
                  disabled={reviewing || selectedRequest.status !== 'PENDING_SUPERVISOR'}
                >
                  {reviewing ? 'Saving...' : 'Approve'}
                </button>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}
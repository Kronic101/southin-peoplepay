'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { RequireStaffRole } from '@/components/RequireStaffRole';

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
    const pending = requests.filter((item) => item.status === 'PENDING_SUPERVISOR');
    const approved = requests.filter((item) => item.status === 'APPROVED');
    const rejected = requests.filter((item) => item.status === 'REJECTED');

    return {
      total: requests.length,
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      completed: approved.length + rejected.length,
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

      const returnedRequests = result?.requests || result?.items || result?.data || result || [];

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
    <RequireStaffRole
      allowedRoles={['HR_MANAGER', 'DIRECTOR', 'ADMIN', 'LINE_MANAGER', 'SUPERVISOR']}
      title="Supervisor Leave Approval Centre"
      message="Only authorised HR users, supervisors, line managers, directors, and administrators can review leave approvals."
    >
      <main className="employee-portal-page">
        <section className="employee-portal-shell">
          <nav className="employee-portal-nav">
            <div>
              <strong>Southin PeoplePay</strong>
              <span>Supervisor Leave Approvals</span>
            </div>

            <div className="employee-portal-nav-links">
              <Link href="/workbench">Workbench</Link>
              <Link href="/hr/leave-dashboard">Leave Dashboard</Link>
              <Link href="/demo">Demo</Link>
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

            <div className="action-row">
              <Link className="btn-secondary" href="/workbench">
                Back to Workbench
              </Link>

              <Link className="btn" href="/hr/leave-dashboard">
                Open Leave Dashboard
              </Link>
            </div>
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
            <Summary title="Total Requests" label="All requests" value={summary.total} />
            <Summary title="Pending" label="Awaiting review" value={summary.pending} />
            <Summary title="Approved" label="Approved requests" value={summary.approved} />
            <Summary title="Rejected" label="Rejected requests" value={summary.rejected} />
            <Summary title="Completed" label="Approved / rejected" value={summary.completed} />
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
                          <span className="muted">{request.employee?.employeeNumber || '-'}</span>
                        </td>

                        <td>
                          <strong>{label(request.leaveType)}</strong>
                        </td>

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
                              setError('');
                              setSuccess('');
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
              <div className="page-header">
                <div>
                  <h2>Review Leave Request</h2>
                  <p className="muted">
                    Confirm the employee leave request details before approving or rejecting.
                  </p>
                </div>

                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setReviewComment('');
                  }}
                >
                  Close Review
                </button>
              </div>

              <div className="mini-detail-grid">
                <div>
                  <span>Employee</span>
                  <strong>{fullName(selectedRequest.employee)}</strong>
                </div>

                <div>
                  <span>Employee No.</span>
                  <strong>{selectedRequest.employee?.employeeNumber || '-'}</strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{selectedRequest.employee?.department?.name || '-'}</strong>
                </div>

                <div>
                  <span>Job Title</span>
                  <strong>{selectedRequest.employee?.jobTitle?.name || '-'}</strong>
                </div>

                <div>
                  <span>Site</span>
                  <strong>{selectedRequest.employee?.site?.name || '-'}</strong>
                </div>

                <div>
                  <span>Leave Type</span>
                  <strong>{label(selectedRequest.leaveType)}</strong>
                </div>

                <div>
                  <span>Start Date</span>
                  <strong>{formatDate(selectedRequest.startDate)}</strong>
                </div>

                <div>
                  <span>End Date</span>
                  <strong>{formatDate(selectedRequest.endDate)}</strong>
                </div>

                <div>
                  <span>Total Days</span>
                  <strong>{selectedRequest.totalDays}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{label(selectedRequest.status)}</strong>
                </div>
              </div>

              <div className="notice" style={{ marginTop: '1rem' }}>
                <strong>Reason:</strong> {selectedRequest.reason || '-'}
              </div>

              <div className="employee-form-grid" style={{ marginTop: '1rem' }}>
                <label style={{ gridColumn: '1 / -1' }}>
                  Supervisor Comment
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Add approval or rejection comment"
                    rows={4}
                  />
                </label>
              </div>

              {selectedRequest.status === 'PENDING_SUPERVISOR' ? (
                <div className="action-row" style={{ marginTop: '1rem' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => reviewRequest('APPROVE')}
                    disabled={reviewing}
                  >
                    {reviewing ? 'Processing...' : 'Approve Request'}
                  </button>

                  <button
                    className="btn-secondary"
                    type="button"
                    onClick={() => reviewRequest('REJECT')}
                    disabled={reviewing}
                  >
                    {reviewing ? 'Processing...' : 'Reject Request'}
                  </button>
                </div>
              ) : (
                <div className="notice" style={{ marginTop: '1rem' }}>
                  This leave request has already been reviewed and is locked for audit reference.
                </div>
              )}
            </section>
          )}
        </section>
      </main>
    </RequireStaffRole>
  );
}

function Summary({ title, label, value }: { title: string; label: string; value: number }) {
  return (
    <div className="employee-panel">
      <h2>{title}</h2>
      <div className="leave-summary-card">
        <div>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
    </div>
  );
}
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalDelegationRecord,
  createApprovalDelegation,
  getApprovalDelegations,
  getApprovalMatrixOptions,
  toggleApprovalDelegation,
  updateApprovalDelegation,
} from '@/lib/approvals-api';

const emptyForm = {
  id: '',
  approvalRole: 'SITE_MANAGER',
  module: 'STORES',
  workflowType: 'STORES_REQUISITION',
  site: '',
  branch: '',
  fromUserEmail: '',
  fromUserName: '',
  toUserEmail: '',
  toUserName: '',
  reason: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
};

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

function isCurrentlyActive(record: ApprovalDelegationRecord) {
  const now = new Date();
  const start = new Date(record.startsAt);
  const end = new Date(record.endsAt);

  return record.isActive && start <= now && end >= now;
}

export default function ApprovalDelegationsPage() {
  const [records, setRecords] = useState<ApprovalDelegationRecord[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [workflowTypes, setWorkflowTypes] = useState<string[]>([]);
  const [approvalRoles, setApprovalRoles] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [delegations, options] = await Promise.all([
        getApprovalDelegations(),
        getApprovalMatrixOptions(),
      ]);

      setRecords(delegations || []);
      setModules(options.modules || []);
      setWorkflowTypes(options.workflowTypes || []);
      setApprovalRoles(options.approvalRoles || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load approval delegations.');
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
      active: records.filter((item) => item.isActive).length,
      activeNow: records.filter(isCurrentlyActive).length,
      expired: records.filter((item) => new Date(item.endsAt) < new Date()).length,
    };
  }, [records]);

  function editRecord(record: ApprovalDelegationRecord) {
    setForm({
      id: record.id,
      approvalRole: record.approvalRole || '',
      module: record.module || '',
      workflowType: record.workflowType || '',
      site: record.site || '',
      branch: record.branch || '',
      fromUserEmail: record.fromUserEmail || '',
      fromUserName: record.fromUserName || '',
      toUserEmail: record.toUserEmail || '',
      toUserName: record.toUserName || '',
      reason: record.reason || '',
      startsAt: record.startsAt ? record.startsAt.slice(0, 16) : '',
      endsAt: record.endsAt ? record.endsAt.slice(0, 16) : '',
      isActive: record.isActive,
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      if (form.id) {
        await updateApprovalDelegation(form.id, form);
        setMessage('Approval delegation updated successfully.');
      } else {
        await createApprovalDelegation(form);
        setMessage('Approval delegation created successfully.');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to save approval delegation.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    setMessage('');
    setError('');

    try {
      await toggleApprovalDelegation(id);
      setMessage('Delegation status updated.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to toggle delegation.');
    }
  }

  return (
    <AppShell>
      <RequireStaffRole allowedRoles={['ADMIN', 'DIRECTOR']}>
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Approval Delegations</h1>
              <p className="muted">
                Configure temporary out-of-office approval cover for Site Managers, Line Managers,
                Branch Managers, Admin Managers and Directors.
              </p>
            </div>

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={loadData}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div className="summary-grid">
            <div className="finance-summary-card">
              <span>Total Delegations</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Enabled</span>
              <strong>{stats.active}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Active Now</span>
              <strong>{stats.activeNow}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Expired</span>
              <strong>{stats.expired}</strong>
            </div>
          </div>

          <div className="finance-card">
            <h2>{form.id ? 'Edit Delegation' : 'Create Delegation'}</h2>

            <form className="form-grid" onSubmit={handleSubmit}>
              <label>
                Approval Role
                <select
                  value={form.approvalRole}
                  onChange={(event) => setForm({ ...form, approvalRole: event.target.value })}
                >
                  <option value="">Any Role</option>
                  {approvalRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Module
                <select
                  value={form.module}
                  onChange={(event) => setForm({ ...form, module: event.target.value })}
                >
                  <option value="">Any Module</option>
                  {modules.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Workflow
                <select
                  value={form.workflowType}
                  onChange={(event) => setForm({ ...form, workflowType: event.target.value })}
                >
                  <option value="">Any Workflow</option>
                  {workflowTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Site
                <input
                  value={form.site}
                  onChange={(event) => setForm({ ...form, site: event.target.value })}
                  placeholder="Optional site scope"
                />
              </label>

              <label>
                Branch
                <input
                  value={form.branch}
                  onChange={(event) => setForm({ ...form, branch: event.target.value })}
                  placeholder="Optional branch scope"
                />
              </label>

              <label>
                Main Approver Email
                <input
                  value={form.fromUserEmail}
                  onChange={(event) => setForm({ ...form, fromUserEmail: event.target.value })}
                  placeholder="main.approver@southincon.com"
                  required
                />
              </label>

              <label>
                Main Approver Name
                <input
                  value={form.fromUserName}
                  onChange={(event) => setForm({ ...form, fromUserName: event.target.value })}
                  placeholder="Main approver"
                />
              </label>

              <label>
                Delegate Email
                <input
                  value={form.toUserEmail}
                  onChange={(event) => setForm({ ...form, toUserEmail: event.target.value })}
                  placeholder="delegate@southincon.com"
                  required
                />
              </label>

              <label>
                Delegate Name
                <input
                  value={form.toUserName}
                  onChange={(event) => setForm({ ...form, toUserName: event.target.value })}
                  placeholder="Delegate approver"
                />
              </label>

              <label>
                Starts At
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
                  required
                />
              </label>

              <label>
                Ends At
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
                  required
                />
              </label>

              <label>
                Reason
                <textarea
                  value={form.reason}
                  onChange={(event) => setForm({ ...form, reason: event.target.value })}
                  placeholder="e.g. Annual leave, business travel, acting appointment"
                />
              </label>

              <label>
                Active
                <select
                  value={form.isActive ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.value === 'YES' })
                  }
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </label>

              <div className="form-actions">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : form.id ? 'Update Delegation' : 'Create Delegation'}
                </button>

                <button className="btn-secondary" type="button" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </form>
          </div>

          <div className="finance-card">
            <h2>Delegation Register</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Scope</th>
                    <th>Main Approver</th>
                    <th>Delegate</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!records.length ? (
                    <tr>
                      <td colSpan={7}>No approval delegations found.</td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.approvalRole || 'Any Role'}</td>
                        <td>
                          <strong>{record.module || 'Any Module'}</strong>
                          <br />
                          <span className="muted">
                            {record.workflowType || 'Any Workflow'} · {record.site || 'Any Site'} ·{' '}
                            {record.branch || 'Any Branch'}
                          </span>
                        </td>
                        <td>
                          <strong>{record.fromUserName || '-'}</strong>
                          <br />
                          <span className="muted">{record.fromUserEmail}</span>
                        </td>
                        <td>
                          <strong>{record.toUserName || '-'}</strong>
                          <br />
                          <span className="muted">{record.toUserEmail}</span>
                        </td>
                        <td>
                          {formatDate(record.startsAt)}
                          <br />
                          <span className="muted">to {formatDate(record.endsAt)}</span>
                        </td>
                        <td>
                          <span
                            className={
                              isCurrentlyActive(record)
                                ? 'status-pill success'
                                : record.isActive
                                  ? 'status-pill warning'
                                  : 'status-pill danger'
                            }
                          >
                            {isCurrentlyActive(record)
                              ? 'ACTIVE NOW'
                              : record.isActive
                                ? 'ENABLED'
                                : 'DISABLED'}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => editRecord(record)}
                            >
                              Edit
                            </button>

                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => handleToggle(record.id)}
                            >
                              {record.isActive ? 'Disable' : 'Enable'}
                            </button>
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
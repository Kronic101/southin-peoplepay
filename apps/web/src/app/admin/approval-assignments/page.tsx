'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalApproverAssignmentRecord,
  createApprovalAssignment,
  getApprovalAssignments,
  getApprovalMatrixOptions,
  toggleApprovalAssignment,
  updateApprovalAssignment,
} from '@/lib/approvals-api';

const emptyForm = {
  id: '',
  module: 'STORES',
  workflowType: 'STORES_REQUISITION',
  approvalRole: 'SITE_MANAGER',
  site: '',
  branch: '',
  assigneeType: 'USER',
  userEmail: '',
  userName: '',
  microsoftUserId: '',
  entraGroupName: '',
  entraGroupId: '',
  isPrimary: true,
  isDefault: false,
  priority: '1',
  effectiveFrom: '',
  effectiveTo: '',
};

export default function ApprovalAssignmentsPage() {
  const [records, setRecords] = useState<ApprovalApproverAssignmentRecord[]>([]);
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
      const [assignments, options] = await Promise.all([
        getApprovalAssignments(),
        getApprovalMatrixOptions(),
      ]);

      setRecords(assignments || []);
      setModules(options.modules || []);
      setWorkflowTypes(options.workflowTypes || []);
      setApprovalRoles(options.approvalRoles || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load approver assignments.');
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
      userAssignments: records.filter((item) => item.assigneeType === 'USER').length,
      groupAssignments: records.filter((item) => item.assigneeType === 'ENTRA_GROUP').length,
      defaults: records.filter((item) => item.isDefault).length,
    };
  }, [records]);

  function editRecord(record: ApprovalApproverAssignmentRecord) {
    setForm({
      id: record.id,
      module: record.module || '',
      workflowType: record.workflowType || '',
      approvalRole: record.approvalRole,
      site: record.site || '',
      branch: record.branch || '',
      assigneeType: record.assigneeType || 'USER',
      userEmail: record.userEmail || '',
      userName: record.userName || '',
      microsoftUserId: record.microsoftUserId || '',
      entraGroupName: record.entraGroupName || '',
      entraGroupId: record.entraGroupId || '',
      isPrimary: record.isPrimary,
      isDefault: record.isDefault,
      priority: String(record.priority || 1),
      effectiveFrom: record.effectiveFrom ? record.effectiveFrom.slice(0, 16) : '',
      effectiveTo: record.effectiveTo ? record.effectiveTo.slice(0, 16) : '',
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
      const payload = {
        ...form,
        isPrimary: form.isPrimary,
        isDefault: form.isDefault,
        priority: Number(form.priority || 1),
      };

      if (form.id) {
        await updateApprovalAssignment(form.id, payload);
        setMessage('Approver assignment updated successfully.');
      } else {
        await createApprovalAssignment(payload);
        setMessage('Approver assignment created successfully.');
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to save approver assignment.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    setMessage('');
    setError('');

    try {
      await toggleApprovalAssignment(id);
      setMessage('Approver assignment status updated.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to toggle assignment.');
    }
  }

  return (
    <AppShell>
      <RequireStaffRole allowedRoles={['ADMIN', 'DIRECTOR']}>
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Approver Assignments</h1>
              <p className="muted">
                Map approval roles to Microsoft 365 users or Entra security groups by site,
                branch, workflow and module.
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

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Assignments</span>
              <strong>{stats.total}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Active</span>
              <strong>{stats.active}</strong>
            </div>
            <div className="finance-summary-card">
              <span>User Based</span>
              <strong>{stats.userAssignments}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Group Based</span>
              <strong>{stats.groupAssignments}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Default Fallbacks</span>
              <strong>{stats.defaults}</strong>
            </div>
          </div>

          <div className="finance-card">
            <h2>{form.id ? 'Edit Assignment' : 'Create Assignment'}</h2>

            <form className="form-grid" onSubmit={handleSubmit}>
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
                Approval Role
                <select
                  value={form.approvalRole}
                  onChange={(event) => setForm({ ...form, approvalRole: event.target.value })}
                  required
                >
                  {approvalRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Site
                <input
                  value={form.site}
                  onChange={(event) => setForm({ ...form, site: event.target.value })}
                  placeholder="e.g. Solwezi Head Office"
                />
              </label>

              <label>
                Branch
                <input
                  value={form.branch}
                  onChange={(event) => setForm({ ...form, branch: event.target.value })}
                  placeholder="e.g. KMDC"
                />
              </label>

              <label>
                Assignee Type
                <select
                  value={form.assigneeType}
                  onChange={(event) => setForm({ ...form, assigneeType: event.target.value })}
                >
                  <option value="USER">Specific Microsoft 365 User</option>
                  <option value="ENTRA_GROUP">Microsoft Entra Security Group</option>
                  <option value="ROLE_DYNAMIC">Dynamic Resolver</option>
                </select>
              </label>

              {form.assigneeType === 'USER' ? (
                <>
                  <label>
                    User Email
                    <input
                      value={form.userEmail}
                      onChange={(event) => setForm({ ...form, userEmail: event.target.value })}
                      placeholder="site.manager@southincon.com"
                    />
                  </label>

                  <label>
                    User Name
                    <input
                      value={form.userName}
                      onChange={(event) => setForm({ ...form, userName: event.target.value })}
                      placeholder="Site Manager"
                    />
                  </label>

                  <label>
                    Microsoft Object ID
                    <input
                      value={form.microsoftUserId}
                      onChange={(event) =>
                        setForm({ ...form, microsoftUserId: event.target.value })
                      }
                      placeholder="Optional until Microsoft login is enabled"
                    />
                  </label>
                </>
              ) : null}

              {form.assigneeType === 'ENTRA_GROUP' ? (
                <>
                  <label>
                    Entra Group Name
                    <input
                      value={form.entraGroupName}
                      onChange={(event) =>
                        setForm({ ...form, entraGroupName: event.target.value })
                      }
                      placeholder="Southin-Approvers-Site-Managers"
                    />
                  </label>

                  <label>
                    Entra Group ID
                    <input
                      value={form.entraGroupId}
                      onChange={(event) =>
                        setForm({ ...form, entraGroupId: event.target.value })
                      }
                      placeholder="Optional object ID"
                    />
                  </label>
                </>
              ) : null}

              <label>
                Priority
                <input
                  type="number"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                />
              </label>

              <label>
                Primary
                <select
                  value={form.isPrimary ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setForm({ ...form, isPrimary: event.target.value === 'YES' })
                  }
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </label>

              <label>
                Default Fallback
                <select
                  value={form.isDefault ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setForm({ ...form, isDefault: event.target.value === 'YES' })
                  }
                >
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </label>

              <label>
                Effective From
                <input
                  type="datetime-local"
                  value={form.effectiveFrom}
                  onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })}
                />
              </label>

              <label>
                Effective To
                <input
                  type="datetime-local"
                  value={form.effectiveTo}
                  onChange={(event) => setForm({ ...form, effectiveTo: event.target.value })}
                />
              </label>

              <div className="form-actions">
                <button className="btn" type="submit" disabled={saving}>
                  {saving ? 'Saving...' : form.id ? 'Update Assignment' : 'Create Assignment'}
                </button>
                <button className="btn-secondary" type="button" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </form>
          </div>

          <div className="finance-card">
            <h2>Assignment Register</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Scope</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!records.length ? (
                    <tr>
                      <td colSpan={6}>No approver assignments found.</td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.approvalRole}</td>
                        <td>
                          <strong>{record.module || 'Any Module'}</strong>
                          <br />
                          <span className="muted">
                            {record.workflowType || 'Any Workflow'} · {record.site || 'Any Site'} ·{' '}
                            {record.branch || 'Any Branch'}
                          </span>
                        </td>
                        <td>
                          <strong>{record.assigneeType}</strong>
                          <br />
                          <span className="muted">
                            {record.userEmail ||
                              record.entraGroupName ||
                              record.entraGroupId ||
                              'Dynamic resolver'}
                          </span>
                        </td>
                        <td>{record.priority}</td>
                        <td>
                          <span
                            className={record.isActive ? 'status-pill success' : 'status-pill danger'}
                          >
                            {record.isActive ? 'ACTIVE' : 'INACTIVE'}
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
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import AppShell from '@/components/AppShell';
import { RequireStaffRole } from '@/components/RequireStaffRole';
import {
  ApprovalMatrixRuleRecord,
  ApprovalUserRecord,
  createApprovalMatrixRule,
  getApprovalMatrixOptions,
  getApprovalMatrixRules,
  getApprovalUsers,
  seedApprovalMatrixDefaults,
  toggleApprovalMatrixRule,
  updateApprovalMatrixRule,
  upsertApprovalUser,
} from '@/lib/approvals-api';

type StepDraft = {
  sequence: number;
  role: string;
  approverName: string;
  approverEmail: string;
  required: boolean;
};

const emptyStep: StepDraft = {
  sequence: 1,
  role: 'FINANCE_MANAGER',
  approverName: '',
  approverEmail: '',
  required: true,
};

const emptyRuleForm = {
  id: '',
  module: 'FINANCE',
  workflowType: 'EXPENSE_REQUEST',
  name: '',
  description: '',
  site: '',
  branch: '',
  minAmount: '',
  maxAmount: '',
  requiresFinance: false,
  requiresDirector: false,
  isActive: true,
};

const emptyUserForm = {
  email: '',
  displayName: '',
  microsoftUserId: '',
  role: 'FINANCE_MANAGER',
};

function money(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';

  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function safeSteps(value: any): StepDraft[] {
  const raw = Array.isArray(value) ? value : [];

  return raw.map((item: any, index: number) => ({
    sequence: Number(item.sequence || index + 1),
    role: String(item.role || 'FINANCE_MANAGER'),
    approverName: String(item.approverName || ''),
    approverEmail: String(item.approverEmail || ''),
    required: item.required === undefined ? true : Boolean(item.required),
  }));
}

export default function ApprovalMatrixAdminPage() {
  const [rules, setRules] = useState<ApprovalMatrixRuleRecord[]>([]);
  const [users, setUsers] = useState<ApprovalUserRecord[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [workflowTypes, setWorkflowTypes] = useState<string[]>([]);
  const [approvalRoles, setApprovalRoles] = useState<string[]>([]);

  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [steps, setSteps] = useState<StepDraft[]>([{ ...emptyStep }]);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const [loading, setLoading] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [ruleResult, optionResult, userResult] = await Promise.all([
        getApprovalMatrixRules(),
        getApprovalMatrixOptions(),
        getApprovalUsers(),
      ]);

      setRules(ruleResult || []);
      setModules(optionResult.modules || []);
      setWorkflowTypes(optionResult.workflowTypes || []);
      setApprovalRoles(optionResult.approvalRoles || []);
      setUsers(userResult || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load approval matrix.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    return {
      totalRules: rules.length,
      activeRules: rules.filter((item) => item.isActive).length,
      financeRules: rules.filter((item) => item.requiresFinance).length,
      directorRules: rules.filter((item) => item.requiresDirector).length,
      approvers: users.length,
    };
  }, [rules, users]);

  function editRule(rule: ApprovalMatrixRuleRecord) {
    setRuleForm({
      id: rule.id,
      module: rule.module,
      workflowType: rule.workflowType,
      name: rule.name,
      description: rule.description || '',
      site: rule.site || '',
      branch: rule.branch || '',
      minAmount: rule.minAmount === null || rule.minAmount === undefined ? '' : String(rule.minAmount),
      maxAmount: rule.maxAmount === null || rule.maxAmount === undefined ? '' : String(rule.maxAmount),
      requiresFinance: rule.requiresFinance,
      requiresDirector: rule.requiresDirector,
      isActive: rule.isActive,
    });

    const parsedSteps = safeSteps(rule.approvalSteps);
    setSteps(parsedSteps.length ? parsedSteps : [{ ...emptyStep }]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetRuleForm() {
    setRuleForm(emptyRuleForm);
    setSteps([{ ...emptyStep }]);
  }

  function updateStep(index: number, field: keyof StepDraft, value: any) {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              [field]: value,
            }
          : step,
      ),
    );
  }

  function addStep() {
    setSteps((current) => [
      ...current,
      {
        ...emptyStep,
        sequence: current.length + 1,
        role: approvalRoles[0] || 'FINANCE_MANAGER',
      },
    ]);
  }

  function removeStep(index: number) {
    setSteps((current) =>
      current
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex) => ({
          ...step,
          sequence: stepIndex + 1,
        })),
    );
  }

  async function handleSaveRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRule(true);
    setMessage('');
    setError('');

    try {
      const approvalSteps = steps.map((step, index) => ({
        sequence: index + 1,
        role: step.role,
        approverName: step.approverName || undefined,
        approverEmail: step.approverEmail || undefined,
        required: step.required,
      }));

      const payload = {
        ...ruleForm,
        approvalSteps,
      };

      if (ruleForm.id) {
        await updateApprovalMatrixRule(ruleForm.id, payload);
        setMessage('Approval matrix rule updated successfully.');
      } else {
        await createApprovalMatrixRule(payload);
        setMessage('Approval matrix rule created successfully.');
      }

      resetRuleForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to save approval matrix rule.');
    } finally {
      setSavingRule(false);
    }
  }

  async function handleSeedDefaults() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await seedApprovalMatrixDefaults();
      setMessage('Default approval matrix seeded successfully.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to seed default approval matrix.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRule(id: string) {
    setMessage('');
    setError('');

    try {
      await toggleApprovalMatrixRule(id);
      setMessage('Approval rule status updated.');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to update approval rule status.');
    }
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUser(true);
    setMessage('');
    setError('');

    try {
      await upsertApprovalUser(userForm);
      setMessage('Approver user saved successfully.');
      setUserForm(emptyUserForm);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Unable to save approver user.');
    } finally {
      setSavingUser(false);
    }
  }

  return (
    <AppShell>
      <RequireStaffRole allowedRoles={['ADMIN', 'DIRECTOR']}>
        <section className="finance-page">
          <div className="finance-card finance-hero-card">
            <div>
              <p className="eyebrow">Administration</p>
              <h1>Approval Matrix</h1>
              <p className="muted">
                Manage approval routing for Finance, Procurement, Fleet, Asset Management, Stores,
                Payroll and Director approvals.
              </p>
            </div>

            <div className="action-row">
              <button className="btn-secondary" type="button" onClick={loadData}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button className="btn" type="button" onClick={handleSeedDefaults}>
                Seed Defaults
              </button>
            </div>
          </div>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{error}</div> : null}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Rules</span>
              <strong>{stats.totalRules}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Active Rules</span>
              <strong>{stats.activeRules}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Finance Rules</span>
              <strong>{stats.financeRules}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Director Rules</span>
              <strong>{stats.directorRules}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approvers</span>
              <strong>{stats.approvers}</strong>
            </div>
          </div>

          <div className="finance-card">
            <h2>{ruleForm.id ? 'Edit Approval Rule' : 'Create Approval Rule'}</h2>

            <form className="form-grid" onSubmit={handleSaveRule}>
              <label>
                Module
                <select
                  value={ruleForm.module}
                  onChange={(event) => setRuleForm({ ...ruleForm, module: event.target.value })}
                >
                  {modules.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Workflow Type
                <select
                  value={ruleForm.workflowType}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, workflowType: event.target.value })
                  }
                >
                  {workflowTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Rule Name
                <input
                  value={ruleForm.name}
                  onChange={(event) => setRuleForm({ ...ruleForm, name: event.target.value })}
                  placeholder="e.g. Fleet Cost Approval"
                  required
                />
              </label>

              <label>
                Site
                <input
                  value={ruleForm.site}
                  onChange={(event) => setRuleForm({ ...ruleForm, site: event.target.value })}
                  placeholder="Optional site"
                />
              </label>

              <label>
                Branch
                <input
                  value={ruleForm.branch}
                  onChange={(event) => setRuleForm({ ...ruleForm, branch: event.target.value })}
                  placeholder="Optional branch"
                />
              </label>

              <label>
                Minimum Amount
                <input
                  type="number"
                  value={ruleForm.minAmount}
                  onChange={(event) => setRuleForm({ ...ruleForm, minAmount: event.target.value })}
                  placeholder="0"
                />
              </label>

              <label>
                Maximum Amount
                <input
                  type="number"
                  value={ruleForm.maxAmount}
                  onChange={(event) => setRuleForm({ ...ruleForm, maxAmount: event.target.value })}
                  placeholder="Optional"
                />
              </label>

              <label>
                Description
                <textarea
                  value={ruleForm.description}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, description: event.target.value })
                  }
                  placeholder="Describe when this approval rule should apply."
                />
              </label>

              <label>
                Requires Finance
                <select
                  value={ruleForm.requiresFinance ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, requiresFinance: event.target.value === 'YES' })
                  }
                >
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </label>

              <label>
                Requires Director
                <select
                  value={ruleForm.requiresDirector ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, requiresDirector: event.target.value === 'YES' })
                  }
                >
                  <option value="NO">No</option>
                  <option value="YES">Yes</option>
                </select>
              </label>

              <label>
                Active
                <select
                  value={ruleForm.isActive ? 'YES' : 'NO'}
                  onChange={(event) =>
                    setRuleForm({ ...ruleForm, isActive: event.target.value === 'YES' })
                  }
                >
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </label>

              <div className="form-actions">
                <button className="btn" type="submit" disabled={savingRule}>
                  {savingRule ? 'Saving...' : ruleForm.id ? 'Update Rule' : 'Create Rule'}
                </button>
                <button className="btn-secondary" type="button" onClick={resetRuleForm}>
                  Clear
                </button>
              </div>
            </form>

            <h3 style={{ marginTop: '1.5rem' }}>Approval Steps</h3>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Role</th>
                    <th>Approver Name</th>
                    <th>Approver Email</th>
                    <th>Required</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((step, index) => (
                    <tr key={`${step.sequence}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <select
                          value={step.role}
                          onChange={(event) => updateStep(index, 'role', event.target.value)}
                        >
                          {approvalRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          value={step.approverName}
                          onChange={(event) =>
                            updateStep(index, 'approverName', event.target.value)
                          }
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <input
                          value={step.approverEmail}
                          onChange={(event) =>
                            updateStep(index, 'approverEmail', event.target.value)
                          }
                          placeholder="Optional"
                        />
                      </td>
                      <td>
                        <select
                          value={step.required ? 'YES' : 'NO'}
                          onChange={(event) =>
                            updateStep(index, 'required', event.target.value === 'YES')
                          }
                        >
                          <option value="YES">Yes</option>
                          <option value="NO">No</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => removeStep(index)}
                          disabled={steps.length === 1}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="btn-secondary" type="button" onClick={addStep}>
              Add Approval Step
            </button>
          </div>

          <div className="finance-card">
            <h2>Named Microsoft 365 Approvers</h2>
            <p className="muted">
              Add specific Microsoft 365 users who should be available for Finance, Asset, Stores,
              Fleet, Procurement and Director approvals.
            </p>

            <form className="form-grid" onSubmit={handleSaveUser}>
              <label>
                Email
                <input
                  value={userForm.email}
                  onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                  placeholder="finance@southincon.com"
                  required
                />
              </label>

              <label>
                Display Name
                <input
                  value={userForm.displayName}
                  onChange={(event) =>
                    setUserForm({ ...userForm, displayName: event.target.value })
                  }
                  placeholder="Finance Manager"
                  required
                />
              </label>

              <label>
                Microsoft Object ID
                <input
                  value={userForm.microsoftUserId}
                  onChange={(event) =>
                    setUserForm({ ...userForm, microsoftUserId: event.target.value })
                  }
                  placeholder="Optional until Entra is connected"
                />
              </label>

              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                >
                  {approvalRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-actions">
                <button className="btn" type="submit" disabled={savingUser}>
                  {savingUser ? 'Saving...' : 'Save Approver'}
                </button>
              </div>
            </form>
          </div>

          <div className="finance-card">
            <h2>Approval Matrix Rules</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Module</th>
                    <th>Workflow</th>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Steps</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!rules.length ? (
                    <tr>
                      <td colSpan={7}>No approval matrix rules found.</td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id}>
                        <td>{rule.module}</td>
                        <td>{rule.workflowType}</td>
                        <td>
                          <strong>{rule.name}</strong>
                          <br />
                          <span className="muted">{rule.description || '-'}</span>
                        </td>
                        <td>
                          {money(rule.minAmount)} - {money(rule.maxAmount)}
                        </td>
                        <td>{safeSteps(rule.approvalSteps).length}</td>
                        <td>
                          <span className={rule.isActive ? 'status-pill success' : 'status-pill danger'}>
                            {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td>
                          <div className="action-row">
                            <button className="btn-secondary" type="button" onClick={() => editRule(rule)}>
                              Edit
                            </button>
                            <button
                              className="btn-secondary"
                              type="button"
                              onClick={() => handleToggleRule(rule.id)}
                            >
                              {rule.isActive ? 'Disable' : 'Enable'}
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

          <div className="finance-card">
            <h2>Approver Register</h2>

            <div className="employee-table-wrap">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Microsoft Object ID</th>
                    <th>Roles</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!users.length ? (
                    <tr>
                      <td colSpan={5}>No approval users found.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.displayName}</td>
                        <td>{user.email || '-'}</td>
                        <td>{user.microsoftUserId || '-'}</td>
                        <td>
                          {(user.roles || [])
                            .map((item) => item.role?.name)
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </td>
                        <td>
                          <span className={user.isActive ? 'status-pill success' : 'status-pill danger'}>
                            {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
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
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Finance Expense Capture and Approval Workflow
 * --------------------------------------------------------------------
 * Purpose:
 * This page controls non-payroll operational expenses such as transport,
 * PPE, welfare, administration, bank charges, project support, and other
 * Finance provisions.
 *
 * Current phase:
 * - Uses local demo state.
 *
 * Future phase:
 * - Expenses will be stored in Supabase/PostgreSQL.
 * - Approval routing will use RBAC rules:
 *   Finance Manager -> Director for high-value expenses.
 * - Evidence will link to SharePoint records.
 */

type ExpenseStatus = 'Submitted' | 'Approved' | 'Rejected' | 'Paid';

type EvidenceStatus = 'Required' | 'Ready for SharePoint' | 'Published';

type ExpenseRecord = {
  id: string;
  category: string;
  description: string;
  amount: number;
  department: string;
  site: string;
  payee: string;
  requestedBy: string;
  submittedDate: string;
  status: ExpenseStatus;
  evidenceStatus: EvidenceStatus;
  financeComment?: string;
};

const seedExpenses: ExpenseRecord[] = [
  {
    id: 'exp-001',
    category: 'Transport',
    description: 'Monthly transport provision for operational movement',
    amount: 2500,
    department: 'Operations',
    site: 'Project Site',
    payee: 'Internal Transport Provision',
    requestedBy: 'Operations Officer',
    submittedDate: '2026-06-12',
    status: 'Submitted',
    evidenceStatus: 'Required',
  },
  {
    id: 'exp-002',
    category: 'PPE / Uniforms',
    description: 'PPE replacement provision for active workforce',
    amount: 1800,
    department: 'HR',
    site: 'Main Office',
    payee: 'PPE Supplier',
    requestedBy: 'HR / Operations',
    submittedDate: '2026-06-12',
    status: 'Approved',
    evidenceStatus: 'Ready for SharePoint',
    financeComment: 'Approved for payment preparation.',
  },
];

function money(value: number) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function statusClass(status: string) {
  if (status === 'Approved' || status === 'Paid' || status === 'Ready for SharePoint') {
    return 'employee-status success';
  }

  if (status === 'Rejected') return 'employee-status danger';
  if (status === 'Published') return 'employee-status success';

  return 'employee-status warning';
}

export default function FinanceExpensesPage() {
  const [records, setRecords] = useState(seedExpenses);

  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    department: '',
    site: '',
    payee: '',
    requestedBy: '',
  });

  const totals = useMemo(() => {
    return {
      totalValue: records.reduce((sum, item) => sum + item.amount, 0),
      submitted: records.filter((item) => item.status === 'Submitted').length,
      approved: records.filter((item) => item.status === 'Approved').length,
      paid: records.filter((item) => item.status === 'Paid').length,
    };
  }, [records]);

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount || 0);

    if (!form.category.trim() || !form.description.trim() || amount <= 0) {
      alert('Please enter category, description, and a valid amount.');
      return;
    }

    const record: ExpenseRecord = {
      id: crypto.randomUUID(),
      category: form.category.trim(),
      description: form.description.trim(),
      amount,
      department: form.department.trim() || 'Finance',
      site: form.site.trim() || 'Main Office',
      payee: form.payee.trim() || 'To confirm',
      requestedBy: form.requestedBy.trim() || 'Finance User',
      submittedDate: new Date().toISOString().slice(0, 10),
      status: 'Submitted',
      evidenceStatus: 'Required',
    };

    setRecords((current) => [record, ...current]);

    setForm({
      category: '',
      description: '',
      amount: '',
      department: '',
      site: '',
      payee: '',
      requestedBy: '',
    });
  }

  function approveExpense(id: string) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Approved',
              evidenceStatus: 'Ready for SharePoint',
              financeComment: 'Approved by Finance for payment preparation.',
            }
          : item,
      ),
    );
  }

  function rejectExpense(id: string) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Rejected',
              evidenceStatus: 'Required',
              financeComment: 'Rejected by Finance. Request requires correction or further justification.',
            }
          : item,
      ),
    );
  }

  function markPaid(id: string) {
    setRecords((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'Paid',
              evidenceStatus: 'Published',
              financeComment: 'Payment completed and evidence ready for Finance records.',
            }
          : item,
      ),
    );
  }

  return (
    <AppShell>
      <section className="card wide-page-card">
        <PageHeader
          eyebrow="Finance Workflow"
          title="Expense Capture and Approval"
          description="Capture non-payroll operational expenses, route approvals, mark payments, and track evidence readiness."
        />

        <div className="action-row" style={{ marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>

          <Link className="btn-secondary" href="/finance/approval-evidence">
            Finance Evidence
          </Link>

          <Link className="btn" href="/finance/sharepoint-package">
            SharePoint Package
          </Link>
        </div>

        <Notice>
          This page starts the controlled expense workflow. The next API phase will store these
          records in Supabase and route approvals to Finance Manager, Director, and SharePoint
          evidence storage depending on value and category.
        </Notice>

        <section className="finance-kpi-grid">
          <div className="employee-panel">
            <h2>Total Expenses</h2>
            <div className="leave-summary-card">
              <span>Registered value</span>
              <strong>{money(totals.totalValue)}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Submitted</h2>
            <div className="leave-summary-card">
              <span>Awaiting approval</span>
              <strong>{totals.submitted}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Approved</h2>
            <div className="leave-summary-card">
              <span>Approved expenses</span>
              <strong>{totals.approved}</strong>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Paid</h2>
            <div className="leave-summary-card">
              <span>Payment completed</span>
              <strong>{totals.paid}</strong>
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Submit Expense</h2>

          <form className="employee-form-grid" onSubmit={submitExpense}>
            <label>
              Category
              <input
                value={form.category}
                onChange={(event) => updateField('category', event.target.value)}
                placeholder="Example: Transport"
              />
            </label>

            <label>
              Amount
              <input
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                placeholder="Example: 2500"
                inputMode="decimal"
              />
            </label>

            <label>
              Department
              <input
                value={form.department}
                onChange={(event) => updateField('department', event.target.value)}
                placeholder="Example: Operations"
              />
            </label>

            <label>
              Site
              <input
                value={form.site}
                onChange={(event) => updateField('site', event.target.value)}
                placeholder="Example: Project Site"
              />
            </label>

            <label>
              Payee
              <input
                value={form.payee}
                onChange={(event) => updateField('payee', event.target.value)}
                placeholder="Example: Employee / Supplier"
              />
            </label>

            <label>
              Requested By
              <input
                value={form.requestedBy}
                onChange={(event) => updateField('requestedBy', event.target.value)}
                placeholder="Example: Finance Manager"
              />
            </label>

            <label className="form-wide">
              Description / Justification
              <textarea
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Briefly describe the expense and why it is required"
                rows={4}
              />
            </label>

            <div className="form-wide action-row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn" type="submit">
                Submit Expense
              </button>
            </div>
          </form>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <h2>Expense Approval Register</h2>
          <p className="muted">
            Finance can approve, reject, mark paid, and track evidence status from this register.
          </p>

          <div className="record-card-list">
            {records.map((record) => (
              <article className="workflow-record-card" key={record.id}>
                <div className="workflow-record-grid">
                  <div className="leave-summary-card">
                    <span>Category</span>
                    <strong>{record.category}</strong>
                  </div>

                  <div className="leave-summary-card wide-field">
                    <span>Description</span>
                    <strong>{record.description}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Amount</span>
                    <strong>{money(record.amount)}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Department</span>
                    <strong>{record.department}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Site</span>
                    <strong>{record.site}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Payee</span>
                    <strong>{record.payee}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Requested By</span>
                    <strong>{record.requestedBy}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Submitted</span>
                    <strong>{new Date(record.submittedDate).toLocaleDateString()}</strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Status</span>
                    <strong>
                      <span className={statusClass(record.status)}>{record.status}</span>
                    </strong>
                  </div>

                  <div className="leave-summary-card">
                    <span>Evidence</span>
                    <strong>
                      <span className={statusClass(record.evidenceStatus)}>
                        {record.evidenceStatus}
                      </span>
                    </strong>
                  </div>
                </div>

                {record.financeComment && (
                  <div className="notice" style={{ marginTop: '1rem' }}>
                    <strong>Finance Comment</strong>
                    <br />
                    {record.financeComment}
                  </div>
                )}

                <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                  {record.status === 'Submitted' && (
                    <>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => approveExpense(record.id)}
                      >
                        Approve
                      </button>

                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => rejectExpense(record.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {record.status === 'Approved' && (
                    <button className="btn" type="button" onClick={() => markPaid(record.id)}>
                      Mark Paid
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

/**
 * Southin PeoplePay - Finance Expense Workflow
 *
 * Purpose:
 * This page is the first working Finance expense approval workflow.
 * It currently stores records in browser localStorage for demo/testing.
 *
 * Future API phase:
 * - Move ExpenseRecord into Prisma/Supabase.
 * - Add attachment uploads for invoices/receipts.
 * - Route approvals using the Approval Matrix.
 * - Publish approved evidence to SharePoint Finance libraries.
 *
 * Current workflow:
 * DRAFT/SUBMITTED -> APPROVED -> PAID
 * Rejected items remain REJECTED and are not paid.
 */

type ExpenseStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

type EvidenceStatus = 'NOT_UPLOADED' | 'REQUIRED' | 'READY_FOR_SHAREPOINT' | 'PUBLISHED';

type ExpenseRecord = {
  id: string;
  category: string;
  description: string;
  amount: number;
  requestedBy: string;
  department: string;
  site: string;
  supplierOrPayee: string;
  status: ExpenseStatus;
  evidenceStatus: EvidenceStatus;
  financeComment?: string;
  submittedAt: string;
  approvedAt?: string;
  paidAt?: string;
};

const STORAGE_KEY = 'southin.finance.expenses.demo.v1';

const seedExpenses: ExpenseRecord[] = [
  {
    id: 'exp-001',
    category: 'Transport',
    description: 'Monthly transport provision for operational movement',
    amount: 2500,
    requestedBy: 'Operations Officer',
    department: 'Operations',
    site: 'Project Site',
    supplierOrPayee: 'Internal Transport Provision',
    status: 'SUBMITTED',
    evidenceStatus: 'REQUIRED',
    submittedAt: new Date().toISOString(),
  },
  {
    id: 'exp-002',
    category: 'PPE / Uniforms',
    description: 'PPE replacement provision for active workforce',
    amount: 1800,
    requestedBy: 'HR / Operations',
    department: 'HR',
    site: 'Main Office',
    supplierOrPayee: 'PPE Supplier',
    status: 'APPROVED',
    evidenceStatus: 'READY_FOR_SHAREPOINT',
    financeComment: 'Approved for payment preparation.',
    submittedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  },
];

function money(value: number) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '-';
  }
}

function getStatusClass(status: ExpenseStatus) {
  if (status === 'APPROVED' || status === 'PAID') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
}

function getEvidenceLabel(status: EvidenceStatus) {
  switch (status) {
    case 'NOT_UPLOADED':
      return 'Not Uploaded';
    case 'REQUIRED':
      return 'Required';
    case 'READY_FOR_SHAREPOINT':
      return 'Ready for SharePoint';
    case 'PUBLISHED':
      return 'Published';
    default:
      return status;
  }
}

export default function FinanceExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [category, setCategory] = useState('Transport');
  const [amount, setAmount] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [site, setSite] = useState('Project Site');
  const [supplierOrPayee, setSupplierOrPayee] = useState('');
  const [requestedBy, setRequestedBy] = useState('Finance Manager');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      setExpenses(JSON.parse(saved));
      return;
    }

    setExpenses(seedExpenses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedExpenses));
  }, []);

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses]);

  const totals = useMemo(() => {
    const submitted = expenses.filter((item) => item.status === 'SUBMITTED');
    const approved = expenses.filter((item) => item.status === 'APPROVED');
    const rejected = expenses.filter((item) => item.status === 'REJECTED');
    const paid = expenses.filter((item) => item.status === 'PAID');

    const totalValue = expenses.reduce((sum, item) => sum + item.amount, 0);
    const approvedValue = approved.reduce((sum, item) => sum + item.amount, 0);
    const paidValue = paid.reduce((sum, item) => sum + item.amount, 0);
    const evidenceReady = expenses.filter(
      (item) => item.evidenceStatus === 'READY_FOR_SHAREPOINT' || item.evidenceStatus === 'PUBLISHED',
    );

    return {
      totalRecords: expenses.length,
      totalValue,
      submittedCount: submitted.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      paidCount: paid.length,
      approvedValue,
      paidValue,
      evidenceReadyCount: evidenceReady.length,
    };
  }, [expenses]);

  function resetForm() {
    setCategory('Transport');
    setAmount('');
    setDepartment('Operations');
    setSite('Project Site');
    setSupplierOrPayee('');
    setRequestedBy('Finance Manager');
    setDescription('');
  }

  function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAmount = Number(amount);

    if (!category.trim() || !description.trim() || !parsedAmount || parsedAmount <= 0) {
      setMessage('Please enter category, description, and a valid amount.');
      return;
    }

    const newExpense: ExpenseRecord = {
      id: crypto.randomUUID(),
      category: category.trim(),
      description: description.trim(),
      amount: parsedAmount,
      requestedBy: requestedBy.trim() || 'Finance User',
      department: department.trim() || 'Finance',
      site: site.trim() || 'Main Office',
      supplierOrPayee: supplierOrPayee.trim() || 'Not specified',
      status: 'SUBMITTED',
      evidenceStatus: 'REQUIRED',
      submittedAt: new Date().toISOString(),
    };

    setExpenses((current) => [newExpense, ...current]);
    setMessage('Expense submitted for Finance review.');
    resetForm();
  }

  function approveExpense(id: string) {
    setExpenses((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'APPROVED',
              evidenceStatus: 'READY_FOR_SHAREPOINT',
              financeComment: 'Approved by Finance for payment preparation.',
              approvedAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setMessage('Expense approved and evidence marked ready for SharePoint package.');
  }

  function rejectExpense(id: string) {
    setExpenses((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'REJECTED',
              evidenceStatus: 'REQUIRED',
              financeComment: 'Rejected by Finance. Requires correction or further justification.',
            }
          : item,
      ),
    );

    setMessage('Expense rejected.');
  }

  function markPaid(id: string) {
    setExpenses((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'PAID',
              evidenceStatus: 'PUBLISHED',
              financeComment: 'Payment completed. Evidence ready for Finance SharePoint record.',
              paidAt: new Date().toISOString(),
            }
          : item,
      ),
    );

    setMessage('Expense marked as paid and evidence marked as published.');
  }

  function resetDemoExpenses() {
    setExpenses(seedExpenses);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedExpenses));
    setMessage('Demo expenses have been reset.');
  }

  return (
    <AppShell>
      <section className="card app-page-wide">
        <PageHeader
          eyebrow="Finance Workflow"
          title="Expense Capture and Approval"
          description="Capture non-payroll operational expenses, approve finance requests, mark payments, and track evidence readiness."
        />

        <div className="action-row page-actions">
          <Link className="btn-secondary" href="/finance/dashboard">
            Back to Finance Dashboard
          </Link>
          <Link className="btn-secondary" href="/workbench">
            Back to Workbench
          </Link>
          <Link className="btn-secondary" href="/finance/approval-evidence">
            Finance Evidence
          </Link>
          <button className="btn" type="button" onClick={resetDemoExpenses}>
            Reset Demo Expenses
          </button>
        </div>

        <Notice>
          This is the controlled Finance expense workflow. The demo version stores data locally in
          the browser. The next API phase will store expenses in Supabase, route approvals using an
          approval matrix, and publish approved evidence to SharePoint.
        </Notice>

        {message && <div className="notice success">{message}</div>}

        <section className="finance-kpi-grid finance-kpi-grid-wide">
          <div className="employee-panel">
            <h2>Total Expenses</h2>
            <div className="leave-summary-card">
              <div>
                <span>Registered value</span>
                <strong>{money(totals.totalValue)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Submitted</h2>
            <div className="leave-summary-card">
              <div>
                <span>Awaiting approval</span>
                <strong>{totals.submittedCount}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Approved</h2>
            <div className="leave-summary-card">
              <div>
                <span>Approved value</span>
                <strong>{money(totals.approvedValue)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Paid</h2>
            <div className="leave-summary-card">
              <div>
                <span>Paid value</span>
                <strong>{money(totals.paidValue)}</strong>
              </div>
            </div>
          </div>

          <div className="employee-panel">
            <h2>Evidence</h2>
            <div className="leave-summary-card">
              <div>
                <span>Ready / published</span>
                <strong>{totals.evidenceReadyCount}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="employee-panel app-section-wide">
          <div className="section-heading-row">
            <div>
              <h2>Submit Expense</h2>
              <p className="muted">
                Capture an expense request for Finance review and later SharePoint evidence control.
              </p>
            </div>
          </div>

          <form className="employee-form-grid" onSubmit={submitExpense}>
            <label>
              Category
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="Transport">Transport</option>
                <option value="PPE / Uniforms">PPE / Uniforms</option>
                <option value="Meals / Welfare">Meals / Welfare</option>
                <option value="Administration">Administration</option>
                <option value="Equipment">Equipment</option>
                <option value="Site Operations">Site Operations</option>
              </select>
            </label>

            <label>
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Example: 2500"
                type="number"
                min="0"
                step="0.01"
              />
            </label>

            <label>
              Department
              <input value={department} onChange={(event) => setDepartment(event.target.value)} />
            </label>

            <label>
              Site
              <input value={site} onChange={(event) => setSite(event.target.value)} />
            </label>

            <label>
              Supplier / Payee
              <input
                value={supplierOrPayee}
                onChange={(event) => setSupplierOrPayee(event.target.value)}
                placeholder="Supplier, employee, or payee name"
              />
            </label>

            <label>
              Requested By
              <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
            </label>

            <label className="form-span-2">
              Description / Justification
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Briefly describe the expense and why it is required"
                rows={4}
              />
            </label>

            <div className="form-span-2 form-actions-right">
              <button className="btn" type="submit">
                Submit Expense
              </button>
            </div>
          </form>
        </section>

        <section className="employee-panel app-section-wide">
          <div className="section-heading-row">
            <div>
              <h2>Expense Approval Register</h2>
              <p className="muted">
                Finance can approve, reject, mark paid, and track evidence status from this register.
              </p>
            </div>
          </div>

          <div className="expense-card-list">
            {expenses.map((expense) => (
              <article className="expense-workflow-card" key={expense.id}>
                <div className="expense-card-main">
                  <div className="expense-field">
                    <span>Category</span>
                    <strong>{expense.category}</strong>
                  </div>

                  <div className="expense-field expense-description">
                    <span>Description</span>
                    <strong>{expense.description}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Amount</span>
                    <strong>{money(expense.amount)}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Department</span>
                    <strong>{expense.department}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Site</span>
                    <strong>{expense.site}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Payee</span>
                    <strong>{expense.supplierOrPayee}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Requested By</span>
                    <strong>{expense.requestedBy}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Submitted</span>
                    <strong>{formatDate(expense.submittedAt)}</strong>
                  </div>

                  <div className="expense-field">
                    <span>Status</span>
                    <strong>
                      <span className={`employee-status ${getStatusClass(expense.status)}`}>
                        {expense.status}
                      </span>
                    </strong>
                  </div>

                  <div className="expense-field">
                    <span>Evidence</span>
                    <strong>
                      <span className="employee-status neutral">
                        {getEvidenceLabel(expense.evidenceStatus)}
                      </span>
                    </strong>
                  </div>
                </div>

                {expense.financeComment && (
                  <div className="expense-comment">
                    <span>Finance Comment</span>
                    <strong>{expense.financeComment}</strong>
                  </div>
                )}

                <div className="expense-actions">
                  {expense.status === 'SUBMITTED' && (
                    <>
                      <button className="btn" type="button" onClick={() => approveExpense(expense.id)}>
                        Approve
                      </button>

                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => rejectExpense(expense.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {expense.status === 'APPROVED' && (
                    <button className="btn" type="button" onClick={() => markPaid(expense.id)}>
                      Mark Paid
                    </button>
                  )}

                  {(expense.status === 'PAID' || expense.status === 'REJECTED') && (
                    <span className="muted">No further action required.</span>
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
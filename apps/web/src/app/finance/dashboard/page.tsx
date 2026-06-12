'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/ui/PageHeader';
import { Notice } from '@/components/ui/Notice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type FinanceExpense = {
  id: string;
  category: string;
  description: string;
  amount: number;
  status: 'PLANNED' | 'SUBMITTED' | 'APPROVED' | 'PAID';
};

type PayrollFinanceSnapshot = {
  employeeCount: number;
  grossPay: number;
  deductions: number;
  netPay: number;
  employerCost: number;
  paye: number;
  napsa: number;
  nhima: number;
  latestRunName: string;
  latestRunStatus: string;
  paymentBatchStatus: string;
};

const GENERAL_EXPENSE_STORAGE_KEY = 'southin_peoplepay_finance_general_expenses';

const defaultExpenses: FinanceExpense[] = [
  {
    id: 'exp-001',
    category: 'Transport',
    description: 'Estimated monthly transport support / operational movement',
    amount: 2500,
    status: 'PLANNED',
  },
  {
    id: 'exp-002',
    category: 'PPE / Uniforms',
    description: 'Estimated workforce PPE and uniform replacement provision',
    amount: 1800,
    status: 'PLANNED',
  },
  {
    id: 'exp-003',
    category: 'Meals / Welfare',
    description: 'Estimated employee welfare and meal support provision',
    amount: 1200,
    status: 'PLANNED',
  },
  {
    id: 'exp-004',
    category: 'Administration',
    description: 'Printing, payroll processing, bank charges, and admin costs',
    amount: 950,
    status: 'PLANNED',
  },
];

function money(value: unknown) {
  return `K ${Number(value || 0).toFixed(2)}`;
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDevRoleHeaders(): HeadersInit {
  if (typeof window === 'undefined') {
    return {};
  }

  const role =
    localStorage.getItem('southin-dev-role') ||
    localStorage.getItem('devRole') ||
    localStorage.getItem('staffRole') ||
    '';

  if (!role) {
    return {};
  }

  return {
    'x-user-role': role,
  };
}

function getStoredExpenses() {
  if (typeof window === 'undefined') return defaultExpenses;

  try {
    const raw = localStorage.getItem(GENERAL_EXPENSE_STORAGE_KEY);
    if (!raw) return defaultExpenses;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultExpenses;
  } catch {
    return defaultExpenses;
  }
}

function saveStoredExpenses(expenses: FinanceExpense[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GENERAL_EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
}

function getSnapshotFromFinancePayload(payload: any): PayrollFinanceSnapshot {
  const totals =
    payload?.totals ||
    payload?.financeAudit?.totals ||
    payload?.audit?.totals ||
    payload?.payrollTotals ||
    {};

  const run =
    payload?.run ||
    payload?.financeAudit?.run ||
    payload?.latestPayrollRun ||
    payload?.latestRun ||
    {};

  const grossPay =
    numberValue(totals.grossPay) ||
    numberValue(totals.totalGrossPay) ||
    numberValue(totals.gross) ||
    17000;

  const deductions =
    numberValue(totals.deductions) ||
    numberValue(totals.totalDeductions) ||
    numberValue(totals.statutoryDeductions) ||
    3262.5;

  const netPay =
    numberValue(totals.netPay) ||
    numberValue(totals.totalNetPay) ||
    Math.max(grossPay - deductions, 0);

  const employeeCount =
    numberValue(totals.employeeCount) ||
    numberValue(totals.totalEmployees) ||
    numberValue(payload?.employeeCount) ||
    2;

  const paye =
    numberValue(totals.paye) ||
    numberValue(totals.totalPaye) ||
    Math.round(deductions * 0.55 * 100) / 100;

  const napsa =
    numberValue(totals.napsa) ||
    numberValue(totals.totalNapsa) ||
    Math.round(deductions * 0.32 * 100) / 100;

  const nhima =
    numberValue(totals.nhima) ||
    numberValue(totals.totalNhima) ||
    Math.round(deductions * 0.13 * 100) / 100;

  const estimatedEmployerStatutory = Math.round(grossPay * 0.0525 * 100) / 100;

  return {
    employeeCount,
    grossPay,
    deductions,
    netPay,
    employerCost:
      numberValue(totals.employerCost) ||
      numberValue(totals.totalEmployerCost) ||
      grossPay + estimatedEmployerStatutory,
    paye,
    napsa,
    nhima,
    latestRunName: run.runName || run.name || 'Latest Payroll Run',
    latestRunStatus: run.status || payload?.status || 'DEMO / LIVE READY',
    paymentBatchStatus: payload?.paymentBatchStatus || payload?.batchStatus || 'Pending Finance Review',
  };
}

export default function FinanceDashboardPage() {
  const [snapshot, setSnapshot] = useState<PayrollFinanceSnapshot>(() =>
    getSnapshotFromFinancePayload(null),
  );
  const [expenses, setExpenses] = useState<FinanceExpense[]>(defaultExpenses);
  const [loading, setLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState('Loading finance data...');
  const [newExpense, setNewExpense] = useState({
    category: '',
    description: '',
    amount: '',
  });

  useEffect(() => {
    async function loadFinanceDashboard() {
      setLoading(true);

      try {
        setExpenses(getStoredExpenses());

        const response = await fetch(`${API_URL}/executive/sharepoint/finance-audit-payload`, {
          headers: getDevRoleHeaders(),
          cache: 'no-store',
        });

        if (!response.ok) {
          setApiStatus('Finance API not available yet. Showing demo finance dashboard values.');
          setSnapshot(getSnapshotFromFinancePayload(null));
          return;
        }

        const result = await response.json();
        setSnapshot(getSnapshotFromFinancePayload(result));
        setApiStatus('Finance dashboard connected to PeoplePay API payload.');
      } catch {
        setApiStatus('Finance API not available yet. Showing demo finance dashboard values.');
        setSnapshot(getSnapshotFromFinancePayload(null));
      } finally {
        setLoading(false);
      }
    }

    loadFinanceDashboard();
  }, []);

  const totals = useMemo(() => {
    const generalExpenses = expenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0);
    const totalWorkforceExpense = snapshot.employerCost + generalExpenses;
    const statutoryTotal = snapshot.paye + snapshot.napsa + snapshot.nhima;
    const averageCostPerEmployee =
      snapshot.employeeCount > 0 ? totalWorkforceExpense / snapshot.employeeCount : 0;

    return {
      generalExpenses,
      totalWorkforceExpense,
      statutoryTotal,
      averageCostPerEmployee,
    };
  }, [expenses, snapshot]);

  function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = numberValue(newExpense.amount);

    if (!newExpense.category.trim() || !newExpense.description.trim() || amount <= 0) {
      return;
    }

    const nextExpenses: FinanceExpense[] = [
      {
        id: crypto.randomUUID(),
        category: newExpense.category.trim(),
        description: newExpense.description.trim(),
        amount,
        status: 'SUBMITTED',
      },
      ...expenses,
    ];

    setExpenses(nextExpenses);
    saveStoredExpenses(nextExpenses);

    setNewExpense({
      category: '',
      description: '',
      amount: '',
    });
  }

  function clearDemoExpenses() {
    setExpenses(defaultExpenses);
    saveStoredExpenses(defaultExpenses);
  }

  return (
    <AppShell>
      <section className="card">
        <PageHeader
          eyebrow="Finance Control"
          title="Finance Dashboard"
          description="Monitor workforce cost, payroll obligations, statutory liabilities, payment readiness, and finance control items."
        />

        <Notice>
          This page is the start of the Southin Finance Portal. It should eventually integrate
          PeoplePay payroll, Procurement payment stages, QuickBooks reporting, Omni Core data,
          SharePoint documents, and approval evidence into one controlled finance view.
        </Notice>

        <div className="action-row" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <Link className="btn-secondary" href="/reports/payment-batches">
            Payment Batches
          </Link>

          <Link className="btn-secondary" href="/reports/payroll-audit">
            Payroll Audit
          </Link>

          <Link className="btn-secondary" href="/reports/bank-payment-preparation">
            Bank Payment Prep
          </Link>

          <Link className="btn" href="/admin/sharepoint-integration">
            SharePoint Finance Export
          </Link>
        </div>

        <div className="notice" style={{ marginBottom: '1rem' }}>
          {loading ? 'Loading finance dashboard...' : apiStatus}
        </div>

        <section className="finance-kpi-grid">
          <FinanceKpi title="Employees" label="Current payroll workforce" value={snapshot.employeeCount} />
          <FinanceKpi title="Gross Salaries" label="Salary expense before deductions" value={money(snapshot.grossPay)} />
          <FinanceKpi title="Net Payable" label="Amount payable to employees" value={money(snapshot.netPay)} />
          <FinanceKpi title="Statutory Total" label="PAYE + NAPSA + NHIMA" value={money(totals.statutoryTotal)} />
          <FinanceKpi title="Employer Cost" label="Gross plus employer obligations" value={money(snapshot.employerCost)} />
          <FinanceKpi title="General Expenses" label="Operational finance provisions" value={money(totals.generalExpenses)} />
          <FinanceKpi title="Total Workforce Cost" label="Payroll plus general expenses" value={money(totals.totalWorkforceExpense)} />
          <FinanceKpi title="Average Cost" label="Average cost per employee" value={money(totals.averageCostPerEmployee)} />
        </section>

        <section className="finance-dashboard-grid">
          <div className="employee-panel">
            <h2>Payroll Cost Summary</h2>

            <div className="mini-detail-grid finance-detail-grid">
              <Detail label="Latest Run" value={snapshot.latestRunName} />
              <Detail label="Run Status" value={snapshot.latestRunStatus} />
              <Detail label="Employee Count" value={snapshot.employeeCount} />
              <Detail label="Gross Pay" value={money(snapshot.grossPay)} />
              <Detail label="Deductions" value={money(snapshot.deductions)} />
              <Detail label="Net Pay" value={money(snapshot.netPay)} />
              <Detail label="Employer Cost" value={money(snapshot.employerCost)} />
              <Detail label="Payment Batch" value={snapshot.paymentBatchStatus} />
            </div>
          </div>

          <div className="employee-panel">
            <h2>Statutory Obligations</h2>

            <div className="finance-obligation-list">
              <FinanceObligation name="PAYE" amount={snapshot.paye} status="Payroll deduction liability" />
              <FinanceObligation name="NAPSA" amount={snapshot.napsa} status="Pension statutory liability" />
              <FinanceObligation name="NHIMA" amount={snapshot.nhima} status="Medical statutory liability" />
            </div>

            <div className="notice" style={{ marginTop: '1rem' }}>
              Statutory certificate records should be produced from approved and locked payroll
              runs only. This prevents Finance from working with unapproved draft payroll figures.
            </div>
          </div>
        </section>

        <section className="employee-panel" style={{ marginTop: '1rem' }}>
          <div className="page-header">
            <div>
              <h2>General Expense Register</h2>
              <p className="muted">
                Capture finance provisions that sit outside basic payroll, such as transport, PPE,
                welfare, bank charges, and administration costs.
              </p>
            </div>

            <button className="btn-secondary" type="button" onClick={clearDemoExpenses}>
              Reset Demo Expenses
            </button>
          </div>

          <form className="employee-form-grid" onSubmit={addExpense}>
            <label>
              Category
              <input
                value={newExpense.category}
                onChange={(event) =>
                  setNewExpense((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Example: Transport"
              />
            </label>

            <label>
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={newExpense.amount}
                onChange={(event) =>
                  setNewExpense((current) => ({ ...current, amount: event.target.value }))
                }
                placeholder="Example: 2500"
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Description
              <input
                value={newExpense.description}
                onChange={(event) =>
                  setNewExpense((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Briefly describe the expense or provision"
              />
            </label>

            <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
              <button className="btn" type="submit">
                Add Expense
              </button>
            </div>
          </form>

          <div className="employee-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.category}</strong>
                    </td>
                    <td>{expense.description}</td>
                    <td>{money(expense.amount)}</td>
                    <td>
                      <span className="employee-status warning">{expense.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="finance-dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="employee-panel">
            <h2>Finance Portal Modules</h2>

            <div className="quick-link-grid">
              <FinanceLink title="Procurement Payment Tracker" href="/finance/procurement-tracker" />
              <FinanceLink title="Finance Evidence Centre" href="/finance/approval-evidence" />
              <FinanceLink title="Expense Approvals" href="/finance/expenses" />
              <FinanceLink title="Asset Management Integration" href="/finance/asset-management-integration" />
              <FinanceLink title="SharePoint Finance Package" href="/finance/sharepoint-package" />
              <FinanceLink title="Payment Batches" href="/finance/payment-batches" />
              <FinanceLink title="Bank Payment Preparation" href="/finance/bank-payment-preparation" />
              <FinanceLink title="Payroll Audit" href="/finance/payroll-audit" />
            </div>
          </div>

          <div className="employee-panel">
            <h2>Finance System Integration Roadmap</h2>

            <div className="finance-roadmap">
              <RoadmapStep
                title="Phase 1: PeoplePay Finance Dashboard"
                text="Payroll cost, statutory obligations, payment batch status, and audit evidence."
                status="In progress"
              />

              <RoadmapStep
                title="Phase 2: Procurement Payment Tracker"
                text="Link procurement requests, PO status, supplier invoices, POPs, and approval stages."
                status="Next"
              />

              <RoadmapStep
                title="Phase 3: QuickBooks / Omni Core Export"
                text="Generate clean CSV/Excel finance exports for accounting upload or reconciliation."
                status="Planned"
              />

              <RoadmapStep
                title="Phase 4: SharePoint Finance Records"
                text="Publish approved payroll evidence, payment batches, and statutory reports to SharePoint."
                status="Planned"
              />
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function FinanceKpi({ title, label, value }: { title: string; label: string; value: string | number }) {
  return (
    <div className="employee-panel finance-kpi-card">
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

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function FinanceObligation({ name, amount, status }: { name: string; amount: number; status: string }) {
  return (
    <div className="finance-obligation-card">
      <div>
        <span>{name}</span>
        <strong>{money(amount)}</strong>
      </div>
      <p>{status}</p>
    </div>
  );
}

function FinanceLink({ title, href }: { title: string; href: string }) {
  return (
    <Link className="quick-link-card" href={href}>
      {title}
      <span>Open →</span>
    </Link>
  );
}

function RoadmapStep({ title, text, status }: { title: string; text: string; status: string }) {
  return (
    <div className="finance-roadmap-step">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>

      <span>{status}</span>
    </div>
  );
}
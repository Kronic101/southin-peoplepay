'use client';

import { useEffect, useMemo, useState } from 'react';

import AppShell from '../../../components/AppShell';
import {
  getFinanceApprovalStatus,
  getFinanceDepartmentCosts,
  getFinanceExportLogs,
  getFinanceExportUrl,
  getFinanceOutstandingPayments,
  getFinanceReportSummary,
  getFinanceSiteCosts,
  type FinanceApprovalStatusResponse,
  type FinanceDepartmentCostResponse,
  type FinanceExportLog,
  type FinanceOutstandingPaymentsResponse,
  type FinanceReportSummaryResponse,
  type FinanceSiteCostResponse,
} from '../../../lib/api';

function money(value: string | number | null | undefined) {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusClass(status: string) {
  const value = String(status || '').toUpperCase();

  if (['APPROVED', 'GENERATED', 'PAID', 'SUCCESS', 'CLOSED'].includes(value)) {
    return 'status-pill success';
  }

  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(value)) {
    return 'status-pill danger';
  }

  if (['SUBMITTED', 'IN_REVIEW', 'PENDING', 'DRAFT'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

const emptySummary: FinanceReportSummaryResponse = {
  generatedAt: '',
  currency: 'ZMW',
  summary: {
    expenses: {
      totalRecords: 0,
      totalValue: 0,
      submitted: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
      paid: 0,
      outstandingApprovedValue: 0,
    },
    procurement: {
      totalRecords: 0,
      totalValue: 0,
      submitted: 0,
      approved: 0,
      paid: 0,
      pendingPayment: 0,
      pendingPaymentValue: 0,
    },
    evidence: {
      totalRecords: 0,
      required: 0,
      uploaded: 0,
      approved: 0,
      readyForSharePoint: 0,
      published: 0,
    },
    payrollPayments: {
      paymentBatchRecords: 0,
      totalNetPay: 0,
      approvedBatches: 0,
    },
    sharePointPackages: {
      totalRecords: 0,
      draft: 0,
      approved: 0,
      published: 0,
    },
    approvals: {
      totalRecords: 0,
      submitted: 0,
      inReview: 0,
      approved: 0,
      rejected: 0,
    },
  },
};

const emptyDepartmentCosts: FinanceDepartmentCostResponse = {
  generatedAt: '',
  currency: 'ZMW',
  rows: [],
};

const emptySiteCosts: FinanceSiteCostResponse = {
  generatedAt: '',
  currency: 'ZMW',
  rows: [],
};

const emptyOutstanding: FinanceOutstandingPaymentsResponse = {
  generatedAt: '',
  currency: 'ZMW',
  summary: {
    totalRecords: 0,
    totalValue: 0,
  },
  rows: [],
};

const emptyApprovals: FinanceApprovalStatusResponse = {
  generatedAt: '',
  rows: [],
};

export default function FinanceReportsPage() {
  const [summary, setSummary] = useState<FinanceReportSummaryResponse>(emptySummary);
  const [departmentCosts, setDepartmentCosts] =
    useState<FinanceDepartmentCostResponse>(emptyDepartmentCosts);
  const [siteCosts, setSiteCosts] = useState<FinanceSiteCostResponse>(emptySiteCosts);
  const [outstanding, setOutstanding] =
    useState<FinanceOutstandingPaymentsResponse>(emptyOutstanding);
  const [approvals, setApprovals] = useState<FinanceApprovalStatusResponse>(emptyApprovals);
  const [exportLogs, setExportLogs] = useState<FinanceExportLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadReports() {
  setLoading(true);
  setError('');

  const errors: string[] = [];

  async function safeRun<T>(
    label: string,
    request: () => Promise<T>,
    onSuccess: (data: T) => void,
  ) {
    try {
      const result = await request();
      onSuccess(result);
    } catch (err: any) {
      console.error(`${label} failed`, err);
      errors.push(label);
    }
  }

  await safeRun('Summary report', getFinanceReportSummary, setSummary);
  await safeRun('Department cost report', getFinanceDepartmentCosts, setDepartmentCosts);
  await safeRun('Site cost report', getFinanceSiteCosts, setSiteCosts);
  await safeRun('Outstanding payments report', getFinanceOutstandingPayments, setOutstanding);
  await safeRun('Approval status report', getFinanceApprovalStatus, setApprovals);
  await safeRun('Export logs', getFinanceExportLogs, setExportLogs);

  if (errors.length > 0) {
    setError(`Some reports failed to load: ${errors.join(', ')}. Refresh again after a few seconds.`);
  }

  setLoading(false);
}

  useEffect(() => {
    loadReports();
  }, []);

  const expenseSummary = summary.summary.expenses;
  const procurementSummary = summary.summary.procurement;
  const evidenceSummary = summary.summary.evidence;
  const payrollSummary = summary.summary.payrollPayments;
  const approvalSummary = summary.summary.approvals;

  const departmentRows = useMemo(() => departmentCosts.rows || [], [departmentCosts.rows]);
  const siteRows = useMemo(() => siteCosts.rows || [], [siteCosts.rows]);
  const outstandingRows = useMemo(() => outstanding.rows || [], [outstanding.rows]);
  const approvalRows = useMemo(() => approvals.rows || [], [approvals.rows]);

  return (
    <AppShell>
      <section className="page-stack finance-live-page">
        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <p className="eyebrow">Finance Workflow</p>
              <h1>Finance Reports</h1>
              <p className="muted">
                Consolidated financial reporting for expenses, procurement payments, payroll
                payment batches, approvals, evidence and CSV exports.
              </p>
            </div>

            <button className="btn-secondary" onClick={loadReports} type="button">
              Refresh
            </button>
          </div>

          {loading && <div className="finance-notice">Loading finance reports...</div>}
          {error && <div className="finance-notice danger">{error}</div>}

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Expenses</span>
              <strong>{money(expenseSummary.totalValue)}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Outstanding Approved</span>
              <strong>{money(expenseSummary.outstandingApprovedValue)}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Procurement Value</span>
              <strong>{money(procurementSummary.totalValue)}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Pending Procurement</span>
              <strong>{money(procurementSummary.pendingPaymentValue)}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Payroll Net Pay</span>
              <strong>{money(payrollSummary.totalNetPay)}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Evidence Required</span>
              <strong>{evidenceSummary.required}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approvals In Review</span>
              <strong>{approvalSummary.inReview}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Approved Workflows</span>
              <strong>{approvalSummary.approved}</strong>
            </div>
          </div>
        </div>

        <div className="finance-live-card">
          <div className="finance-live-header">
            <div>
              <h2>Finance Export Centre</h2>
              <p className="muted">
                Download controlled CSV exports. Each export is logged by the backend for audit
                readiness.
              </p>
            </div>
          </div>

          <div className="finance-inline-actions" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <a className="btn" href={getFinanceExportUrl('/finance/exports/expenses.csv')}>
              Expenses CSV
            </a>
            <a className="btn" href={getFinanceExportUrl('/finance/exports/procurement.csv')}>
              Procurement CSV
            </a>
            <a className="btn" href={getFinanceExportUrl('/finance/exports/evidence.csv')}>
              Evidence CSV
            </a>
            <a className="btn" href={getFinanceExportUrl('/finance/exports/payment-batches.csv')}>
              Payment Batches CSV
            </a>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Department Cost Summary</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Expense Value</th>
                  <th>Procurement Value</th>
                  <th>Payroll Net Value</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {departmentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No department cost data found.</td>
                  </tr>
                ) : (
                  departmentRows.map((row) => (
                    <tr key={row.department}>
                      <td>{row.department}</td>
                      <td>{money(row.expenseValue)}</td>
                      <td>{money(row.procurementValue)}</td>
                      <td>{money(row.payrollNetValue)}</td>
                      <td>{money(row.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Site Cost Summary</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Expense Value</th>
                  <th>Procurement Value</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {siteRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No site cost data found.</td>
                  </tr>
                ) : (
                  siteRows.map((row) => (
                    <tr key={row.site}>
                      <td>{row.site}</td>
                      <td>{money(row.expenseValue)}</td>
                      <td>{money(row.procurementValue)}</td>
                      <td>{money(row.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Outstanding Payments</h2>

          <div className="finance-summary-grid">
            <div className="finance-summary-card">
              <span>Total Records</span>
              <strong>{outstanding.summary.totalRecords}</strong>
            </div>
            <div className="finance-summary-card">
              <span>Total Outstanding</span>
              <strong>{money(outstanding.summary.totalValue)}</strong>
            </div>
          </div>

          <div className="finance-table-wrap" style={{ marginTop: 18 }}>
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Reference</th>
                  <th>Department</th>
                  <th>Site</th>
                  <th>Payee</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {outstandingRows.length === 0 ? (
                  <tr>
                    <td colSpan={10}>No outstanding payments found.</td>
                  </tr>
                ) : (
                  outstandingRows.map((row) => (
                    <tr key={`${row.source}-${row.reference}`}>
                      <td>{row.source}</td>
                      <td>{row.reference}</td>
                      <td>{row.department || '-'}</td>
                      <td>{row.site || '-'}</td>
                      <td>{row.payee || '-'}</td>
                      <td>{row.description}</td>
                      <td>{money(row.amount)}</td>
                      <td>
                        <span className={statusClass(row.status)}>{row.status}</span>
                      </td>
                      <td>
                        <span className={statusClass(row.paymentStatus)}>
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td>{formatDate(row.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Approval Status Report</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Module</th>
                  <th>Workflow</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Current Step</th>
                  <th>Pending Role</th>
                  <th>Approved Steps</th>
                  <th>Total Steps</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {approvalRows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>No approval records found.</td>
                  </tr>
                ) : (
                  approvalRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.requestReference || '-'}</td>
                      <td>{row.requestTitle}</td>
                      <td>{row.module}</td>
                      <td>{row.workflowType}</td>
                      <td>{money(row.amount)}</td>
                      <td>
                        <span className={statusClass(row.status)}>{row.status}</span>
                      </td>
                      <td>{row.currentStep}</td>
                      <td>{row.pendingRole || '-'}</td>
                      <td>{row.approvedSteps}</td>
                      <td>{row.totalSteps}</td>
                      <td>{formatDate(row.submittedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="finance-live-card">
          <h2>Recent Export Logs</h2>

          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Report Type</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th>File Name</th>
                  <th>Requested By</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {exportLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No export logs found.</td>
                  </tr>
                ) : (
                  exportLogs.slice(0, 20).map((log) => (
                    <tr key={log.id}>
                      <td>{log.reportType}</td>
                      <td>{log.exportFormat}</td>
                      <td>
                        <span className={statusClass(log.status)}>{log.status}</span>
                      </td>
                      <td>{log.fileName || '-'}</td>
                      <td>{log.requestedBy || '-'}</td>
                      <td>{formatDate(log.createdAt)}</td>
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
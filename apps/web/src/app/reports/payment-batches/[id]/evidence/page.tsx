import Link from 'next/link';
import { getPaymentBatchEvidence } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  if (
    ['APPROVED', 'APPROVED_FOR_MANUAL_PAYMENT', 'VALIDATED', 'READY_FOR_PAYMENT'].includes(
      String(status).toUpperCase(),
    )
  ) {
    return 'status-pill locked';
  }

  if (String(status).toUpperCase().includes('BLOCKED')) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

export default async function PaymentBatchEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evidence = await getPaymentBatchEvidence(id);

  const batch = evidence?.batch || evidence;
  const items = evidence?.items || batch?.items || [];
  const controls = evidence?.controls || [
    'This evidence file is for Finance-controlled payment preparation only.',
    'This file does not trigger a bank transfer.',
    'Bank account numbers are masked in the evidence JSON.',
    'Full payment banking evidence must remain restricted to Finance.',
    'Payment batch must be approved before live bank integration is enabled.',
  ];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Payment Batch Audit Evidence</h1>
          <p className="muted">
            Clean audit evidence pack for Finance, Director approval, and manual payment processing.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href={`/reports/payment-batches/${id}`}>
            Payment Batch
          </Link>

          <Link className="btn-secondary" href="/reports/payment-batches">
            Payment Batches
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Batch</span>
          <strong>{batch?.batchName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{batch?.status || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Prepared By</span>
          <strong>{batch?.preparedBy || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved By</span>
          <strong>{batch?.approvedBy || '-'}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Prepared At</span>
          <strong>{formatDateTime(batch?.preparedAt)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Approved At</span>
          <strong>{formatDateTime(batch?.approvedAt)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Total Employees</span>
          <strong>{batch?.totalEmployees ?? items.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Total Net Pay</span>
          <strong>{money(batch?.totalNetPay)}</strong>
        </div>
      </div>

      <div className="notice success">
        {batch?.status === 'APPROVED'
          ? 'This payment batch has been approved for manual payment processing.'
          : 'This payment batch evidence is available for review.'}
      </div>

      <div className="table-wrap">
        <h3>Payment Evidence Items</h3>

        <table>
          <thead>
            <tr>
              <th>Employee No.</th>
              <th>Name</th>
              <th>Department</th>
              <th>Net Pay</th>
              <th>Bank</th>
              <th>Account Name</th>
              <th>Masked Account</th>
              <th>Bank Status</th>
              <th>Payment Status</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9}>No payment evidence items found.</td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id || item.employeeNumber}>
                  <td>{item.employeeNumber || '-'}</td>
                  <td>{item.employeeName || item.name || '-'}</td>
                  <td>{item.department || '-'}</td>
                  <td>{money(item.netPay)}</td>
                  <td>{item.bankName || item.bank || '-'}</td>
                  <td>{item.bankAccountName || item.accountName || '-'}</td>
                  <td>
                    {item.maskedAccountNumber ||
                      item.bankAccountNumberMasked ||
                      item.maskedAccount ||
                      '******'}
                  </td>
                  <td>
                    <span className={statusClass(item.bankDetailsStatus)}>
                      {item.bankDetailsStatus || '-'}
                    </span>
                  </td>
                  <td>
                    <span className={statusClass(item.paymentStatus)}>
                      {item.paymentStatus || '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Finance Controls</h3>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Control</th>
            </tr>
          </thead>

          <tbody>
            {controls.map((control: string, index: number) => (
              <tr key={control}>
                <td>{index + 1}</td>
                <td>{control}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Recommended SharePoint Storage</h3>

        <table>
          <tbody>
            <tr>
              <th>Site</th>
              <td>Finance</td>
            </tr>
            <tr>
              <th>Library</th>
              <td>Payroll Audit Reports</td>
            </tr>
            <tr>
              <th>Folder</th>
              <td>June 2026 Payroll / Payment Evidence</td>
            </tr>
            <tr>
              <th>Confidentiality</th>
              <td>CONFIDENTIAL_FINANCE</td>
            </tr>
          </tbody>
        </table>
      </div>

      <details>
        <summary>Raw Evidence JSON</summary>
        <pre className="json-preview">{JSON.stringify(evidence, null, 2)}</pre>
      </details>
    </section>
  );
}
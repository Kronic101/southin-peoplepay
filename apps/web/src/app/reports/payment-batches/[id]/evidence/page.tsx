import Link from 'next/link';
import { getPaymentBatchEvidence, getPaymentBatchEvidenceCsvUrl } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

export default async function PaymentBatchEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const evidence = await getPaymentBatchEvidence(id);

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Payment Batch Evidence</h1>
          <p className="muted">
            Finance-controlled evidence package for manual payment preparation.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href={`/reports/payment-batches/${id}`}>
            Payment Batch
          </Link>

          <a className="btn" href={getPaymentBatchEvidenceCsvUrl(id)}>
            Download Evidence CSV
          </a>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Batch</span>
          <strong>{evidence.batch.batchName}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{evidence.batch.status}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Ready Items</span>
          <strong>{evidence.readiness.readyItems}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Blocked Items</span>
          <strong>{evidence.readiness.blockedItems}</strong>
        </div>
      </div>

      {evidence.readiness.warning && <div className="notice">{evidence.readiness.warning}</div>}

      <h3>Recommended SharePoint Storage</h3>

      <table>
        <tbody>
          <tr>
            <th>Site</th>
            <td>{evidence.targetSharePoint.siteName}</td>
          </tr>
          <tr>
            <th>Library</th>
            <td>{evidence.targetSharePoint.libraryName}</td>
          </tr>
          <tr>
            <th>Folder</th>
            <td>{evidence.targetSharePoint.recommendedFolder}</td>
          </tr>
          <tr>
            <th>Confidentiality</th>
            <td>{evidence.confidentiality}</td>
          </tr>
        </tbody>
      </table>

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
          {evidence.items.map((item: any) => (
            <tr key={item.employeeNumber}>
              <td>{item.employeeNumber}</td>
              <td>{item.employeeName}</td>
              <td>{item.department || '-'}</td>
              <td>{money(item.netPay)}</td>
              <td>{item.bankName || '-'}</td>
              <td>{item.bankAccountName || '-'}</td>
              <td>{item.bankAccountNumberMasked || '-'}</td>
              <td>{item.bankDetailsStatus}</td>
              <td>{item.paymentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Finance Controls</h3>

      <table>
        <thead>
          <tr>
            <th>No.</th>
            <th>Control</th>
          </tr>
        </thead>

        <tbody>
          {evidence.controls.map((control: string, index: number) => (
            <tr key={control}>
              <td>{index + 1}</td>
              <td>{control}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <details>
        <summary>Raw Evidence JSON</summary>
        <pre className="json-preview">{JSON.stringify(evidence, null, 2)}</pre>
      </details>
    </section>
  );
}
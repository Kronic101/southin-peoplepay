import { getEmployeeBankAuditHistory } from '@/lib/api';

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function formatAction(action?: string | null) {
  if (!action) return '-';

  return String(action)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status?: string | null) {
  if (!status) return 'status-pill';

  if (['VALIDATED', 'APPROVED'].includes(status)) {
    return 'status-pill locked';
  }

  if (['PENDING', 'PENDING_VALIDATION'].includes(status)) {
    return 'status-pill warning';
  }

  if (['REJECTED', 'FAILED'].includes(status)) {
    return 'status-pill danger';
  }

  return 'status-pill';
}

export async function EmployeeBankAuditHistory({ employeeId }: { employeeId: string }) {
  const audit = await getEmployeeBankAuditHistory(employeeId);

  const employee = audit?.employee;
  const bankAccounts = audit?.bankAccounts || [];
  const logs = audit?.logs || [];

  return (
    <section className="card" style={{ marginTop: '1rem' }}>
      <div className="page-header">
        <div>
          <h2>Bank Audit History</h2>
          <p className="muted">
            Finance-controlled audit trail for employee bank account validation, approval, and
            payment readiness checks.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Employee</span>
          <strong>{employee?.name || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Employee No.</span>
          <strong>{employee?.employeeNumber || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Bank Status</span>
          <strong>{employee?.bankDetailsStatus || 'PENDING_VALIDATION'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Audit Records</span>
          <strong>{audit?.totalReturned ?? logs.length}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <h3>Current Bank Details Snapshot</h3>

        <table>
          <thead>
            <tr>
              <th>Bank</th>
              <th>Branch</th>
              <th>Account Name</th>
              <th>Masked Account</th>
              <th>Status</th>
              <th>Reviewed By</th>
              <th>Reviewed At</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>{employee?.bankName || '-'}</td>
              <td>{employee?.bankBranch || '-'}</td>
              <td>{employee?.bankAccountName || '-'}</td>
              <td>{employee?.bankAccountNumberMasked || '-'}</td>
              <td>
                <span className={statusClass(employee?.bankDetailsStatus)}>
                  {employee?.bankDetailsStatus || 'PENDING_VALIDATION'}
                </span>
              </td>
              <td>{employee?.bankDetailsReviewedBy || '-'}</td>
              <td>{formatDateTime(employee?.bankDetailsReviewedAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Registered Bank Accounts</h3>

        <table>
          <thead>
            <tr>
              <th>Bank</th>
              <th>Branch</th>
              <th>Account Name</th>
              <th>Masked Account</th>
              <th>Primary</th>
              <th>Approval Status</th>
              <th>Updated</th>
            </tr>
          </thead>

          <tbody>
            {bankAccounts.length === 0 ? (
              <tr>
                <td colSpan={7}>No registered bank accounts found.</td>
              </tr>
            ) : (
              bankAccounts.map((account: any) => (
                <tr key={account.id}>
                  <td>{account.bankName || '-'}</td>
                  <td>{account.branchName || '-'}</td>
                  <td>{account.accountName || '-'}</td>
                  <td>{account.accountNumberMasked || '-'}</td>
                  <td>{account.isPrimary ? 'YES' : 'NO'}</td>
                  <td>
                    <span className={statusClass(account.approvalStatus)}>
                      {account.approvalStatus || '-'}
                    </span>
                  </td>
                  <td>{formatDateTime(account.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Finance Bank Audit Trail</h3>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Action</th>
              <th>Previous Status</th>
              <th>New Status</th>
              <th>Changed By</th>
              <th>Bank</th>
              <th>Masked Account</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8}>No bank audit history found.</td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{formatAction(log.action)}</td>
                  <td>{log.previousStatus || '-'}</td>
                  <td>
                    <span className={statusClass(log.newStatus)}>{log.newStatus || '-'}</span>
                  </td>
                  <td>{log.changedBy || '-'}</td>
                  <td>{log.bankAccount?.bankName || log.snapshot?.bankName || '-'}</td>
                  <td>
                    {log.bankAccount?.accountNumberMasked ||
                      log.snapshot?.accountNumberMasked ||
                      '-'}
                  </td>
                  <td>{log.notes || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <details>
        <summary>Raw Bank Audit JSON</summary>
        <pre>{JSON.stringify(audit, null, 2)}</pre>
      </details>
    </section>
  );
}
import { getEmployeeBankAuditHistory } from '@/lib/api';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export async function EmployeeBankAuditHistory({ employeeId }: { employeeId: string }) {
  const audit = await getEmployeeBankAuditHistory(employeeId);
  const logs = audit.logs || [];

  return (
    <section className="table-wrap">
      <h3>Bank Audit History</h3>

      <p className="muted">
        Records all Finance-controlled changes and validations performed against employee bank
        details.
      </p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Action</th>
            <th>Previous Status</th>
            <th>New Status</th>
            <th>Changed By</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6}>No bank audit history found.</td>
            </tr>
          ) : (
            logs.map((log: any) => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.action}</td>
                <td>{log.previousStatus || '-'}</td>
                <td>{log.newStatus || '-'}</td>
                <td>{log.changedBy || '-'}</td>
                <td>{log.notes || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
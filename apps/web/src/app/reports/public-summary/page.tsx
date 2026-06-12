import { Notice } from '@/components/ui/Notice';
import { ReportPageFrame } from '@/components/reports/ReportPageFrame';
import { getPublicDashboardPayload } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  const value = String(status).toUpperCase();

  if (['READY', 'LOCKED', 'SAFE', 'GENERATED'].includes(value)) {
    return 'status-pill locked';
  }

  if (['OPEN', 'PENDING', 'NOT_ENABLED_YET'].includes(value)) {
    return 'status-pill warning';
  }

  return 'status-pill';
}

/**
 * Public dashboard safe summary.
 * --------------------------------------------------------------------
 * This page only exposes safe non-confidential indicators that can be
 * published to a public or general SharePoint dashboard.
 */
export default async function PublicDashboardSummaryPage() {
  const payload = await getPublicDashboardPayload();

  const summary = payload?.publicSummary || {};
  const excludedFields = payload?.excludedFields || [];
  const securityRules = payload?.securityRules || [];
  const target = payload?.target || {};

  return (
    <ReportPageFrame
      eyebrow="Public Dashboard"
      title="Public Dashboard Safe Summary"
      description="Non-confidential payroll processing summary for the Southin Public Dashboard SharePoint site."
      actions={[
        { label: 'Reports Centre', href: '/reports' },
        { label: 'SharePoint Integration', href: '/admin/sharepoint-integration' },
        { label: 'Executive Dashboard', href: '/executive/dashboard', variant: 'primary' },
      ]}
    >
      <div className="report-kpi-grid">
        <div className="summary-card">
          <span className="summary-label">Payload Status</span>
          <strong>{payload?.status || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Target Site</span>
          <strong>{target?.siteName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Recommended Page</span>
          <strong>{target?.recommendedPageName || '-'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Generated</span>
          <strong>{formatDateTime(payload?.generatedAt)}</strong>
        </div>
      </div>

      <Notice>
        This public summary must not expose payroll values, employee names, employee numbers, NRC
        details, bank information, PAYE, NAPSA, NHIMA, or payslip details.
      </Notice>

      <section className="report-section">
        <h3>Safe Public Indicators</h3>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Indicator</th>
                <th>Safe Value</th>
                <th>Public Use</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>Total Employees</td>
                <td>{summary.totalEmployees ?? 0}</td>
                <td>Allowed</td>
              </tr>

              <tr>
                <td>Active Employees</td>
                <td>{summary.activeEmployees ?? 0}</td>
                <td>Allowed</td>
              </tr>

              <tr>
                <td>Payroll Processing Status</td>
                <td>
                  <span className={statusClass(summary.payrollProcessingStatus)}>
                    {summary.payrollProcessingStatus || '-'}
                  </span>
                </td>
                <td>Allowed</td>
              </tr>

              <tr>
                <td>Locked Payroll Runs</td>
                <td>{summary.lockedPayrollRuns ?? 0}</td>
                <td>Allowed</td>
              </tr>

              <tr>
                <td>Open Payroll Runs</td>
                <td>{summary.openPayrollRuns ?? 0}</td>
                <td>Allowed</td>
              </tr>

              <tr>
                <td>Last Updated</td>
                <td>{formatDateTime(summary.lastUpdated)}</td>
                <td>Allowed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div className="report-two-column">
        <section className="report-section">
          <h3>Blocked Confidential Fields</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Field</th>
                  <th>Reason</th>
                </tr>
              </thead>

              <tbody>
                {excludedFields.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No excluded fields returned.</td>
                  </tr>
                ) : (
                  excludedFields.map((field: string, index: number) => (
                    <tr key={field}>
                      <td>{index + 1}</td>
                      <td>
                        <code>{field}</code>
                      </td>
                      <td>Not allowed on public dashboard</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-section">
          <h3>Public Dashboard Security Rules</h3>

          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Rule</th>
                </tr>
              </thead>

              <tbody>
                {securityRules.length === 0 ? (
                  <tr>
                    <td colSpan={2}>No security rules returned.</td>
                  </tr>
                ) : (
                  securityRules.map((rule: string, index: number) => (
                    <tr key={rule}>
                      <td>{index + 1}</td>
                      <td>{rule}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <details>
        <summary>Raw Public Dashboard Payload</summary>
        <pre className="json-preview">{JSON.stringify(payload, null, 2)}</pre>
      </details>

      <Notice>
        This page is safe for public dashboard planning only. It must never include individual
        employee payroll data or monetary payroll values.
      </Notice>
    </ReportPageFrame>
  );
}
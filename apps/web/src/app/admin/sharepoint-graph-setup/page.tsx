import Link from 'next/link';
import { getSharePointSetupGuide } from '@/lib/api';
import { SharePointDiscoveryPreview } from './SharePointDiscoveryPreview';

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

function statusClass(status: string) {
  if (status === 'DONE' || status === 'READY_TO_TEST') return 'status-pill locked';
  if (status === 'DONE_OR_PARTIAL') return 'status-pill';
  return 'status-pill warning';
}

export default async function SharePointGraphSetupPage() {
  const guide = await getSharePointSetupGuide();

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>Microsoft Graph Setup Guide</h1>
          <p className="muted">
            Controlled setup checklist for connecting Southin PeoplePay to SharePoint through
            Microsoft Graph.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            SharePoint Integration Status
          </Link>

          <Link className="btn" href="/executive/dashboard">
            Executive Dashboard
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Current Mode</span>
          <strong>{guide.currentMode}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Graph Enabled</span>
          <strong>{guide.graphEnabled ? 'Yes' : 'No'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Ready for Graph Writes</span>
          <strong>{guide.readyForGraphWrites ? 'Yes' : 'No'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Generated</span>
          <strong>{formatDateTime(guide.generatedAt)}</strong>
        </div>
      </div>

      <div className="notice">
        {guide.message} Keep Graph disabled until Azure App Registration, permissions, site IDs, and
        library/list IDs are ready.
      </div>

      <SharePointDiscoveryPreview />

      <div className="table-wrap">
        <h3>Setup Phases</h3>

        <table>
          <thead>
            <tr>
              <th>Phase</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Environment Keys</th>
            </tr>
          </thead>

          <tbody>
            {guide.setupPhases.map((phase: any) => (
              <tr key={phase.phase}>
                <td>{phase.phase}</td>
                <td>
                  <strong>{phase.name}</strong>
                  {phase.warning && <div className="muted">{phase.warning}</div>}
                </td>
                <td>
                  <span className={statusClass(phase.status)}>{phase.status}</span>
                </td>
                <td>
                  <ol>
                    {phase.actions.map((action: string) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ol>
                </td>
                <td>
                  {(phase.envKeys || []).length === 0 ? (
                    '-'
                  ) : (
                    <ul>
                      {phase.envKeys.map((key: string) => (
                        <li key={key}>
                          <code>{key}</code>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Registered SharePoint Targets</h3>

        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Site</th>
              <th>Page / Library</th>
              <th>Operation</th>
              <th>Site ID</th>
              <th>Drive ID</th>
              <th>List ID</th>
            </tr>
          </thead>

          <tbody>
            {guide.targets.map((target: any) => (
              <tr key={target.key}>
                <td>
                  <code>{target.key}</code>
                </td>
                <td>{target.siteName}</td>
                <td>{target.pageName || target.libraryName || '-'}</td>
                <td>{target.allowedOperation}</td>
                <td>
                  <span
                    className={
                      target.configured?.siteId ? 'status-pill locked' : 'status-pill warning'
                    }
                  >
                    {target.configured?.siteId ? 'Configured' : 'Missing'}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      target.configured?.driveId === null || target.configured?.driveId
                        ? 'status-pill locked'
                        : 'status-pill warning'
                    }
                  >
                    {target.configured?.driveId === null
                      ? 'N/A'
                      : target.configured?.driveId
                        ? 'Configured'
                        : 'Missing'}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      target.configured?.listId === null || target.configured?.listId
                        ? 'status-pill locked'
                        : 'status-pill warning'
                    }
                  >
                    {target.configured?.listId === null
                      ? 'N/A'
                      : target.configured?.listId
                        ? 'Configured'
                        : 'Missing'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Missing Configuration</h3>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Missing Environment Key</th>
            </tr>
          </thead>

          <tbody>
            {guide.missingConfig.length === 0 ? (
              <tr>
                <td colSpan={2}>No missing configuration keys.</td>
              </tr>
            ) : (
              guide.missingConfig.map((key: string, index: number) => (
                <tr key={key}>
                  <td>{index + 1}</td>
                  <td>
                    <code>{key}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>.env Template</h3>

        <pre className="json-preview">
          {Object.entries(guide.envTemplate)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n')}
        </pre>
      </div>

      <div className="table-wrap">
        <h3>Safety Rules</h3>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Rule</th>
            </tr>
          </thead>

          <tbody>
            {guide.safetyRules.map((rule: string, index: number) => (
              <tr key={rule}>
                <td>{index + 1}</td>
                <td>{rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="notice">
        This page is for controlled configuration only. Actual publishing remains blocked until the
        backend confirms that Graph is enabled and all target IDs are present.
      </div>
    </section>
  );
}
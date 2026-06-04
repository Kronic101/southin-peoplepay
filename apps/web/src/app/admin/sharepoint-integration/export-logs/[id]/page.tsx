import Link from 'next/link';
import { getSharePointExportLog } from '@/lib/api';

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

function JsonPreview({ title, data }: { title: string; data: unknown }) {
  return (
    <div className="table-wrap">
      <h3>{title}</h3>
      <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default async function SharePointExportLogDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const result = await getSharePointExportLog(params.id);
  const log = result.log;

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>SharePoint Export Log</h1>
          <p className="muted">
            Detailed audit record for a controlled SharePoint export or future Microsoft Graph
            publishing attempt.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/admin/sharepoint-integration">
            Back to Integration Status
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Status</span>
          <strong>{log.graphStatus}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Graph Enabled</span>
          <strong>{log.graphEnabled ? 'Yes' : 'No'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Target Site</span>
          <strong>{log.targetSite}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Requested By</span>
          <strong>{log.requestedBy || '-'}</strong>
        </div>
      </div>

      <div className="table-wrap">
        <h3>Export Control Details</h3>

        <table>
          <tbody>
            <tr>
              <th>Log ID</th>
              <td>
                <code>{log.id}</code>
              </td>
            </tr>

            <tr>
              <th>Target Site</th>
              <td>{log.targetSite}</td>
            </tr>

            <tr>
              <th>Target Page</th>
              <td>{log.targetPage || '-'}</td>
            </tr>

            <tr>
              <th>Target Library</th>
              <td>{log.targetLibrary || '-'}</td>
            </tr>

            <tr>
              <th>Payload Endpoint</th>
              <td>
                <code>{log.payloadEndpoint}</code>
              </td>
            </tr>

            <tr>
              <th>Payload Type</th>
              <td>{log.payloadType || '-'}</td>
            </tr>

            <tr>
              <th>Confidentiality</th>
              <td>{log.confidentiality || '-'}</td>
            </tr>

            <tr>
              <th>Graph Status</th>
              <td>{log.graphStatus}</td>
            </tr>

            <tr>
              <th>Error Message</th>
              <td>{log.errorMessage || '-'}</td>
            </tr>

            <tr>
              <th>Created</th>
              <td>{formatDateTime(log.createdAt)}</td>
            </tr>

            <tr>
              <th>Updated</th>
              <td>{formatDateTime(log.updatedAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <JsonPreview title="Request Payload" data={log.requestPayload} />
      <JsonPreview title="Response Payload" data={log.responsePayload} />

      <div className="notice">
        This log proves that the export request was captured. In the current safe mode, no Microsoft
        Graph write operation is performed.
      </div>
    </section>
  );
}
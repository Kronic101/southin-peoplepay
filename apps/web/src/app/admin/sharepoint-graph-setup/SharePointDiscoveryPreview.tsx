'use client';

import { useState } from 'react';
import { getSharePointDiscoveryPreview } from '@/lib/api';

const targetOptions = [
  {
    label: 'Executive Dashboard',
    targetKey: 'EXECUTIVE_DASHBOARD',
    targetSite: 'Executive Leadership',
    sitePath: '/sites/ExecutiveLeadership',
    payloadEndpoint: '/api/executive/sharepoint/executive-page-payload',
  },
  {
    label: 'Finance Audit Reports',
    targetKey: 'FINANCE_AUDIT_REPORTS',
    targetSite: 'Finance',
    sitePath: '/sites/Finance',
    payloadEndpoint: '/api/executive/sharepoint/finance-audit-payload',
  },
  {
    label: 'HR Payroll Readiness',
    targetKey: 'HR_PAYROLL_READINESS',
    targetSite: 'Human Resource',
    sitePath: '/sites/HumanResource',
    payloadEndpoint: '/api/employees/payroll-readiness',
  },
  {
    label: 'Public Dashboard',
    targetKey: 'PUBLIC_DASHBOARD',
    targetSite: 'Southin Public Dashboard',
    sitePath: '/sites/SouthinPublicDashboard',
    payloadEndpoint: '/api/executive/sharepoint/public-dashboard-payload',
  },
];

export function SharePointDiscoveryPreview() {
  const [selectedKey, setSelectedKey] = useState('EXECUTIVE_DASHBOARD');
  const [siteId, setSiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<any>(null);

  async function handlePreview() {
    const target = targetOptions.find((item) => item.targetKey === selectedKey);

    if (!target) {
      setMessage('Please select a valid SharePoint target.');
      return;
    }

    setLoading(true);
    setMessage('');
    setResult(null);

    try {
      const preview = await getSharePointDiscoveryPreview({
        tenantHost: 'southingcontracting.sharepoint.com',
        targetKey: target.targetKey,
        targetSite: target.targetSite,
        sitePath: target.sitePath,
        siteId: siteId.trim() || undefined,
        payloadEndpoint: target.payloadEndpoint,
      });

      setResult(preview);
      setMessage('Discovery preview generated successfully. No Microsoft Graph request was made.');
    } catch {
      setMessage('Failed to generate discovery preview. Check that the API is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="table-wrap">
      <div className="page-header">
        <div>
          <h3>SharePoint Discovery Preview</h3>
          <p className="muted">
            Generate the Microsoft Graph URL structure needed later to resolve SharePoint Site IDs,
            Site Pages List IDs, and Finance document library Drive IDs.
          </p>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Target
          <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
            {targetOptions.map((target) => (
              <option key={target.targetKey} value={target.targetKey}>
                {target.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Known Site ID
          <input
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            placeholder="Optional: paste resolved SharePoint site ID here"
          />
        </label>
      </div>

      <div className="action-row">
        <button className="btn" type="button" onClick={handlePreview} disabled={loading}>
          {loading ? 'Generating Preview...' : 'Generate Discovery Preview'}
        </button>
      </div>

      {message && <div className="notice">{message}</div>}

      {result && (
        <div className="table-wrap">
          <h3>Discovery Preview Result</h3>

          <div className="summary-grid">
            <div className="summary-card">
              <span className="summary-label">Mode</span>
              <strong>{result.mode}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Graph Request Performed</span>
              <strong>{result.graphRequestPerformed ? 'Yes' : 'No'}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Target Valid</span>
              <strong>{result.targetValidation?.valid ? 'Yes' : 'No'}</strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">Target Ready</span>
              <strong>{result.targetValidation?.targetReady ? 'Yes' : 'No'}</strong>
            </div>
          </div>

          <table>
            <tbody>
              <tr>
                <th>Resolve Site ID URL</th>
                <td>
                  <code>{result.previewUrls?.resolveSiteId || '-'}</code>
                </td>
              </tr>

              <tr>
                <th>List Drives URL</th>
                <td>
                  <code>{result.previewUrls?.listDrives || '-'}</code>
                </td>
              </tr>

              <tr>
                <th>List Lists URL</th>
                <td>
                  <code>{result.previewUrls?.listLists || '-'}</code>
                </td>
              </tr>

              <tr>
                <th>Missing Target Config</th>
                <td>
                  {(result.targetValidation?.missingTargetConfig || []).length === 0
                    ? 'None'
                    : result.targetValidation.missingTargetConfig.join(', ')}
                </td>
              </tr>
            </tbody>
          </table>

          <details>
            <summary>Raw Discovery JSON</summary>
            <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { logSharePointExportRequest } from '@/lib/api';

export function SharePointExportTester() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function testExportLog(targetSite: string, targetPage: string, payloadEndpoint: string) {
    setMessage('');
    setLoading(true);

    try {
      const result = await logSharePointExportRequest({
        targetSite,
        targetPage,
        payloadEndpoint,
        requestedBy: 'dev-admin',
        notes: 'Testing SharePoint export logging before Microsoft Graph integration.',
      });

      setMessage(result.message || 'Development export log created.');
    } catch {
      setMessage('Failed to create development export log. Check the API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="table-wrap">
      <div className="page-header">
        <div>
          <h3>Development Export Test</h3>
          <p className="muted">
            These buttons only call the development log endpoint. They do not write to SharePoint yet.
          </p>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="action-row">
        <button
          className="btn"
          disabled={loading}
          onClick={() =>
            testExportLog(
              'Executive Leadership',
              'PeoplePay Executive Dashboard',
              '/api/executive/sharepoint/executive-page-payload',
            )
          }
        >
          {loading ? 'Testing...' : 'Test Executive Export Log'}
        </button>

        <button
          className="btn-secondary"
          disabled={loading}
          onClick={() =>
            testExportLog(
              'Finance',
              'Payroll Audit Reports',
              '/api/executive/sharepoint/finance-audit-payload',
            )
          }
        >
          Test Finance Export Log
        </button>

        <button
          className="btn-secondary"
          disabled={loading}
          onClick={() =>
            testExportLog(
              'Southin Public Dashboard',
              'PeoplePay Public Summary',
              '/api/executive/sharepoint/public-dashboard-payload',
            )
          }
        >
          Test Public Dashboard Export Log
        </button>
      </div>
    </div>
  );
}
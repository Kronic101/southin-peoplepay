'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishToSharePoint } from '@/lib/api';

type PublishTarget = {
  label: string;
  targetKey: string;
  targetSite: string;
  targetPage?: string;
  targetLibrary?: string;
  payloadEndpoint: string;
  payloadType: string;
  confidentiality: string;
};

const targets: PublishTarget[] = [
  {
    label: 'Publish Executive Dashboard Payload',
    targetKey: 'EXECUTIVE_DASHBOARD',
    targetSite: 'Executive Leadership',
    targetPage: 'PeoplePay Executive Dashboard',
    payloadEndpoint: '/api/executive/sharepoint/executive-page-payload',
    payloadType: 'EXECUTIVE_LEADERSHIP_PAGE',
    confidentiality: 'CONFIDENTIAL_EXECUTIVE',
  },
  {
    label: 'Publish Finance Audit Payload',
    targetKey: 'FINANCE_AUDIT_REPORTS',
    targetSite: 'Finance',
    targetLibrary: 'Payroll Audit Reports',
    payloadEndpoint: '/api/executive/sharepoint/finance-audit-payload',
    payloadType: 'FINANCE_PAYROLL_AUDIT_PACKAGE',
    confidentiality: 'CONFIDENTIAL_FINANCE',
  },
  {
    label: 'Publish Public Dashboard Payload',
    targetKey: 'PUBLIC_DASHBOARD',
    targetSite: 'Southin Public Dashboard',
    targetPage: 'PeoplePay Public Summary',
    payloadEndpoint: '/api/executive/sharepoint/public-dashboard-payload',
    payloadType: 'PUBLIC_DASHBOARD_SUMMARY',
    confidentiality: 'PUBLIC_SUMMARY_ONLY',
  },
];

export function SharePointExportTester() {
  const router = useRouter();
  const [loadingTarget, setLoadingTarget] = useState('');
  const [message, setMessage] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);

  async function handlePublish(target: PublishTarget) {
    setMessage('');
    setLastResult(null);
    setLoadingTarget(target.label);

    try {
      const result = await publishToSharePoint({
        targetKey: target.targetKey,
        targetSite: target.targetSite,
        targetPage: target.targetPage,
        targetLibrary: target.targetLibrary,
        payloadEndpoint: target.payloadEndpoint,
        payloadType: target.payloadType,
        confidentiality: target.confidentiality,
        requestedBy: 'dev-admin',
        notes:
          'Controlled SharePoint publish test. In dev mode this logs only and does not write to SharePoint.',
      });

      setLastResult(result);
      setMessage(
        `Export logged successfully. Status: ${result.graphAutomationStatus}. Log ID: ${result.exportLogId}`,
      );

      router.refresh();
    } catch {
      setMessage('Failed to log SharePoint export request. Check API and database connection.');
    } finally {
      setLoadingTarget('');
    }
  }

  return (
    <div className="table-wrap">
      <h3>SharePoint Publish Test</h3>

      <p className="muted">
        These buttons log export attempts now. They will publish through Microsoft Graph later after
        Azure App Registration is ready.
      </p>

      <div className="action-row">
        {targets.map((target) => (
          <button
            key={target.targetKey}
            className={target.confidentiality === 'PUBLIC_SUMMARY_ONLY' ? 'btn-secondary' : 'btn'}
            type="button"
            disabled={loadingTarget === target.label}
            onClick={() => handlePublish(target)}
          >
            {loadingTarget === target.label ? 'Logging...' : target.label}
          </button>
        ))}
      </div>

      {message && <div className="notice">{message}</div>}

      {lastResult && (
        <details>
          <summary>Last export log response</summary>
          <pre className="json-preview">{JSON.stringify(lastResult, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
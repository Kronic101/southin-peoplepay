import Link from 'next/link';
import {
  getSharePointExportPackage,
  getSharePointExportLogs,
  getSharePointGraphStatus,
  getSharePointTargets,
} from '@/lib/api';
import { SharePointExportTester } from './sharepoint-export-tester';

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

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function JsonPreview({ data }: { data: unknown }) {
  return <pre className="json-preview">{JSON.stringify(data, null, 2)}</pre>;
}

function getPayloadStatus(payload: any) {
  if (!payload) return 'MISSING';
  return String(payload.status || 'READY').toUpperCase();
}

function isReady(payload: any) {
  return getPayloadStatus(payload) === 'READY';
}

function getExecutiveSection(executivePayload: any, sectionKey: string) {
  return executivePayload?.pageSections?.find((section: any) => section.sectionKey === sectionKey);
}

async function safeLoadExportPackage() {
  try {
    const data = await getSharePointExportPackage();

    return {
      ok: true,
      data,
      error: null,
    };
  } catch (error: any) {
    return {
      ok: false,
      data: null,
      error: error?.message || 'Failed to load SharePoint export package',
    };
  }
}

async function safeLoadGraphStatus() {
  try {
    return await getSharePointGraphStatus();
  } catch {
    return null;
  }
}

async function safeLoadTargets() {
  try {
    return await getSharePointTargets();
  } catch {
    return { targets: [] };
  }
}

async function safeLoadExportLogs() {
  try {
    return await getSharePointExportLogs();
  } catch {
    return { logs: [] };
  }
}

export default async function SharePointIntegrationStatusPage() {
  const exportPackageResult = await safeLoadExportPackage();
  const exportPackage = exportPackageResult.data;

  const [graphStatus, sharePointTargets, exportLogs] = await Promise.all([
    safeLoadGraphStatus(),
    safeLoadTargets(),
    safeLoadExportLogs(),
  ]);

  const executivePayload = exportPackage?.payloads?.executiveLeadership || null;
  const financePayload = exportPackage?.payloads?.financeAudit || null;
  const publicPayload = exportPackage?.payloads?.publicDashboard || null;

  const kpiSection = getExecutiveSection(executivePayload, 'kpi_summary');
  const latestPayrollSection = getExecutiveSection(executivePayload, 'latest_locked_payroll');
  const financialSection = getExecutiveSection(executivePayload, 'latest_financial_summary');
  const recentRunsSection = getExecutiveSection(executivePayload, 'recent_payroll_runs');
  const complianceSection = getExecutiveSection(executivePayload, 'compliance_notes');

  const kpis = kpiSection?.data || {};
  const latestPayroll = latestPayrollSection?.data || null;
  const financials = financialSection?.data || {};
  const recentRuns = recentRunsSection?.data || [];
  const complianceNotes = complianceSection?.data || [];
  const financeAudit = financePayload?.auditPackage || null;
  const publicSummary = publicPayload?.publicSummary || {};

  const controlledPayloads = [exportPackage, executivePayload, financePayload, publicPayload];
  const readyPayloads = controlledPayloads.filter((payload) => isReady(payload)).length;

  const endpoints = [
    {
      name: 'Full SharePoint Export Package',
      site: 'All configured SharePoint sites',
      purpose: 'Combined package for Executive, Finance, HR, and Public Dashboard feeds',
      endpoint: '/api/executive/sharepoint/export-package',
      status: exportPackageResult.ok ? getPayloadStatus(exportPackage) : 'ERROR',
      confidentiality: 'Mixed Controlled Payload',
      error: exportPackageResult.error,
    },
    {
      name: 'Executive Leadership Page Payload',
      site: 'Executive Leadership',
      purpose: 'Confidential executive payroll dashboard summary',
      endpoint: '/api/executive/sharepoint/executive-page-payload',
      status: getPayloadStatus(executivePayload),
      confidentiality: 'Confidential Executive',
      error: executivePayload?.error?.message || null,
    },
    {
      name: 'Finance Payroll Audit Payload',
      site: 'Finance',
      purpose: 'Payroll audit package, CSV source, approval evidence, and finance controls',
      endpoint: '/api/executive/sharepoint/finance-audit-payload',
      status: getPayloadStatus(financePayload),
      confidentiality: 'Confidential Finance',
      error: financePayload?.error?.message || null,
    },
    {
      name: 'Public Dashboard Payload',
      site: 'Southin Public Dashboard',
      purpose: 'Non-confidential payroll processing status and employee count only',
      endpoint: '/api/executive/sharepoint/public-dashboard-payload',
      status: getPayloadStatus(publicPayload),
      confidentiality: 'Public Summary Only',
      error: publicPayload?.error?.message || null,
    },
    {
      name: 'HR Payroll Readiness Feed',
      site: 'Human Resource',
      purpose: 'Employee master validation and payroll readiness',
      endpoint: '/api/employees/payroll-readiness',
      status: 'READY',
      confidentiality: 'HR Restricted',
      error: null,
    },
    {
      name: 'Payroll Audit CSV Export',
      site: 'Finance',
      purpose: 'Monthly audit CSV export for Finance document library',
      endpoint: '/api/executive/payroll-audit.csv',
      status: 'READY',
      confidentiality: 'Confidential Finance',
      error: null,
    },
  ];

  const graphChecklist =
    exportPackage?.nextGraphReadinessChecklist || [
      'Create Azure App Registration.',
      'Grant Microsoft Graph Application permissions.',
      'Approve admin consent.',
      'Store tenant ID, client ID, and client secret in .env.',
      'Resolve SharePoint site IDs.',
      'Resolve document library drive IDs.',
      'Create Graph upload service.',
      'Add audit logs for every SharePoint export.',
    ];

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h1>SharePoint Integration Status</h1>
          <p className="muted">
            Controlled PeoplePay export payloads for Executive Leadership, Finance, Human Resource,
            and Southin Public Dashboard. Microsoft Graph publishing will be enabled after Azure App
            Registration.
          </p>
        </div>

        <div className="action-row">
          <Link className="btn-secondary" href="/executive/dashboard">
            Executive Dashboard
          </Link>

          <Link className="btn-secondary" href="/admin/sharepoint-graph-setup">
            Graph Setup Guide
          </Link>

          <Link className="btn" href="/reports/payroll-audit">
            Payroll Audit Report
          </Link>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Graph Automation</span>
          <strong>{exportPackage?.graphAutomationStatus || 'NOT_ENABLED_YET'}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Payload Endpoints</span>
          <strong>{endpoints.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Working Payloads</span>
          <strong>
            {readyPayloads} / {controlledPayloads.length}
          </strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Last Generated</span>
          <strong>{formatDateTime(exportPackage?.generatedAt)}</strong>
        </div>
      </div>

      {!exportPackageResult.ok ? (
        <div className="notice">
          Failed to load the main SharePoint export package. Error:{' '}
          <code>{exportPackageResult.error}</code>
        </div>
      ) : (
        <div className="notice">
          Current mode: <strong>Controlled JSON Payloads Only</strong>. No Microsoft Graph write
          operation is performed yet. This is the safe stage before giving the API production
          SharePoint permissions.
        </div>
      )}

      <div className="table-wrap">
        <h3>Executive Leadership Payload Summary</h3>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Employees</span>
            <strong>{kpis.totalEmployees ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Draft Employees</span>
            <strong>{kpis.draftEmployees ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Payslips Generated</span>
            <strong>{kpis.totalPayslips ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Locked Payroll Runs</span>
            <strong>{kpis.lockedPayrollRuns ?? '-'}</strong>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Latest Gross Pay</span>
            <strong>{financials.grossPay || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Latest Deductions</span>
            <strong>{financials.deductions || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Latest Net Pay</span>
            <strong>{financials.netPay || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Latest Employer Cost</span>
            <strong>{financials.employerCost || '-'}</strong>
          </div>
        </div>

        {latestPayroll?.runName && (
          <div className="notice">
            Latest locked payroll: <strong>{latestPayroll.runName}</strong> ·{' '}
            {latestPayroll.periodName} · Status: <strong>{latestPayroll.status}</strong> · Locked:{' '}
            {formatDateTime(latestPayroll.lockedAt)}
          </div>
        )}
      </div>

      <div className="table-wrap">
        <h3>Recent Payroll Runs for Executive Page</h3>

        <table>
          <thead>
            <tr>
              <th>Run Name</th>
              <th>Period</th>
              <th>Type</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net</th>
              <th>Employer Cost</th>
              <th>Approvals</th>
            </tr>
          </thead>

          <tbody>
            {recentRuns.length === 0 ? (
              <tr>
                <td colSpan={10}>No recent payroll runs in the executive payload.</td>
              </tr>
            ) : (
              recentRuns.map((run: any) => (
                <tr key={run.id}>
                  <td>{run.runName}</td>
                  <td>{run.periodName}</td>
                  <td>{run.runType}</td>
                  <td>
                    <span className={run.status === 'LOCKED' ? 'status-pill locked' : 'status-pill'}>
                      {run.status}
                    </span>
                  </td>
                  <td>{run.employeeCount}</td>
                  <td>{run.grossPay}</td>
                  <td>{run.deductions}</td>
                  <td>{run.netPay}</td>
                  <td>{run.employerCost}</td>
                  <td>{run.approvalCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Finance Payroll Audit Package</h3>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Audit Run</span>
            <strong>{financeAudit?.run?.runName || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Run Status</span>
            <strong>{financeAudit?.run?.status || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Audit Employees</span>
            <strong>{financeAudit?.totals?.employeeCount ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Audit Net Pay</span>
            <strong>{money(financeAudit?.totals?.netPay)}</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Recommended File</th>
              <th>Document Type</th>
              <th>Source Endpoint</th>
            </tr>
          </thead>

          <tbody>
            {(financePayload?.recommendedFiles || []).length === 0 ? (
              <tr>
                <td colSpan={3}>No recommended files yet.</td>
              </tr>
            ) : (
              financePayload.recommendedFiles.map((file: any) => (
                <tr key={file.fileName}>
                  <td>{file.fileName}</td>
                  <td>{file.documentType}</td>
                  <td>
                    <code>{file.sourceEndpoint}</code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Southin Public Dashboard Payload</h3>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Employees</span>
            <strong>{publicSummary.totalEmployees ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Active Employees</span>
            <strong>{publicSummary.activeEmployees ?? '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Payroll Processing Status</span>
            <strong>{publicSummary.payrollProcessingStatus || '-'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Last Updated</span>
            <strong>{formatDateTime(publicSummary.lastUpdated)}</strong>
          </div>
        </div>

        <div className="notice">
          Public dashboard payload excludes salary values, employee names, employee numbers, NRC,
          bank details, statutory values, and payslip details.
        </div>
      </div>

      <div className="table-wrap">
        <h3>SharePoint Graph Configuration Status</h3>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Graph Enabled</span>
            <strong>{graphStatus?.graphEnabled ? 'Yes' : 'No'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Mode</span>
            <strong>{graphStatus?.mode || 'DISABLED_DEV_MODE'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Ready for Graph Writes</span>
            <strong>{graphStatus?.readyForGraphWrites ? 'Yes' : 'No'}</strong>
          </div>

          <div className="summary-card">
            <span className="summary-label">Missing Config Items</span>
            <strong>{graphStatus?.missingConfig?.length || 0}</strong>
          </div>
        </div>

        <div className="notice">
          {graphStatus?.message ||
            'Microsoft Graph publishing is disabled. Export requests will be logged only.'}
        </div>
      </div>

      <div className="table-wrap">
        <h3>Registered SharePoint Targets</h3>

        <table>
          <thead>
            <tr>
              <th>Target Key</th>
              <th>Site</th>
              <th>Page / Library</th>
              <th>Payload Endpoint</th>
              <th>Operation</th>
              <th>Site ID</th>
              <th>Drive ID</th>
              <th>List ID</th>
              <th>Ready</th>
            </tr>
          </thead>

          <tbody>
            {(sharePointTargets?.targets || []).length === 0 ? (
              <tr>
                <td colSpan={9}>No SharePoint targets registered.</td>
              </tr>
            ) : (
              sharePointTargets.targets.map((target: any) => {
                const siteReady = Boolean(target.configured?.siteId);
                const driveReady =
                  target.configured?.driveId === null ? true : Boolean(target.configured?.driveId);
                const listReady =
                  target.configured?.listId === null ? true : Boolean(target.configured?.listId);
                const targetReady = siteReady && driveReady && listReady;

                return (
                  <tr key={target.key}>
                    <td>
                      <code>{target.key}</code>
                    </td>
                    <td>{target.siteName}</td>
                    <td>{target.pageName || target.libraryName || '-'}</td>
                    <td>
                      <code>{target.payloadEndpoint}</code>
                    </td>
                    <td>{target.allowedOperation}</td>
                    <td>
                      <span className={siteReady ? 'status-pill locked' : 'status-pill warning'}>
                        {siteReady ? 'Configured' : 'Missing'}
                      </span>
                    </td>
                    <td>
                      <span className={driveReady ? 'status-pill locked' : 'status-pill warning'}>
                        {target.configured?.driveId === null
                          ? 'N/A'
                          : driveReady
                            ? 'Configured'
                            : 'Missing'}
                      </span>
                    </td>
                    <td>
                      <span className={listReady ? 'status-pill locked' : 'status-pill warning'}>
                        {target.configured?.listId === null
                          ? 'N/A'
                          : listReady
                            ? 'Configured'
                            : 'Missing'}
                      </span>
                    </td>
                    <td>
                      <span className={targetReady ? 'status-pill locked' : 'status-pill warning'}>
                        {targetReady ? 'Ready' : 'Pending IDs'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <SharePointExportTester />

      <div className="table-wrap">
        <h3>Recent SharePoint Export Logs</h3>

        <table>
          <thead>
            <tr>
              <th>Created</th>
              <th>Target Site</th>
              <th>Target Page / Library</th>
              <th>Payload</th>
              <th>Status</th>
              <th>Requested By</th>
            </tr>
          </thead>

          <tbody>
            {(exportLogs?.logs || []).length === 0 ? (
              <tr>
                <td colSpan={6}>No SharePoint export logs yet.</td>
              </tr>
            ) : (
              exportLogs.logs.map((log: any) => (
                <tr key={log.id}>
                  <td>
                    <Link href={`/admin/sharepoint-integration/export-logs/${log.id}`}>
                      {formatDateTime(log.createdAt)}
                    </Link>
                  </td>
                  <td>{log.targetSite}</td>
                  <td>{log.targetPage || log.targetLibrary || '-'}</td>
                  <td>
                    <code>{log.payloadEndpoint}</code>
                  </td>
                  <td>
                    <span
                      className={
                        log.graphStatus === 'SUCCESS'
                          ? 'status-pill locked'
                          : log.graphStatus === 'FAILED'
                            ? 'status-pill warning'
                            : 'status-pill'
                      }
                    >
                      {log.graphStatus}
                    </span>
                  </td>
                  <td>{log.requestedBy || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>SharePoint Export Endpoints</h3>

        <table>
          <thead>
            <tr>
              <th>Feed</th>
              <th>Target Site</th>
              <th>Purpose</th>
              <th>Endpoint</th>
              <th>Confidentiality</th>
              <th>Status</th>
              <th>Open</th>
            </tr>
          </thead>

          <tbody>
            {endpoints.map((item) => {
              const ready = item.status === 'READY';

              return (
                <tr key={item.endpoint}>
                  <td>{item.name}</td>
                  <td>{item.site}</td>
                  <td>
                    {item.purpose}
                    {item.error && (
                      <div className="muted">
                        Error: <code>{item.error}</code>
                      </div>
                    )}
                  </td>
                  <td>
                    <code>{item.endpoint}</code>
                  </td>
                  <td>{item.confidentiality}</td>
                  <td>
                    <span className={ready ? 'status-pill locked' : 'status-pill warning'}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <a
                      className="link-button"
                      href={`http://localhost:4000${item.endpoint}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open JSON
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Target SharePoint Structure</h3>

        <table>
          <thead>
            <tr>
              <th>SharePoint Site</th>
              <th>PeoplePay Use</th>
              <th>Allowed Data</th>
              <th>Restricted Data</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Executive Leadership</td>
              <td>PeoplePay Executive Dashboard page</td>
              <td>KPI totals, latest locked payroll totals, approval status, compliance notes</td>
              <td>Raw payslip details, bank details, NRC details</td>
            </tr>

            <tr>
              <td>Finance</td>
              <td>Payroll Audit Reports document library</td>
              <td>CSV audits, locked payroll evidence, statutory review evidence, payment evidence</td>
              <td>Unapproved draft payroll reports outside Finance</td>
            </tr>

            <tr>
              <td>Human Resource</td>
              <td>Employee readiness and master data validation</td>
              <td>Readiness status, missing HR fields, employment profile checks</td>
              <td>Payroll values unless HR is explicitly authorised</td>
            </tr>

            <tr>
              <td>Southin Public Dashboard</td>
              <td>Public-safe payroll processing summary</td>
              <td>Employee count and payroll processing status only</td>
              <td>Salary, deductions, net pay, payslips, NRC, bank, PAYE, NAPSA, NHIMA</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <h3>Microsoft Graph Readiness Checklist</h3>

        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Requirement</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {graphChecklist.map((item: string, index: number) => (
              <tr key={item}>
                <td>{index + 1}</td>
                <td>{item}</td>
                <td>
                  <span className="status-pill warning">Pending</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details>
        <summary>Developer Payload Preview</summary>

        <h4>Full Export Package JSON</h4>
        <JsonPreview data={exportPackage} />

        <h4>Executive Leadership Payload JSON</h4>
        <JsonPreview data={executivePayload} />

        <h4>Finance Audit Payload JSON</h4>
        <JsonPreview data={financePayload} />

        <h4>Public Dashboard Payload JSON</h4>
        <JsonPreview data={publicPayload} />
      </details>

      <div className="notice">
        This page uses the controlled export package, target registry, Graph readiness status, and
        SharePoint export log table. Actual Microsoft Graph publishing must remain disabled until the
        Azure App Registration and SharePoint target IDs are configured.
      </div>
    </section>
  );
}
export type SharePointTargetKey =
  | 'EXECUTIVE_DASHBOARD'
  | 'FINANCE_AUDIT_REPORTS'
  | 'HR_PAYROLL_READINESS'
  | 'PUBLIC_DASHBOARD';

export type SharePointTargetConfig = {
  key: SharePointTargetKey;
  siteName: string;
  siteIdEnv: string;
  driveIdEnv?: string;
  listIdEnv?: string;
  pageName?: string;
  libraryName?: string;
  payloadEndpoint: string;
  payloadType: string;
  confidentiality: string;
  allowedOperation: 'PAGE_PAYLOAD' | 'DOCUMENT_LIBRARY_EXPORT' | 'READINESS_FEED' | 'PUBLIC_SUMMARY';
};

export const SHAREPOINT_TARGETS: SharePointTargetConfig[] = [
  {
    key: 'EXECUTIVE_DASHBOARD',
    siteName: 'Executive Leadership',
    siteIdEnv: 'SHAREPOINT_EXECUTIVE_SITE_ID',
    listIdEnv: 'SHAREPOINT_EXECUTIVE_PAGE_LIST_ID',
    pageName: 'PeoplePay Executive Dashboard',
    payloadEndpoint: '/api/executive/sharepoint/executive-page-payload',
    payloadType: 'EXECUTIVE_LEADERSHIP_PAGE',
    confidentiality: 'CONFIDENTIAL_EXECUTIVE',
    allowedOperation: 'PAGE_PAYLOAD',
  },
  {
    key: 'FINANCE_AUDIT_REPORTS',
    siteName: 'Finance',
    siteIdEnv: 'SHAREPOINT_FINANCE_SITE_ID',
    driveIdEnv: 'SHAREPOINT_FINANCE_AUDIT_DRIVE_ID',
    libraryName: 'Payroll Audit Reports',
    payloadEndpoint: '/api/executive/sharepoint/finance-audit-payload',
    payloadType: 'FINANCE_PAYROLL_AUDIT_PACKAGE',
    confidentiality: 'CONFIDENTIAL_FINANCE',
    allowedOperation: 'DOCUMENT_LIBRARY_EXPORT',
  },
  {
    key: 'HR_PAYROLL_READINESS',
    siteName: 'Human Resource',
    siteIdEnv: 'SHAREPOINT_HR_SITE_ID',
    payloadEndpoint: '/api/employees/payroll-readiness',
    payloadType: 'HR_PAYROLL_READINESS_FEED',
    confidentiality: 'HR_RESTRICTED',
    allowedOperation: 'READINESS_FEED',
  },
  {
    key: 'PUBLIC_DASHBOARD',
    siteName: 'Southin Public Dashboard',
    siteIdEnv: 'SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID',
    listIdEnv: 'SHAREPOINT_PUBLIC_PAGE_LIST_ID',
    pageName: 'PeoplePay Public Summary',
    payloadEndpoint: '/api/executive/sharepoint/public-dashboard-payload',
    payloadType: 'PUBLIC_DASHBOARD_SUMMARY',
    confidentiality: 'PUBLIC_SUMMARY_ONLY',
    allowedOperation: 'PUBLIC_SUMMARY',
  },
];

export function getRequiredGraphConfig() {
  return {
    SHAREPOINT_GRAPH_ENABLED: process.env.SHAREPOINT_GRAPH_ENABLED || 'false',
    AZURE_TENANT_ID: Boolean(process.env.AZURE_TENANT_ID),
    AZURE_CLIENT_ID: Boolean(process.env.AZURE_CLIENT_ID),
    AZURE_CLIENT_SECRET: Boolean(process.env.AZURE_CLIENT_SECRET),
    SHAREPOINT_EXECUTIVE_SITE_ID: Boolean(process.env.SHAREPOINT_EXECUTIVE_SITE_ID),
    SHAREPOINT_FINANCE_SITE_ID: Boolean(process.env.SHAREPOINT_FINANCE_SITE_ID),
    SHAREPOINT_HR_SITE_ID: Boolean(process.env.SHAREPOINT_HR_SITE_ID),
    SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID: Boolean(process.env.SHAREPOINT_PUBLIC_DASHBOARD_SITE_ID),
    SHAREPOINT_FINANCE_AUDIT_DRIVE_ID: Boolean(process.env.SHAREPOINT_FINANCE_AUDIT_DRIVE_ID),
    SHAREPOINT_EXECUTIVE_PAGE_LIST_ID: Boolean(process.env.SHAREPOINT_EXECUTIVE_PAGE_LIST_ID),
    SHAREPOINT_PUBLIC_PAGE_LIST_ID: Boolean(process.env.SHAREPOINT_PUBLIC_PAGE_LIST_ID),
  };
}

export function getMissingGraphConfig() {
  const required = getRequiredGraphConfig();

  return Object.entries(required)
    .filter(([key, value]) => key !== 'SHAREPOINT_GRAPH_ENABLED' && value === false)
    .map(([key]) => key);
}